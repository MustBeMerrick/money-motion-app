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
import { BillColorDot } from "@/components/bill-color-dot";

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

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
      <BillColorDot color={bill.color} />
      <span className="min-w-0">
        <span className="block truncate">{bill.name}</span>
        {weekly && (
          <span className="block text-[10px] font-normal text-ink-3">
            {bill.dueWeekday == null
              ? "—"
              : `${WEEKDAY_NAMES[bill.dueWeekday]}s`}
          </span>
        )}
      </span>
    </span>
  );
}

// A weekly bill is charged four or five times a month, so each charge gets its
// own chip. Everything else has a single charge and keeps one checkbox. A bill
// with no charge this month (a yearly one in an off month) gets a dash.
export function StatusControl({
  bill,
  field,
  showMarkAll = true,
}: {
  bill: BillWithStatus;
  field: "hit" | "paid";
  showMarkAll?: boolean;
}) {
  const only = bill.occurrences[0];
  return (
    <>
      {bill.frequency === "WEEKLY" ? (
        <OccurrenceChips
          billId={bill.id}
          billName={bill.name}
          field={field}
          occurrences={bill.occurrences}
          showMarkAll={showMarkAll}
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
    </>
  );
}

export function StatusCell(props: {
  bill: BillWithStatus;
  field: "hit" | "paid";
  showMarkAll?: boolean;
}) {
  return (
    <td className="text-center">
      <StatusControl {...props} />
    </td>
  );
}

function ActionButtons({ bill }: { bill: BillWithStatus }) {
  return (
    <span className="flex items-center justify-end gap-1">
      <BillForm initial={bill} />
      <ConfirmDelete onDelete={deleteBill.bind(null, bill.id)} label="" />
    </span>
  );
}

function Actions({ bill }: { bill: BillWithStatus }) {
  return (
    <td>
      <ActionButtons bill={bill} />
    </td>
  );
}

// Yearly bills are totalled per year; weekly and monthly per month. For weekly
// that total is the full monthly cost, not the per-week amount.
function totals(
  bills: BillWithStatus[],
  month: IsoMonth,
  frequency: BillFrequency,
) {
  const annual = frequency === "YEARLY";
  return {
    label: annual ? "Total / year" : "Total / month",
    amount: bills.reduce(
      (sum, b) =>
        sum + (annual ? b.amountCents : billMonthlyCostCents(b, month)),
      0,
    ),
    reimburse: bills.reduce(
      (sum, b) =>
        sum + (annual ? b.reimburseCents : billMonthlyReimburseCents(b, month)),
      0,
    ),
    mine: bills.reduce(
      (sum, b) =>
        sum +
        (annual
          ? b.amountCents - b.reimburseCents
          : billMonthlyOutOfPocketCents(b, month)),
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

// Phone layout: the tables are 5-8 columns wide, which can't fit, so each
// bill becomes a card. Shared bills carry the extra reimbursement numbers.
function BillCards({
  bills,
  month,
  frequency,
  shared,
}: {
  bills: BillWithStatus[];
  month: IsoMonth;
  frequency: BillFrequency;
  shared: boolean;
}) {
  const weekly = frequency === "WEEKLY";
  const t = totals(bills, month, frequency);

  return (
    <div className="flex flex-col gap-3 lg:hidden">
      {bills.map((b) => (
        <div key={b.id} className="rounded-xl border border-line bg-bg/40 p-3">
          <div className="flex items-start justify-between gap-2 font-medium">
            <BillName bill={b} />
            <span className="shrink-0 text-right">
              <Money cents={b.amountCents} tone="plain" />
              {weekly && (
                <span className="block text-[10px] font-normal text-ink-3">
                  per week
                </span>
              )}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-2">
            <span className="flex items-center gap-2">
              Hit
              <StatusControl bill={b} field="hit" showMarkAll={shared} />
            </span>
            {shared && (
              <span className="flex items-center gap-2">
                Paid
                <StatusControl bill={b} field="paid" />
              </span>
            )}
          </div>

          {shared && (
            <div className="mt-3 flex items-center justify-between gap-2 text-xs">
              <span className="text-ink-2">
                My share{" "}
                <Money
                  cents={b.amountCents - b.reimburseCents}
                  tone="plain"
                  className="text-xs"
                />
              </span>
              <span className="text-ink-2">
                Back{" "}
                <Money
                  cents={b.reimburseCents}
                  tone="pos"
                  className="text-xs"
                />
              </span>
            </div>
          )}

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-2 text-[11px] text-ink-3">
            <span>
              {weekly
                ? b.dueWeekday == null
                  ? "—"
                  : `${WEEKDAY_NAMES[b.dueWeekday]}s`
                : dueText(b)}
            </span>
            <ActionButtons bill={b} />
          </div>
        </div>
      ))}

      {bills.length === 0 ? (
        <p className="text-center text-xs text-ink-3">Nothing here yet</p>
      ) : (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-line-2 bg-surface-2/60 px-3 py-2 text-sm">
          <span className="font-semibold">{t.label}</span>
          <span className="flex items-center gap-3">
            {shared && (
              <span className="text-xs text-ink-2">
                mine <Money cents={t.mine} tone="plain" className="text-xs" />
              </span>
            )}
            <Money cents={t.amount} tone="plain" />
          </span>
        </div>
      )}
    </div>
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
    <>
      <BillCards bills={bills} month={month} frequency={frequency} shared />
      <table className="table-base hidden table-fixed lg:table">
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
                <td className="pl-4 text-xs whitespace-nowrap text-ink-2">
                  {dueText(b)}
                </td>
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
    </>
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
    <>
      <BillCards
        bills={bills}
        month={month}
        frequency={frequency}
        shared={false}
      />
      <table className="table-base hidden table-fixed lg:table">
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
              <StatusCell bill={b} field="hit" showMarkAll={false} />
              {!weekly && (
                <td className="pl-4 text-xs whitespace-nowrap text-ink-2">
                  {dueText(b)}
                </td>
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
    </>
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
