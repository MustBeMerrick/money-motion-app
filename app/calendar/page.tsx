import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getBillsWithStatus } from "@/lib/data";
import {
  addMonths,
  daysInMonth,
  monthLabel,
  monthOf,
  todayIso,
  type IsoMonth,
} from "@/lib/core/dates";
import { billMonthlyCostCents, billMonthlyOutOfPocketCents } from "@/lib/core/month";
import { formatCents } from "@/lib/core/money";
import { CalendarBillChip } from "@/components/calendar-bill-chip";
import { MobileBillCalendar, type MobileBillCharge } from "@/components/mobile-bill-calendar";
import { CalendarViewToggle } from "@/components/calendar-view-toggle";
import { ExpenseDayCalendar, type DayTotals } from "@/components/expense-day-calendar";
import type { LedgerRow } from "@/components/transaction-list";
import { categoryEmoji, categoryLabel } from "@/lib/core/categories";

export const dynamic = "force-dynamic";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const params = await searchParams;
  const today = todayIso();
  const month: IsoMonth = /^\d{4}-\d{2}$/.test(params.m ?? "") ? params.m! : monthOf(today);

  const [bills, accounts, dayTransactions] = await Promise.all([
    getBillsWithStatus(month),
    prisma.account.findMany({ where: { active: true }, select: { name: true, color: true } }),
    // Expense View covers both sides of the day — expenses (net of
    // reimbursements) and separately-logged income — mirroring the day
    // rollup Marc described when reimbursements were first designed.
    prisma.transaction.findMany({
      where: { type: { in: ["EXPENSE", "INCOME"] }, date: { startsWith: month } },
      include: { payee: true, account: true },
      orderBy: { date: "asc" },
    }),
  ]);
  const expenseTransactions = dayTransactions.filter((t) => t.type === "EXPENSE");
  const accountNameByColor = new Map(
    accounts.filter((a): a is { name: string; color: string } => !!a.color).map((a) => [a.color, a.name]),
  );
  const dim = daysInMonth(month);
  const [y, m] = month.split("-").map(Number);
  const firstWeekday = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const weeks = Math.ceil((firstWeekday + dim) / 7);
  const todayDay = monthOf(today) === month ? Number(today.slice(8, 10)) : null;

  // one entry per charge, so a weekly bill appears on each of its dates and
  // each is struck through independently once that charge has hit
  type Charge = { bill: (typeof bills)[number]; date: string; hit: boolean };
  const byDay = new Map<number, Charge[]>();
  for (const bill of bills) {
    for (const o of bill.occurrences) {
      const day = Number(o.date.slice(8, 10));
      byDay.set(day, [...(byDay.get(day) ?? []), { bill, date: o.date, hit: o.hit }]);
    }
  }
  // Hello Fresh recurs so often it crowds out anything more worth noticing at
  // a glance -- sort it to the end of each day's list (a stable sort, so
  // everything else keeps its relative order) rather than letting it win the
  // "first bill" slot mobile's compact cell shows.
  for (const charges of byDay.values()) {
    charges.sort((a, b) => (a.bill.name === "Hello Fresh" ? 1 : 0) - (b.bill.name === "Hello Fresh" ? 1 : 0));
  }
  // count charges, not unique bills — a weekly bill due 5 times this month
  // is 5 chips on the calendar, not 1
  const chargeCount = bills.reduce((sum, b) => sum + b.occurrences.length, 0);
  const monthTotal = bills.reduce((sum, b) => sum + billMonthlyCostCents(b, month), 0);
  // shared bills get reimbursed, so what Marc actually pays is less than the total due
  const myShareTotal = bills.reduce((sum, b) => sum + billMonthlyOutOfPocketCents(b, month), 0);

  const expenseCount = expenseTransactions.length;
  const expenseMonthTotal = expenseTransactions.reduce(
    (sum, t) => sum + (t.reimbursement ? -t.amountCents : t.amountCents),
    0,
  );

  // desktop Expense View: a tally per day plus, on click, an itemized list --
  // built from both EXPENSE and INCOME so the day shows the full picture
  // (e.g. $11 expense / $30 income), same as the ledger's signed-amount math.
  type DayTransaction = (typeof dayTransactions)[number];
  const rawByDay = new Map<number, DayTransaction[]>();
  for (const t of dayTransactions) {
    const day = Number(t.date.slice(8, 10));
    rawByDay.set(day, [...(rawByDay.get(day) ?? []), t]);
  }

  // newest first; a reimbursement always follows the expense it pays back
  // (matched by payee, same day) regardless of when either was logged, so
  // e.g. a Pets reimbursement added today still lands right under the vet
  // bill it offsets rather than at the top of the list.
  function sortDayRows(rows: DayTransaction[]): DayTransaction[] {
    const sorted = [...rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const result: DayTransaction[] = [];
    const reimbursements: DayTransaction[] = [];
    for (const t of sorted) (t.reimbursement ? reimbursements : result).push(t);
    for (const reim of reimbursements) {
      const counterpartIdx = reim.payeeId
        ? result.findIndex((t) => t.payeeId === reim.payeeId && !t.reimbursement)
        : -1;
      if (counterpartIdx === -1) {
        const insertAt = result.findIndex((t) => t.createdAt.getTime() < reim.createdAt.getTime());
        if (insertAt === -1) result.push(reim);
        else result.splice(insertAt, 0, reim);
      } else {
        result.splice(counterpartIdx + 1, 0, reim);
      }
    }
    return result;
  }

  const dayTotals: Record<number, DayTotals> = {};
  const itemsByDay: Record<number, LedgerRow[]> = {};
  for (const [day, rows] of rawByDay) {
    for (const t of sortDayRows(rows)) {
      const signedCents = t.type === "INCOME" || t.reimbursement ? t.amountCents : -t.amountCents;
      const totals = dayTotals[day] ?? { expenseCents: 0, incomeCents: 0 };
      if (t.type === "INCOME") totals.incomeCents += t.amountCents;
      else totals.expenseCents += t.reimbursement ? -t.amountCents : t.amountCents;
      dayTotals[day] = totals;

      (itemsByDay[day] ??= []).push({
        id: t.id,
        dateLabel: t.date,
        isTransfer: false,
        reimbursement: t.reimbursement,
        payeeName: t.payee?.name,
        categoryLabel: categoryLabel(t.category),
        categoryEmoji: categoryEmoji(t.category),
        accountName: t.account.name,
        memo: t.memo,
        signedCents,
        edit: {
          type: t.type,
          reimbursement: t.reimbursement,
          date: t.date,
          amountCents: t.amountCents,
          accountId: t.accountId,
          payeeName: t.payee?.name,
          category: t.category,
          memo: t.memo,
        },
      });
    }
  }

  // phones get the same month grid but with names moved out of the cells
  // into a tap-to-open day list, since a ~50px cell truncates every name
  const mobileBillCharges: Record<number, MobileBillCharge[]> = {};
  for (const [day, charges] of byDay) {
    mobileBillCharges[day] = charges.map(({ bill: b, date, hit }) => ({
      key: `${b.id}-${date}`,
      name: b.name,
      amountCents: b.amountCents,
      hit,
      color: b.color ?? "var(--lime)",
      accountName: b.color ? accountNameByColor.get(b.color) : undefined,
    }));
  }

  return (
    // 3.5rem == the layout's py-7 (top + bottom), so on desktop this fills
    // exactly to the viewport edge with no page scroll, however many weeks the
    // month spans — a busy day scrolls within its own cell instead (see the
    // per-cell overflow-y-auto below). On phones the grid + day list just
    // scroll with the page.
    <div className="flex flex-col lg:h-[calc(100vh-3.5rem)]">
      <CalendarViewToggle
        header={
          <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
            <div className="flex flex-col gap-1 lg:flex-row lg:items-baseline lg:gap-4">
              <h1 className="text-2xl font-bold">Calendar</h1>
              <div className="cal-bill flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm text-ink-2 lg:gap-x-3">
                <span>{chargeCount} bills</span>
                <span className="px-0.5 text-ink-3 lg:px-0">·</span>
                <span>{formatCents(monthTotal)} due</span>
                <span className="px-0.5 text-ink-3 lg:px-0">·</span>
                <span>{formatCents(myShareTotal)} my share</span>
              </div>
              <div className="cal-expense flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm text-ink-2 lg:gap-x-3">
                <span>{expenseCount} expenses</span>
                <span className="px-0.5 text-ink-3 lg:px-0">·</span>
                <span>{formatCents(expenseMonthTotal)} net</span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 lg:justify-end">
              <Link href={`/calendar?m=${addMonths(month, -1)}`} className="btn px-2" aria-label="Previous month">
                <ChevronLeft size={16} />
              </Link>
              <span className="text-center text-sm font-semibold lg:w-40">{monthLabel(month)}</span>
              <Link href={`/calendar?m=${addMonths(month, 1)}`} className="btn px-2" aria-label="Next month">
                <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        }
      >
        <MobileBillCalendar
          month={month}
          daysInMonth={dim}
          firstWeekday={firstWeekday}
          todayDay={todayDay}
          billCharges={mobileBillCharges}
          itemsByDay={itemsByDay}
          expenseDayTotals={dayTotals}
        />

        {/* Bill View — desktop: a chip per charge, since a day rarely has more
            than a couple of bills */}
        <div className="cal-bill card mt-4 hidden min-h-0 flex-1 flex-col overflow-hidden p-0 lg:flex">
          <div className="grid shrink-0 grid-cols-7 border-b border-line bg-surface-2/60">
            {WEEKDAYS.map((d) => (
              <div key={d} className="px-3 py-2.5 text-center text-xs font-semibold tracking-wider text-ink-3 uppercase">
                {d}
              </div>
            ))}
          </div>
          <div
            className="grid min-h-0 flex-1 grid-cols-7"
            style={{ gridTemplateRows: `repeat(${weeks}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: weeks * 7 }, (_, i) => {
              const day = i - firstWeekday + 1;
              const inMonth = day >= 1 && day <= dim;
              const isToday = inMonth && day === todayDay;
              const dayBills = inMonth ? (byDay.get(day) ?? []) : [];
              return (
                <div
                  key={i}
                  className={`flex min-h-0 flex-col overflow-hidden border-r border-b border-line-2 p-2.5 last:border-r-0 [&:nth-child(7n)]:border-r-0 ${
                    inMonth ? "" : "bg-bg/60"
                  } ${isToday ? "bg-forest/15" : !inMonth ? "" : "bg-surface-2/30"}`}
                >
                  {inMonth && (
                    <>
                      <div
                        className={`mb-1.5 shrink-0 text-right text-sm font-semibold ${
                          isToday
                            ? "text-accent"
                            : "text-ink-3"
                        }`}
                      >
                        {isToday ? `Today · ${day}` : day}
                      </div>
                      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
                        {dayBills.map(({ bill: b, date, hit }) => (
                          <CalendarBillChip
                            key={`${b.id}-${date}`}
                            name={b.name}
                            color={b.color ?? "var(--lime)"}
                            hit={hit}
                            accountName={b.color ? accountNameByColor.get(b.color) : undefined}
                            detail={`${formatCents(b.amountCents)}${hit ? " (hit)" : ""}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <ExpenseDayCalendar
          month={month}
          daysInMonth={dim}
          firstWeekday={firstWeekday}
          todayDay={todayDay}
          dayTotals={dayTotals}
          itemsByDay={itemsByDay}
        />
      </CalendarViewToggle>
    </div>
  );
}
