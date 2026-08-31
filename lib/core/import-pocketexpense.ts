// Parses Pocket Expense's CSV export into MoneyMotion transactions. Pure
// (no Prisma) so the browser can parse the file client-side before anything
// is sent to a server action; app/settings/import/page.tsx renders the
// result for review and edit before commitImport() writes it.
//
// Pocket Expense's export has quirks this file works around:
//   - a few report-header lines before the real "Date&Time" header row
//   - a transfer is one row with Account = "Source->Dest", not two rows
//   - there's no reimbursement concept — Marc logs a payback as a normal
//     expense row with a positive amount instead of negative, which happens
//     to be exactly MoneyMotion's own reimbursement model (see categories.ts)
//   - a few category names exist on both the expense and income side of his
//     old tracker (e.g. "Gambling" as a loss vs. as winnings) with no way to
//     tell them apart from the name alone — those are flagged for review
//     rather than guessed
import { CATEGORY_INFO, type CategoryKey } from "./categories";
import { parseDollarsToCents } from "./money";

export type ImportTransactionType = "EXPENSE" | "INCOME" | "TRANSFER";

export type ParsedImportRow = {
  key: string;
  date: string; // YYYY-MM-DD
  type: ImportTransactionType;
  reimbursement: boolean;
  accountName: string;
  accountMatched: boolean;
  toAccountName?: string;
  toAccountMatched?: boolean;
  payeeName: string | null;
  category: CategoryKey | null;
  amountCents: number;
  memo: string;
  flagged: boolean;
  flagReason?: string;
  raw: { dateTime: string; account: string; category: string; payee: string; amount: string };
};

// name (lowercased) -> the MoneyMotion account name it should become. Only
// needed where the export's account name doesn't match ours outright.
const ACCOUNT_ALIASES: Record<string, string> = {
  "chase checking": "Checking",
};

// Categories that only ever mean income in Marc's old tracker.
const INCOME_CATEGORY_MAP: Record<string, CategoryKey> = {
  ascap: "INCOME_ASCAP",
  bonus: "INCOME_BONUS",
  gift: "INCOME_GIFT",
  options: "INCOME_OPTIONS",
  refund: "INCOME_REFUND",
  salary: "INCOME_SALARY",
  "tax refund": "INCOME_TAX_REFUND",
};

// Categories that only ever mean an expense (a positive amount here means a
// reimbursement, not income) — see the module doc comment above.
const EXPENSE_CATEGORY_MAP: Record<string, CategoryKey> = {
  auto: "AUTO",
  beauty: "BEAUTY",
  charity: "CHARITY",
  clothing: "CLOTHING",
  coffee: "COFFEE",
  "credit card payment": "CREDIT_CARD_PAYMENT",
  dessert: "DESSERT",
  devices: "DEVICES",
  drinks: "DRINKS",
  "eating out": "EATING_OUT",
  entertainment: "ENTERTAINMENT",
  gifts: "GIFTS",
  groceries: "GROCERIES",
  "health & fitness": "HEALTH_FITNESS",
  "home repair": "HOME_REPAIR",
  household: "HOUSEHOLD",
  insurance: "INSURANCE",
  loan: "LOAN",
  medical: "MEDICAL",
  misc: "MISC",
  pets: "PETS",
  rent: "RENT",
  savings: "SAVINGS",
  tv: "TV",
  transport: "TRANSPORT",
  travel: "TRAVEL",
  "utilities: garbage & recycling": "UTILITIES_TRASH_RECYCLING",
  "utilities: gas& electric": "UTILITIES_GAS_ELECTRIC",
  "utilities: internet": "UTILITIES_INTERNET",
  "utilities: telephone": "UTILITIES_PHONE",
  "utilities: water": "UTILITIES_WATER",
  wedding: "WEDDING",
};

// Appear as both a loss and a gain in the source data with no way to tell
// them apart except sign — flagged for manual review rather than guessed.
const AMBIGUOUS_CATEGORIES: Record<string, { expense: CategoryKey; income: CategoryKey }> = {
  gambling: { expense: "GAMBLING", income: "INCOME_GAMBLING" },
  others: { expense: "OTHERS", income: "INCOME_OTHERS" },
};

function normalizeCategory(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

function resolveAccountName(raw: string, knownAccountNames: string[]): { name: string; matched: boolean } {
  const trimmed = raw.trim();
  const alias = ACCOUNT_ALIASES[trimmed.toLowerCase()];
  const candidate = alias ?? trimmed;
  const known = knownAccountNames.find((n) => n.toLowerCase() === candidate.toLowerCase());
  return known ? { name: known, matched: true } : { name: candidate, matched: false };
}

function parseDate(dateTime: string): string {
  const datePart = dateTime.trim().split(" ")[0] ?? "";
  const [month, day, year] = datePart.split("/");
  if (!month || !day || !year) return "";
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

// A minimal RFC4180 line splitter — handles quoted fields (with embedded
// commas and doubled "" escapes) since Payee/Note can legitimately contain
// commas even though nothing in Marc's export currently does.
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

function mapRow(index: number, cols: string[], knownAccountNames: string[]): ParsedImportRow | null {
  const [dateTime, accountRaw, categoryRaw, payeeRaw, amountRaw] = cols;
  if (!dateTime || !accountRaw) return null;

  const date = parseDate(dateTime);
  const amountDollars = parseDollarsToCents(amountRaw ?? "");
  if (amountDollars === null) return null;
  const amountCents = Math.abs(amountDollars);
  const category = normalizeCategory(categoryRaw ?? "");
  const payeeName = !payeeRaw || payeeRaw.trim() === "" || payeeRaw.trim().toLowerCase() === "(null)"
    ? null
    : payeeRaw.trim();
  const raw = { dateTime, account: accountRaw, category: categoryRaw ?? "", payee: payeeRaw ?? "", amount: amountRaw ?? "" };
  const key = `row-${index}`;

  if (accountRaw.includes("->")) {
    const [fromRaw, toRaw] = accountRaw.split("->");
    const from = resolveAccountName(fromRaw ?? "", knownAccountNames);
    const to = resolveAccountName(toRaw ?? "", knownAccountNames);
    const flagged = !from.matched || !to.matched;
    return {
      key,
      date,
      type: "TRANSFER",
      reimbursement: false,
      accountName: from.name,
      accountMatched: from.matched,
      toAccountName: to.name,
      toAccountMatched: to.matched,
      payeeName: null,
      category: null,
      amountCents,
      memo: "",
      flagged,
      flagReason: flagged ? "unrecognized account — pick one" : undefined,
      raw,
    };
  }

  const account = resolveAccountName(accountRaw, knownAccountNames);
  let type: ImportTransactionType;
  let reimbursement = false;
  let mappedCategory: CategoryKey | null = null;
  let flagged = false;
  let flagReason: string | undefined;

  if (category === "reimbursement") {
    type = "EXPENSE";
    reimbursement = true;
    flagged = true;
    flagReason = "reimbursement — pick the category it's reimbursing";
  } else if (AMBIGUOUS_CATEGORIES[category]) {
    const pair = AMBIGUOUS_CATEGORIES[category];
    const guessIncome = amountDollars >= 0;
    type = guessIncome ? "INCOME" : "EXPENSE";
    mappedCategory = guessIncome ? pair.income : pair.expense;
    flagged = true;
    flagReason = "ambiguous category — confirm expense vs. income";
  } else if (INCOME_CATEGORY_MAP[category]) {
    type = "INCOME";
    mappedCategory = INCOME_CATEGORY_MAP[category];
  } else if (EXPENSE_CATEGORY_MAP[category]) {
    type = "EXPENSE";
    mappedCategory = EXPENSE_CATEGORY_MAP[category];
    reimbursement = amountDollars >= 0;
  } else {
    type = amountDollars >= 0 ? "INCOME" : "EXPENSE";
    flagged = true;
    flagReason = category === "(null)" || category === "" ? "no category — pick one" : "unrecognized category — pick one";
  }

  if (!account.matched) {
    flagged = true;
    flagReason = "unrecognized account — pick one";
  }

  return {
    key,
    date,
    type,
    reimbursement,
    accountName: account.name,
    accountMatched: account.matched,
    payeeName,
    category: mappedCategory,
    amountCents,
    memo: "",
    flagged,
    flagReason,
    raw,
  };
}

export function parsePocketExpenseCsv(text: string, knownAccountNames: string[]): ParsedImportRow[] {
  const lines = text.split(/\r?\n/);
  const headerIdx = lines.findIndex((l) => l.startsWith('"Date&Time"'));
  if (headerIdx === -1) throw new Error("Not a Pocket Expense export — couldn't find the header row");

  const rows: ParsedImportRow[] = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const cols = splitCsvLine(line);
    if (cols.length < 5) continue;
    const row = mapRow(i, cols, knownAccountNames);
    if (row) rows.push(row);
  }
  return rows;
}

export function importCategoryLabel(key: CategoryKey | null): string {
  return key ? (CATEGORY_INFO[key]?.fullLabel ?? key) : "No category";
}

export type ImportSummary = {
  total: number;
  flagged: number;
  byType: Record<ImportTransactionType, number>;
  dateRange: { start: string; end: string } | null;
};

export function summarizeImport(rows: ParsedImportRow[]): ImportSummary {
  const byType: Record<ImportTransactionType, number> = { EXPENSE: 0, INCOME: 0, TRANSFER: 0 };
  let flagged = 0;
  let start: string | null = null;
  let end: string | null = null;
  for (const r of rows) {
    byType[r.type]++;
    if (r.flagged) flagged++;
    if (r.date) {
      if (!start || r.date < start) start = r.date;
      if (!end || r.date > end) end = r.date;
    }
  }
  return { total: rows.length, flagged, byType, dateRange: start && end ? { start, end } : null };
}
