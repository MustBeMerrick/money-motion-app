import Link from "next/link";
import { BadgeDollarSign, Handshake, UserRound } from "lucide-react";
import { getDashboardData, type BillWithStatus } from "@/lib/data";
import { WEEKDAY_SHORT, daysInMonth, monthLabel, semiMonthlyPayDates, shortDateLabel, type IsoMonth } from "@/lib/core/dates";
import { billMonthlyCostCents, billOccurrencesInMonth } from "@/lib/core/month";
import { formatCents } from "@/lib/core/money";
import { Money, ProgressBar } from "@/components/ui";
import { SalaryReceivedToggle } from "@/components/toggles";
import { StatusCell } from "@/components/bill-tables";
import { EditableBalance } from "@/components/editable-balance";
import { EditablePlanAmount } from "@/components/editable-plan-amount";
import { ExtraIncomeForm } from "@/components/forms";
import { ExtraIncomeTable } from "@/components/extra-income-table";
import { ActiveBucketsTable } from "@/components/active-buckets-table";

export const dynamic = "force-dynamic";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

// Credit cards in the Expenses block wear their account color as a
// highlight behind the name — gradient accounts keep both stops. The
// foreground picks whichever of black / off-white has the higher WCAG
// contrast ratio against the highlight, so lime and navy cards are both
// readable. Crossover is at relative luminance sqrt(1.05 * 0.05) - 0.05.
function readableInk(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "var(--ink)";
  const n = parseInt(m[1], 16);
  const srgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
  return luminance > 0.1791 ? "#000" : "var(--ink)";
}

function AccountName({ name, color, color2 }: { name: string; color: string | null; color2: string | null }) {
  if (!color) return <span className="text-ink-2">{name}</span>;
  const second = color2 && color2 !== color ? color2 : null;
  return (
    <span
      className="rounded px-1.5 py-0.5 font-medium"
      style={{
        background: second ? `linear-gradient(120deg, ${color}, ${second})` : color,
        color: readableInk(second ?? color),
      }}
    >
      {name}
    </span>
  );
}

function DueLabel({ bill, month }: { bill: BillWithStatus; month: IsoMonth }) {
  if (bill.frequency === "WEEKLY") {
    const day = bill.dueWeekday == null ? "—" : WEEKDAY_SHORT[bill.dueWeekday];
    return (
      <span className="block leading-tight">
        <span className="block">{day}</span>
        <span className="block">{billOccurrencesInMonth(bill, month)}×</span>
      </span>
    );
  }
  const day = Math.min(bill.dueDay, daysInMonth(month));
  return <>{shortDateLabel(`${month}-${String(day).padStart(2, "0")}`)}</>;
}

export default async function Dashboard() {
  const { today, month, accounts, plan, bills, extras, buckets, snapshot: s } =
    await getDashboardData();

  const liquidAccounts = accounts.filter((a) => a.type !== "CREDIT");
  const creditAccounts = accounts.filter((a) => a.type === "CREDIT");
  // dueDay isn't meaningful for weekly bills, so sort by each bill's actual
  // first charge date this month rather than the raw stored field
  const byDueDate = (a: BillWithStatus, b: BillWithStatus) =>
    (a.occurrences[0]?.date ?? "").localeCompare(b.occurrences[0]?.date ?? "");
  const sharedBills = bills.filter((b) => b.shared).sort(byDueDate);
  const soloBills = bills.filter((b) => !b.shared).sort(byDueDate);
  const payDates = semiMonthlyPayDates(month);

  return (
    <div className="w-full lg:w-[61rem]">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">{greeting()}, Marc! 👋</h1>
          <p className="mt-0.5 text-sm text-ink-2">Here&apos;s your financial overview</p>
        </div>
        <div className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink-2">
          {monthLabel(month)}
        </div>
      </div>

      {/* hero cards — columns match the income/expenses row below */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[19rem_19rem_21rem]">
        <section className="card">
          <h2 className="card-title">Monthly Summary</h2>
          <div className="flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-2">Income</span>
              <Money cents={s.plannedIncomeCents} tone="pos" />
            </div>
            <div className="flex justify-between">
              <span className="text-ink-2">Expenses</span>
              <Money cents={s.plannedExpensesCents} tone="neg" />
            </div>
            <div className="flex justify-between">
              <span className="text-ink-2">Virtual Adjustments</span>
              <Money cents={s.piggyNetCents} signed tone="plain" />
            </div>
            <div className="mt-1.5 flex justify-between border-t border-line pt-2">
              <span className="font-semibold">Net</span>
              <Money cents={s.plannedNetCents} />
            </div>
          </div>
        </section>

        <section className="card bg-gradient-to-br from-surface to-forest/20">
          <h2 className="card-title">Daily Budget</h2>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-bold text-accent tabular-nums">
              {formatCents(s.dailyBudgetCents)}
            </div>
            {s.tomorrowBudgetCents !== null && (
              <div className="text-base font-semibold text-ink-3 tabular-nums" title="Tomorrow's daily budget">
                {formatCents(s.tomorrowBudgetCents)}
              </div>
            )}
          </div>
          <p className="mt-2 text-xs text-ink-2">
            Available to spend / day · <Money cents={s.plannedNetCents} tone="plain" className="text-xs" /> left
          </p>
        </section>

        <section className="card">
          <h2 className="card-title">Days Left</h2>
          <div className="text-3xl font-bold">
            {s.daysLeft}
            <span className="ml-1.5 text-sm font-medium text-ink-3">of {s.daysInMonth} days</span>
          </div>
          <ProgressBar
            fraction={(s.daysInMonth - s.daysLeft) / s.daysInMonth}
            className="mt-3.5"
          />
        </section>

      </div>

      {/* income / expenses / extra income */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[19rem_19rem_21rem]">
        <section className="card">
          <h2 className="card-title">
            Income
            <Link href="/accounts" className="ml-auto text-[11px] font-medium text-lime normal-case tracking-normal hover:underline">
              View all
            </Link>
          </h2>
          <div className="flex flex-col gap-1.5 text-sm">
            {liquidAccounts.map((a) => (
              <div key={a.id} className="flex items-center justify-between">
                <span className="text-ink-2">{a.name}</span>
                <EditableBalance accountId={a.id} cents={a.balanceCents} />
              </div>
            ))}
            <div className="my-1 border-t border-line" />
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-ink-2">
                Salary ({shortDateLabel(payDates.mid)})
                <SalaryReceivedToggle month={month} which="mid" received={plan.salaryMidReceived} />
              </span>
              <EditablePlanAmount
                month={month}
                field="salaryMid"
                cents={plan.salaryMidCents}
                tone={plan.salaryMidReceived ? "muted" : "plain"}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-ink-2">
                Salary ({shortDateLabel(payDates.end)})
                <SalaryReceivedToggle month={month} which="end" received={plan.salaryEndReceived} />
              </span>
              <EditablePlanAmount
                month={month}
                field="salaryEnd"
                cents={plan.salaryEndCents}
                tone={plan.salaryEndReceived ? "muted" : "plain"}
              />
            </div>
            <div className="flex justify-between">
              <span className="text-ink-2">Extra Income</span>
              <Money cents={s.extraOutstandingCents} tone="plain" />
            </div>
            <div className="flex justify-between">
              <span className="text-ink-2">Reimbursements</span>
              <Money cents={s.pendingReimburseCents} tone="plain" />
            </div>
            <div className="mt-1.5 flex justify-between border-t border-line pt-2">
              <span className="font-semibold">Total Income</span>
              <Money cents={s.plannedIncomeCents} tone="pos" />
            </div>
          </div>
        </section>

        <section className="card">
          <h2 className="card-title">
            Expenses
            <Link href="/accounts" className="ml-auto text-[11px] font-medium text-lime normal-case tracking-normal hover:underline">
              View all
            </Link>
          </h2>
          <div className="flex flex-col gap-1.5 text-sm">
            {creditAccounts.map((a) => (
              <div key={a.id} className="flex items-center justify-between">
                <AccountName name={a.name} color={a.color} color2={a.color2} />
                <EditableBalance accountId={a.id} cents={a.balanceCents} />
              </div>
            ))}
            <div className="my-1 border-t border-line" />
            <div className="flex justify-between">
              <span className="text-ink-2">Total Credit Cards</span>
              <Money cents={s.ccNetCents} />
            </div>
            <div className="flex justify-between">
              <span className="text-ink-2">Recurring</span>
              <Money cents={-s.recurringOutOfPocketRemainingCents} tone="neg" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-2">Savings</span>
              <EditablePlanAmount month={month} field="savings" cents={plan.savingsCents} negated tone="neg" />
            </div>
            <div className="mt-1.5 flex justify-between border-t border-line pt-2">
              <span className="font-semibold">Total Expenses</span>
              <Money cents={s.plannedExpensesCents} />
            </div>
          </div>
        </section>

        <section className="card">
          <h2 className="card-title">
            <BadgeDollarSign size={13} className="text-lime" /> Extra Income
            <span className="ml-auto normal-case tracking-normal">
              <ExtraIncomeForm trigger={<span className="text-[11px] font-medium text-lime hover:underline">+ Add</span>} />
            </span>
          </h2>
          <ExtraIncomeTable extras={extras} />
        </section>
      </div>

      {/* bills */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[30rem_30rem]">
        <section className="card">
          <h2 className="card-title">
            <Handshake size={13} className="text-lime" /> Shared Recurring Bills
            <Link href="/bills" className="ml-auto text-[11px] font-medium text-lime normal-case tracking-normal hover:underline">
              Manage Bills
            </Link>
          </h2>
          <table className="table-base">
            <thead>
              <tr>
                <th>Bill</th>
                <th className="text-right">Amount</th>
                <th className="text-center">Hit</th>
                <th className="text-center">Paid</th>
                <th className="text-right">Due</th>
              </tr>
            </thead>
            <tbody>
              {sharedBills.map((b) => (
                <tr key={b.id}>
                  <td className="font-medium">{b.name}</td>
                  <td className="text-right">
                    <Money cents={billMonthlyCostCents(b, month)} tone="plain" />
                  </td>
                  <StatusCell bill={b} field="hit" />
                  <StatusCell bill={b} field="paid" />
                  <td className="text-right text-xs text-ink-3">
                    <DueLabel bill={b} month={month} />
                  </td>
                </tr>
              ))}
              <tr>
                <td className="font-semibold">Total</td>
                <td className="text-right">
                  <Money cents={sharedBills.reduce((sum, b) => sum + billMonthlyCostCents(b, month), 0)} tone="plain" />
                </td>
                <td colSpan={3} />
              </tr>
            </tbody>
          </table>
        </section>

        <section className="card">
          <h2 className="card-title">
            <UserRound size={13} className="text-lime" /> Non-Shared Recurring
            <Link href="/bills" className="ml-auto text-[11px] font-medium text-lime normal-case tracking-normal hover:underline">
              Manage Bills
            </Link>
          </h2>
          <table className="table-base table-fixed">
            <colgroup>
              <col style={{ width: "30%" }} />
              <col style={{ width: "21%" }} />
              <col style={{ width: "34%" }} />
              <col style={{ width: "15%" }} />
            </colgroup>
            <thead>
              <tr>
                <th>Bill</th>
                <th className="text-left">Amount</th>
                <th className="text-center">Hit</th>
                <th className="text-right">Due</th>
              </tr>
            </thead>
            <tbody>
              {soloBills.map((b) => (
                <tr key={b.id}>
                  <td className="font-medium">{b.name}</td>
                  <td className="text-left">
                    <Money cents={billMonthlyCostCents(b, month)} tone="plain" />
                  </td>
                  <StatusCell bill={b} field="hit" showMarkAll={false} />
                  <td className="text-right text-xs text-ink-3">
                    <DueLabel bill={b} month={month} />
                  </td>
                </tr>
              ))}
              <tr>
                <td className="font-semibold">Total</td>
                <td className="text-left">
                  <Money cents={soloBills.reduce((sum, b) => sum + billMonthlyCostCents(b, month), 0)} tone="plain" />
                </td>
                <td colSpan={2} />
              </tr>
            </tbody>
          </table>
        </section>
      </div>

      {/* piggy buckets — same table as the Piggy Bank page */}
      <div className="mt-4">
        <ActiveBucketsTable buckets={buckets} today={today} />
      </div>
    </div>
  );
}
