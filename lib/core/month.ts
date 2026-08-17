import {
  addDays,
  countWeekdayInMonth,
  daysInMonth,
  daysLeftInMonth,
  monthNumber,
  monthOf,
  weekdayDatesInMonth,
  type IsoDate,
  type IsoMonth,
} from "./dates";
import { bucketValueOn, type BucketLike } from "./piggy";

export type AccountKind = "CASH" | "CHECKING" | "SAVINGS" | "CREDIT";

export type BillFrequency = "WEEKLY" | "MONTHLY" | "YEARLY";

export interface AccountInput {
  type: AccountKind;
  balanceCents: number;
}

export interface OccurrenceStatus {
  date: IsoDate;
  hit: boolean;
  paid: boolean;
}

export interface BillInput {
  amountCents: number;
  shared: boolean;
  reimburseCents: number;
  // one entry per charge this month: 1 for monthly, 4-5 for weekly, 0 when the
  // bill isn't due at all. Empty means the bill contributes nothing.
  occurrences: OccurrenceStatus[];
}

// The shape the recurrence helpers below need — a subset of BillInput so they
// can be called with a Prisma Bill row just as easily.
export interface BillRecurrence {
  frequency: BillFrequency;
  dueMonth: number | null;
  dueWeekday?: number | null;
}

export interface ExtraIncomeInput {
  expectedCents: number;
  receivedCents: number;
}

export interface PlanInput {
  salaryMidCents: number;
  salaryMidReceived: boolean;
  salaryEndCents: number;
  salaryEndReceived: boolean;
  savingsCents: number;
}

export interface SnapshotInput {
  today: IsoDate;
  accounts: AccountInput[];
  plan: PlanInput;
  bills: BillInput[];
  extras: ExtraIncomeInput[];
  buckets: BucketLike[];
}

export interface MonthSnapshot {
  month: IsoMonth;
  daysInMonth: number;
  daysLeft: number;

  liquidCents: number;
  ccNetCents: number;
  netLiquidCents: number;

  salaryOutstandingCents: number;
  extraOutstandingCents: number;
  pendingReimburseCents: number;

  recurringTotalCents: number;
  recurringHitCents: number;
  recurringRemainingCents: number;
  // what's still coming out of pocket: unhit charges only, and for shared
  // bills just your share (amount minus the other party's reimbursement)
  recurringOutOfPocketRemainingCents: number;

  piggyNetCents: number;

  plannedIncomeCents: number;
  // signed (negative): credit card debt plus what's still owed out of pocket
  // this month, minus the savings target
  plannedExpensesCents: number;
  plannedNetCents: number;

  availableCents: number;
  dailyBudgetCents: number;
  // what dailyBudgetCents becomes once today falls off — null on the last
  // day of the month, when there's no "tomorrow" left to divide by
  tomorrowBudgetCents: number | null;
}

// What you actually pay for one occurrence, once the other party settles up.
// Non-shared bills carry no reimbursement, so this is simply the full amount.
export function billOutOfPocketCents(bill: {
  amountCents: number;
  reimburseCents: number;
}): number {
  return bill.amountCents - bill.reimburseCents;
}

export function billDueInMonth(bill: BillRecurrence, month: IsoMonth): boolean {
  if (bill.frequency === "YEARLY") return bill.dueMonth === monthNumber(month);
  // weekly and monthly bills land in every month
  return true;
}

// Every date this bill is charged on in the given month: four or five for a
// weekly bill, one for a monthly one, one for a yearly one in its due month,
// and none otherwise. This is the single source of truth for recurrence —
// occurrence counts, costs and Hit/Paid rows all derive from it.
export function billDueDatesInMonth(
  bill: BillRecurrence & { dueDay?: number },
  month: IsoMonth,
): IsoDate[] {
  if (bill.frequency === "WEEKLY") {
    return bill.dueWeekday == null ? [] : weekdayDatesInMonth(month, bill.dueWeekday);
  }
  if (!billDueInMonth(bill, month)) return [];
  // a bill due on the 31st still lands in February, on the last day
  const day = Math.min(bill.dueDay ?? 1, daysInMonth(month));
  return [`${month}-${String(day).padStart(2, "0")}`];
}

// How many times the bill is charged in this month: 4 or 5 for a weekly bill,
// 1 for a monthly one, and 1 for a yearly one only in its due month.
export function billOccurrencesInMonth(
  bill: BillRecurrence & { dueDay?: number },
  month: IsoMonth,
): number {
  if (bill.frequency === "WEEKLY") {
    return bill.dueWeekday == null ? 0 : countWeekdayInMonth(month, bill.dueWeekday);
  }
  return billDueInMonth(bill, month) ? 1 : 0;
}

// A bill's total cost across this month. For weekly bills that is the per-week
// amount multiplied by the number of occurrences, so a 5-week month genuinely
// costs more than a 4-week one.
export function billMonthlyCostCents(
  bill: BillRecurrence & { amountCents: number },
  month: IsoMonth,
): number {
  return bill.amountCents * billOccurrencesInMonth(bill, month);
}

export function billMonthlyReimburseCents(
  bill: BillRecurrence & { reimburseCents: number },
  month: IsoMonth,
): number {
  return bill.reimburseCents * billOccurrencesInMonth(bill, month);
}

export function billMonthlyOutOfPocketCents(
  bill: BillRecurrence & { amountCents: number; reimburseCents: number },
  month: IsoMonth,
): number {
  return billMonthlyCostCents(bill, month) - billMonthlyReimburseCents(bill, month);
}

export function monthSnapshot(input: SnapshotInput): MonthSnapshot {
  const { today, accounts, plan, extras, buckets } = input;
  const month = monthOf(today);
  const daysLeft = daysLeftInMonth(today);

  const liquidCents = accounts
    .filter((a) => a.type !== "CREDIT")
    .reduce((sum, a) => sum + a.balanceCents, 0);
  const ccNetCents = accounts
    .filter((a) => a.type === "CREDIT")
    .reduce((sum, a) => sum + a.balanceCents, 0);

  // Everything is counted per charge, so a weekly bill with three of its five
  // charges already on the card is handled the same as any other bill.
  const bills = input.bills;
  const countWhere = (b: BillInput, p: (o: OccurrenceStatus) => boolean) =>
    b.occurrences.filter(p).length;

  const recurringTotalCents = bills.reduce(
    (sum, b) => sum + b.amountCents * b.occurrences.length,
    0,
  );
  // Charges that already hit live inside the CC balances, so only the ones
  // still to come are subtracted — that is the whole point of the "hit" box.
  const recurringHitCents = bills.reduce(
    (sum, b) => sum + b.amountCents * countWhere(b, (o) => o.hit),
    0,
  );
  const recurringRemainingCents = recurringTotalCents - recurringHitCents;

  const recurringOutOfPocketRemainingCents = bills.reduce(
    (sum, b) =>
      sum + (b.shared ? billOutOfPocketCents(b) : b.amountCents) * countWhere(b, (o) => !o.hit),
    0,
  );

  const pendingReimburseCents = bills.reduce(
    (sum, b) =>
      b.shared ? sum + b.reimburseCents * countWhere(b, (o) => o.hit && !o.paid) : sum,
    0,
  );

  const salaryOutstandingCents =
    (plan.salaryMidReceived ? 0 : plan.salaryMidCents) +
    (plan.salaryEndReceived ? 0 : plan.salaryEndCents);
  const extraOutstandingCents = extras.reduce(
    (sum, e) => sum + Math.max(e.expectedCents - e.receivedCents, 0),
    0,
  );

  const piggyNetCents = buckets.reduce(
    (sum, b) => sum + bucketValueOn(b, today),
    0,
  );

  const plannedIncomeCents =
    liquidCents +
    salaryOutstandingCents +
    extras.reduce((sum, e) => sum + Math.max(e.expectedCents, e.receivedCents), 0) +
    pendingReimburseCents;
  const plannedExpensesCents = ccNetCents - recurringOutOfPocketRemainingCents - plan.savingsCents;
  // literally Income + Expenses + Virtual Adjustments, the three lines shown
  // above it on the dashboard
  const plannedNetCents = plannedIncomeCents + plannedExpensesCents + piggyNetCents;

  const availableCents =
    liquidCents +
    ccNetCents +
    salaryOutstandingCents +
    extraOutstandingCents +
    pendingReimburseCents -
    recurringRemainingCents -
    plan.savingsCents +
    piggyNetCents;

  const dailyBudgetCents = Math.floor(plannedNetCents / daysLeft);
  // buckets keep dripping overnight, so tomorrow's net swaps today's piggy
  // value for tomorrow's — equivalent to subtracting each bucket's rate/day,
  // except a bucket already clamped at its target stops moving
  const piggyNetCentsTomorrow = buckets.reduce(
    (sum, b) => sum + bucketValueOn(b, addDays(today, 1)),
    0,
  );
  const tomorrowNetCents = plannedNetCents - piggyNetCents + piggyNetCentsTomorrow;
  const tomorrowBudgetCents = daysLeft > 1 ? Math.floor(tomorrowNetCents / (daysLeft - 1)) : null;

  return {
    month,
    daysInMonth: daysInMonth(month),
    daysLeft,
    liquidCents,
    ccNetCents,
    netLiquidCents: liquidCents + ccNetCents,
    salaryOutstandingCents,
    extraOutstandingCents,
    pendingReimburseCents,
    recurringTotalCents,
    recurringHitCents,
    recurringRemainingCents,
    recurringOutOfPocketRemainingCents,
    piggyNetCents,
    plannedIncomeCents,
    plannedExpensesCents,
    plannedNetCents,
    availableCents,
    dailyBudgetCents,
    tomorrowBudgetCents,
  };
}

export type ExtraIncomeStatus = "PENDING" | "PARTIAL" | "RECEIVED";

export function extraIncomeStatus(extra: ExtraIncomeInput): ExtraIncomeStatus {
  if (extra.receivedCents <= 0) return "PENDING";
  if (extra.receivedCents < extra.expectedCents) return "PARTIAL";
  return "RECEIVED";
}
