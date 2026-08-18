import type { BillFrequency } from "@prisma/client";
import type { BillWithStatus } from "@/lib/data";
import {
  billMonthlyCostCents,
  billMonthlyOutOfPocketCents,
  billMonthlyReimburseCents,
} from "@/lib/core/month";
import { WEEKDAY_NAMES, type IsoMonth } from "@/lib/core/dates";
import { deleteBill } from "@/app/actions";
import { Money } from "@/components/ui";
import { BillForm } from "@/components/forms";
import { BillCheck, OccurrenceChips } from "@/components/toggles";
import { ConfirmDelete } from "@/components/modal";

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// The two tables sit side by side, so they don't share a column grid: each is
// sized for the columns it actually has. Weekly bills show a chip per charge,
// so their Hit/Paid columns need real room — and they drop the Due column,
// since the chips are already labelled with the dates.
const SHARED_COLS = ["23%", "13%", "7%", "7%", "13%", "14%", "14%", "9%"];
const SHARED_COLS_WEEKLY = ["19%", "10%", "19%", "19%", "10%", "13%", "10%"];
const SOLO_COLS = ["36%", "19%", "10%", "21%", "14%"];
const SOLO_COLS_WEEKLY = ["32%", "18%", "32%", "18%"];

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

function dueText(bill: BillWithStatus): string {
  return bill.frequency === "YEARLY"
    ? `${MONTH_SHORT[(bill.dueMonth ?? 1) - 1]} ${bill.dueDay}`
    : `${ordinal(bill.dueDay)} monthly`;
}

function BillName({ bill }: { bill: BillWithStatus }) {
  const weekly = bill.frequency === "WEEKLY";
  return (
    <span className="flex items-center gap-2">
      <span
        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ background: bill.color ?? "var(--ink-3)" }}
      />
      <span className="min-w-0">
        <span className="block truncate">{bill.name}</span>
        {weekly && (
          <span className="block text-[10px] font-normal text-ink-3">
            {bill.dueWeekday == null ? "—" : `${WEEKDAY_NAMES[bill.dueWeekday]}s`}
          </span>
        )}
      </span>
    </span>
  );
}

// A weekly bill is charged four or five times a month, so each charge gets its
// own chip. Everything else has a single charge and keeps one checkbox. A bill
// with no charge this month (a yearly one in an off month) gets a dash.
export function StatusCell({ bill, field }: { bill: BillWithStatus; field: "hit" | "paid" }) {
  const only = bill.occurrences[0];
  return (
    <td className="text-center">
      {bill.frequency === "WEEKLY" ? (
        <OccurrenceChips
          billId={bill.id}
          billName={bill.name}
          field={field}
          occurrences={bill.occurrences}
        />
      ) : only ? (
        <span className="flex justify-center">
          <BillCheck
            billId={bill.id}
            date={only.date}
            field={field}
            checked={only[field]}
            billName={bill.name}
          />
        </span>
      ) : (
        <span className="text-ink-3">—</span>
      )}
    </td>
  );
}

function Actions({ bill }: { bill: BillWithStatus }) {
  return (
    <td>
      <span className="flex items-center justify-end gap-1">
        <BillForm initial={bill} />
        <ConfirmDelete onDelete={deleteBill.bind(null, bill.id)} label="" />
      </span>
    </td>
  );
}

// Yearly bills are totalled per year; weekly and monthly per month. For weekly
// that total is the full monthly cost, not the per-week amount.
function totals(bills: BillWithStatus[], month: IsoMonth, frequency: BillFrequency) {
  const annual = frequency === "YEARLY";
  return {
    label: annual ? "Total / year" : "Total / month",
    amount: bills.reduce(
      (sum, b) => sum + (annual ? b.amountCents : billMonthlyCostCents(b, month)),
      0,
    ),
    reimburse: bills.reduce(
      (sum, b) => sum + (annual ? b.reimburseCents : billMonthlyReimburseCents(b, month)),
      0,
    ),
    mine: bills.reduce(
      (sum, b) =>
        sum +
        (annual ? b.amountCents - b.reimburseCents : billMonthlyOutOfPocketCents(b, month)),
      0,
    ),
  };
}

function Cols({ widths }: { widths: string[] }) {
  return (
    <colgroup>
      {widths.map((w, i) => (
        <col key={i} style={{ width: w }} />
      ))}
    </colgroup>
  );
}

export function SharedBillTable({
  bills,
  month,
  frequency,
}: {
  bills: BillWithStatus[];
  month: IsoMonth;
  frequency: BillFrequency;
}) {
  const weekly = frequency === "WEEKLY";
  const t = totals(bills, month, frequency);
  const span = weekly ? 7 : 8;

  return (
    <table className="table-base table-fixed">
      <Cols widths={weekly ? SHARED_COLS_WEEKLY : SHARED_COLS} />
      <thead>
        <tr>
          <th>Bill</th>
          <th className="text-right">{weekly ? "Per week" : "Amount"}</th>
          <th className="text-center">Hit</th>
          <th className="text-center">Paid</th>
          <th className="text-right">My Share</th>
          <th className="text-right">Reimbursed</th>
          {!weekly && <th className="pl-4">Due</th>}
          <th className="text-right">Actions</th>
        </tr>
      </thead>
      <tbody>
        {bills.map((b) => (
          <tr key={b.id}>
            <td className="font-medium">
              <BillName bill={b} />
            </td>
            <td className="text-right">
              <Money cents={b.amountCents} tone="plain" />
            </td>
            <StatusCell bill={b} field="hit" />
            <StatusCell bill={b} field="paid" />
            <td className="text-right">
              <Money cents={b.amountCents - b.reimburseCents} tone="plain" />
            </td>
            <td className="text-right">
              <Money cents={b.reimburseCents} tone="pos" />
            </td>
            {!weekly && (
              <td className="pl-4 text-xs whitespace-nowrap text-ink-2">{dueText(b)}</td>
            )}
            <Actions bill={b} />
          </tr>
        ))}
        {bills.length === 0 && (
          <tr>
            <td colSpan={span} className="text-center text-xs text-ink-3">
              Nothing here yet
            </td>
          </tr>
        )}
        <tr>
          <td className="font-semibold">{t.label}</td>
          <td className="text-right">
            <Money cents={t.amount} tone="plain" />
          </td>
          <td colSpan={2} />
          <td className="text-right">
            <Money cents={t.mine} tone="plain" />
          </td>
          <td className="text-right">
            <Money cents={t.reimburse} tone="pos" />
          </td>
          <td colSpan={weekly ? 1 : 2} />
        </tr>
      </tbody>
    </table>
  );
}

export function SoloBillTable({
  bills,
  month,
  frequency,
}: {
  bills: BillWithStatus[];
  month: IsoMonth;
  frequency: BillFrequency;
}) {
  const weekly = frequency === "WEEKLY";
  const t = totals(bills, month, frequency);
  const span = weekly ? 4 : 5;

  return (
    <table className="table-base table-fixed">
      <Cols widths={weekly ? SOLO_COLS_WEEKLY : SOLO_COLS} />
      <thead>
        <tr>
          <th>Bill</th>
          <th className="text-right">{weekly ? "Per week" : "Amount"}</th>
          <th className="text-center">Hit</th>
          {!weekly && <th className="pl-4">Due</th>}
          <th className="text-right">Actions</th>
        </tr>
      </thead>
      <tbody>
        {bills.map((b) => (
          <tr key={b.id}>
            <td className="font-medium">
              <BillName bill={b} />
            </td>
            <td className="text-right">
              <Money cents={b.amountCents} tone="plain" />
            </td>
            <StatusCell bill={b} field="hit" />
            {!weekly && (
              <td className="pl-4 text-xs whitespace-nowrap text-ink-2">{dueText(b)}</td>
            )}
            <Actions bill={b} />
          </tr>
        ))}
        {bills.length === 0 && (
          <tr>
            <td colSpan={span} className="text-center text-xs text-ink-3">
              Nothing here yet
            </td>
          </tr>
        )}
        <tr>
          <td className="font-semibold">{t.label}</td>
          <td className="text-right">
            <Money cents={t.amount} tone="plain" />
          </td>
          <td colSpan={span - 2} />
        </tr>
      </tbody>
    </table>
  );
}

/** The shared / non-shared pair, as used by each frequency subpage. */
export function BillBoards({
  bills,
  month,
  frequency,
  note,
}: {
  bills: BillWithStatus[];
  month: IsoMonth;
  frequency: BillFrequency;
  note?: string;
}) {
  const shared = bills.filter((b) => b.shared);
  const solo = bills.filter((b) => !b.shared);
  return (
    <>
      {note && <p className="mb-4 text-xs text-ink-3">{note}</p>}
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[830px_540px]">
        <section className="card">
          <h2 className="card-title">Shared</h2>
          <SharedBillTable bills={shared} month={month} frequency={frequency} />
        </section>
        <section className="card">
          <h2 className="card-title">Non-Shared</h2>
          <SoloBillTable bills={solo} month={month} frequency={frequency} />
        </section>
      </div>
    </>
  );
}
