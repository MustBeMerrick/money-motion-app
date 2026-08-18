import Link from "next/link";
import { BadgeDollarSign, Handshake, UserRound } from "lucide-react";
import { getDashboardData, type BillWithStatus } from "@/lib/data";
import { WEEKDAY_SHORT, daysInMonth, monthLabel, semiMonthlyPayDates, shortDateLabel, type IsoMonth } from "@/lib/core/dates";
import { billMonthlyCostCents, billOccurrencesInMonth } from "@/lib/core/month";
import { formatCents } from "@/lib/core/money";
import { Donut, LegendDot, Money, ProgressBar } from "@/components/ui";
import { SalaryReceivedToggle } from "@/components/toggles";
import { StatusCell } from "@/components/bill-tables";
import { EditableBalance } from "@/components/editable-balance";
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
  const hitFraction = s.recurringTotalCents > 0 ? s.recurringHitCents / s.recurringTotalCents : 0;
  const payDates = semiMonthlyPayDates(month);

  return (
    <div className="max-w-6xl">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">{greeting()}, Marc! 👋</h1>
          <p className="mt-0.5 text-sm text-ink-2">Here&apos;s your financial overview</p>
        </div>
        <div className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink-2">
          {monthLabel(month)}
        </div>
      </div>

      {/* hero cards */}
      <div className="grid grid-cols-3 gap-4">
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

      </div>

      {/* income / expenses / budget status */}
      <div className="mt-4 grid grid-cols-3 gap-4">
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
              <Money cents={plan.salaryMidCents} tone={plan.salaryMidReceived ? "muted" : "plain"} />
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-ink-2">
                Salary ({shortDateLabel(payDates.end)})
                <SalaryReceivedToggle month={month} which="end" received={plan.salaryEndReceived} />
              </span>
              <Money cents={plan.salaryEndCents} tone={plan.salaryEndReceived ? "muted" : "plain"} />
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
                <span className="text-ink-2">{a.name}</span>
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
            <div className="flex justify-between">
              <span className="text-ink-2">Savings</span>
              <Money cents={-plan.savingsCents} tone="neg" />
            </div>
            <div className="mt-1.5 flex justify-between border-t border-line pt-2">
              <span className="font-semibold">Total Expenses</span>
              <Money cents={s.plannedExpensesCents} />
            </div>
          </div>
        </section>

        <section className="card">
          <h2 className="card-title">Budget Status</h2>
          <div className="flex items-center gap-5">
            <Donut
              fraction={hitFraction}
              label={`${Math.round(hitFraction * 100)}%`}
              sublabel="of recurring hit"
            />
            <div className="flex flex-col gap-2 text-xs">
              <div className="flex items-center gap-2">
                <LegendDot color="var(--lime)" />
                <span className="text-ink-2">Hit</span>
                <Money cents={s.recurringHitCents} tone="plain" className="ml-auto text-xs" />
              </div>
              <div className="flex items-center gap-2">
                <LegendDot color="var(--surface-2)" />
                <span className="text-ink-2">Remaining</span>
                <Money cents={s.recurringRemainingCents} tone="plain" className="ml-auto text-xs" />
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-1.5 border-t border-line pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-2">Piggy net effect</span>
              <Money cents={s.piggyNetCents} signed />
            </div>
            <div className="flex justify-between">
              <span className="text-ink-2">Projected Net</span>
              <Money cents={s.plannedNetCents} signed />
            </div>
          </div>
        </section>
      </div>

      {/* bills + extra income */}
      <div className="mt-4 grid grid-cols-3 gap-4">
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

      {/* piggy buckets — same table as the Piggy Bank page */}
      <div className="mt-4">
        <ActiveBucketsTable buckets={buckets} today={today} />
      </div>
    </div>
  );
}
