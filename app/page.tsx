import Link from "next/link";
import { BadgeDollarSign, Handshake, PiggyBank, UserRound } from "lucide-react";
import { getDashboardData, type BillWithStatus } from "@/lib/data";
import { WEEKDAY_SHORT, daysInMonth, monthLabel, shortDateLabel, type IsoMonth } from "@/lib/core/dates";
import { billMonthlyCostCents, billOccurrencesInMonth, extraIncomeStatus } from "@/lib/core/month";
import {
  bucketCompletionDate,
  bucketDaysLeft,
  bucketProgress,
  bucketProjectedEom,
  bucketValueOn,
} from "@/lib/core/piggy";
import { formatCents } from "@/lib/core/money";
import { Donut, LegendDot, Money, Pill, ProgressBar } from "@/components/ui";
import { SalaryReceivedToggle } from "@/components/toggles";
import { StatusCell } from "@/components/bill-tables";
import { EditableBalance } from "@/components/editable-balance";
import { ExtraIncomeForm } from "@/components/forms";

export const dynamic = "force-dynamic";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function dueLabel(bill: BillWithStatus, month: IsoMonth): string {
  if (bill.frequency === "WEEKLY") {
    const day = bill.dueWeekday == null ? "—" : WEEKDAY_SHORT[bill.dueWeekday];
    return `${day} · ${billOccurrencesInMonth(bill, month)}×`;
  }
  const day = Math.min(bill.dueDay, daysInMonth(month));
  return shortDateLabel(`${month}-${String(day).padStart(2, "0")}`);
}

export default async function Dashboard() {
  const { today, month, accounts, plan, bills, extras, buckets, snapshot: s } =
    await getDashboardData();

  const liquidAccounts = accounts.filter((a) => a.type !== "CREDIT");
  const creditAccounts = accounts.filter((a) => a.type === "CREDIT");
  const sharedBills = bills.filter((b) => b.shared);
  const soloBills = bills.filter((b) => !b.shared);
  const hitFraction = s.recurringTotalCents > 0 ? s.recurringHitCents / s.recurringTotalCents : 0;
  const totalExpensesCents = s.ccNetCents - s.recurringTotalCents - plan.savingsCents;

  return (
    <div className="mx-auto max-w-6xl">
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
      <div className="grid grid-cols-4 gap-4">
        <section className="card">
          <h2 className="card-title">Monthly Summary</h2>
          <div className="flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-2">Income</span>
              <Money cents={s.plannedIncomeCents} tone="pos" />
            </div>
            <div className="flex justify-between">
              <span className="text-ink-2">Expenses</span>
              <Money cents={-s.plannedExpensesCents} tone="neg" />
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
          <div className="text-3xl font-bold text-accent tabular-nums">
            {formatCents(s.dailyBudgetCents)}
          </div>
          <p className="mt-2 text-xs text-ink-2">
            Available to spend / day · <Money cents={s.availableCents} tone="plain" className="text-xs" /> left
          </p>
        </section>

        <section className="card">
          <h2 className="card-title">Accounts Snapshot</h2>
          <div className="flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-2">Cash &amp; Checking</span>
              <Money cents={s.liquidCents} tone="plain" />
            </div>
            <div className="flex justify-between">
              <span className="text-ink-2">Credit Cards</span>
              <Money cents={s.ccNetCents} />
            </div>
            <div className="mt-1.5 flex justify-between border-t border-line pt-2">
              <span className="font-semibold">Net Liquid</span>
              <Money cents={s.netLiquidCents} />
            </div>
          </div>
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
                Salary
                <SalaryReceivedToggle month={month} received={plan.salaryReceived} />
              </span>
              <Money cents={plan.salaryCents} tone={plan.salaryReceived ? "muted" : "plain"} />
            </div>
            <div className="flex justify-between">
              <span className="text-ink-2">Extra Income (outstanding)</span>
              <Money cents={s.extraOutstandingCents} tone="plain" />
            </div>
            <div className="flex justify-between">
              <span className="text-ink-2">Reimbursements (Pending)</span>
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
              <span className="text-ink-2">Recurring (This Month)</span>
              <Money cents={-s.recurringTotalCents} tone="neg" />
            </div>
            <div className="flex justify-between">
              <span className="text-ink-2">Savings (Monthly)</span>
              <Money cents={-plan.savingsCents} tone="neg" />
            </div>
            <div className="mt-1.5 flex justify-between border-t border-line pt-2">
              <span className="font-semibold">Total Expenses</span>
              <Money cents={totalExpensesCents} />
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
                <th className="pl-3 text-center">Hit</th>
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
                  <td className="text-right text-xs text-ink-3">{dueLabel(b, month)}</td>
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
          <table className="table-base">
            <thead>
              <tr>
                <th>Bill</th>
                <th className="text-right">Amount</th>
                <th className="pl-3 text-center">Hit</th>
                <th className="text-right">Due</th>
              </tr>
            </thead>
            <tbody>
              {soloBills.map((b) => (
                <tr key={b.id}>
                  <td className="font-medium">{b.name}</td>
                  <td className="text-right">
                    <Money cents={billMonthlyCostCents(b, month)} tone="plain" />
                  </td>
                  <StatusCell bill={b} field="hit" />
                  <td className="text-right text-xs text-ink-3">{dueLabel(b, month)}</td>
                </tr>
              ))}
              <tr>
                <td className="font-semibold">Total</td>
                <td className="text-right">
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
              <ExtraIncomeForm month={month} trigger={<span className="text-[11px] font-medium text-lime hover:underline">+ Add</span>} />
            </span>
          </h2>
          <table className="table-base">
            <thead>
              <tr>
                <th>Source</th>
                <th className="text-right">Expected</th>
                <th className="text-right">Received</th>
                <th className="text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {extras.map((e) => {
                const status = extraIncomeStatus(e);
                return (
                  <tr key={e.id}>
                    <td className="font-medium">
                      <span className="flex items-center gap-1">
                        <ExtraIncomeForm month={month} initial={e} trigger={<span className="cursor-pointer hover:text-lime">{e.source}</span>} />
                      </span>
                    </td>
                    <td className="text-right">
                      <Money cents={e.expectedCents} tone="plain" />
                    </td>
                    <td className="text-right">
                      <Money cents={e.receivedCents} tone={e.receivedCents > 0 ? "pos" : "muted"} />
                    </td>
                    <td className="text-right">
                      <Pill tone={status === "RECEIVED" ? "pos" : status === "PARTIAL" ? "info" : "warn"}>
                        {status.charAt(0) + status.slice(1).toLowerCase()}
                      </Pill>
                    </td>
                  </tr>
                );
              })}
              {extras.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center text-xs text-ink-3">
                    No extra income this month
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>

      {/* piggy buckets */}
      <section className="card mt-4">
        <h2 className="card-title">
          <PiggyBank size={13} className="text-lime" /> Piggy Bank Buckets
          <span className="ml-2 font-normal normal-case tracking-normal text-ink-3">your virtual daily-drip buckets</span>
          <Link href="/piggy" className="ml-auto text-[11px] font-medium text-lime normal-case tracking-normal hover:underline">
            Manage Buckets
          </Link>
        </h2>
        <table className="table-base">
          <thead>
            <tr>
              <th>Bucket</th>
              <th className="text-right">Current</th>
              <th className="text-right">Daily Change</th>
              <th className="text-right">Days Left</th>
              <th className="text-right">Completes</th>
              <th className="text-right">Projected (EOM)</th>
              <th className="w-40 pl-6">Progress</th>
            </tr>
          </thead>
          <tbody>
            {buckets.map((b) => {
              const daysLeft = bucketDaysLeft(b, today);
              const completes = bucketCompletionDate(b, today);
              const progress = bucketProgress(b, today);
              return (
                <tr key={b.id}>
                  <td className="font-medium">{b.name}</td>
                  <td className="text-right">
                    <Money cents={bucketValueOn(b, today)} />
                  </td>
                  <td className="text-right">
                    {b.ratePerDayCents === 0 ? (
                      <span className="text-ink-3">—</span>
                    ) : (
                      <Money cents={b.ratePerDayCents} signed className="text-xs" />
                    )}
                  </td>
                  <td className="text-right text-ink-2">
                    {daysLeft === 0 ? <Pill tone="pos">Done</Pill> : (daysLeft ?? "∞")}
                  </td>
                  <td className="text-right text-xs text-ink-3">
                    {completes && daysLeft !== 0 ? shortDateLabel(completes) : "—"}
                  </td>
                  <td className="text-right">
                    <Money cents={bucketProjectedEom(b, month)} tone="plain" />
                  </td>
                  <td className="pl-6">
                    {progress === null ? (
                      <span className="text-xs text-ink-3">perpetual</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <ProgressBar fraction={progress} className="flex-1" />
                        <span className="w-9 text-right text-xs text-ink-2 tabular-nums">
                          {Math.round(progress * 100)}%
                        </span>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
