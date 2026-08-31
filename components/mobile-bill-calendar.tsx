"use client";

import { useState } from "react";
import { formatCents } from "@/lib/core/money";
import type { DayTotals } from "./expense-day-calendar";
import { TransactionList, type LedgerRow } from "./transaction-list";

export type MobileBillCharge = {
  key: string;
  name: string;
  amountCents: number;
  hit: boolean;
  color: string;
  accountName?: string;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
// cell totals are whole dollars — cents don't fit in a 50px column
function compactDollars(cents: number): string {
  return `${cents < 0 ? "-" : ""}$${Math.round(Math.abs(cents) / 100).toLocaleString("en-US")}`;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// Apple-Calendar-shaped month grid: compact numbered cells with the day's
// total underneath, and a tapped day expanding into an Expense-style list
// below the grid rather than trying to fit names inside a ~50px cell.
//
// Bill View and Expense View share this one grid and one "selected day"
// pointer -- both datasets are always rendered, marked .cal-bill/.cal-expense
// so CalendarViewToggle's CSS can show just the active one (see globals.css).
export function MobileBillCalendar({
  month,
  daysInMonth,
  firstWeekday,
  todayDay,
  billCharges,
  itemsByDay,
  expenseDayTotals,
}: {
  month: string; // YYYY-MM
  daysInMonth: number;
  firstWeekday: number;
  todayDay: number | null;
  billCharges: Record<number, MobileBillCharge[]>;
  // same sorted/reimbursement-pinned rows and TransactionList the desktop
  // Expense View day panel uses, so both surfaces match exactly
  itemsByDay: Record<number, LedgerRow[]>;
  // pre-summed expense/income per day, for the compact grid cell
  expenseDayTotals: Record<number, DayTotals>;
}) {
  const [selected, setSelected] = useState<number | null>(todayDay);
  const weeks = Math.ceil((firstWeekday + daysInMonth) / 7);
  const [y, m] = month.split("-").map(Number);

  const dayBills = selected ? (billCharges[selected] ?? []) : [];
  const dayBillTotal = dayBills.reduce((sum, c) => sum + c.amountCents, 0);
  // what's still to come — hit charges are already inside the card balance
  const dayBillRemaining = dayBills.reduce((sum, c) => (c.hit ? sum : sum + c.amountCents), 0);

  const dayItems = selected ? (itemsByDay[selected] ?? []) : [];

  return (
    <div className="lg:hidden">
      <div className="card overflow-hidden p-0">
        <div className="grid grid-cols-7 border-b border-line bg-surface-2/60">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-2 text-center text-[11px] font-semibold text-ink-3">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: weeks * 7 }, (_, i) => {
            const day = i - firstWeekday + 1;
            const inMonth = day >= 1 && day <= daysInMonth;
            if (!inMonth) return <div key={i} className="h-14" />;

            const billList = billCharges[day] ?? [];
            const firstBill = billList[0];
            const billLines = billList.length === 0 ? 0 : billList.length > 1 ? 2 : 1;

            const dayTotals = expenseDayTotals[day];
            const hasExpense = !!dayTotals?.expenseCents;
            const hasIncome = !!dayTotals?.incomeCents;
            const expenseLines = (hasExpense ? 1 : 0) + (hasIncome ? 1 : 0);

            const isToday = day === todayDay;
            const isSelected = day === selected;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setSelected(day)}
                className={`flex h-14 cursor-pointer flex-col items-center gap-0.5 pt-1.5 ${
                  isToday ? "bg-forest/20" : ""
                }`}
              >
                <span
                  className={`flex size-7 items-center justify-center rounded-full text-sm font-semibold ${
                    isSelected
                      ? "bg-lime text-[#08130a]"
                      : isToday
                        ? "text-accent"
                        : "text-ink-1"
                  }`}
                >
                  {day}
                </span>
                {firstBill && (
                  <span
                    className={`cal-bill w-full truncate px-1 text-[10px] leading-tight font-semibold ${
                      firstBill.hit ? "text-ink-3 line-through" : "text-lime"
                    }`}
                  >
                    {firstBill.name}
                  </span>
                )}
                {billList.length > 1 && (
                  <span className="cal-bill text-[10px] leading-tight text-ink-3">+{billList.length - 1} more</span>
                )}
                {hasExpense && (
                  <span className="cal-expense text-[10px] leading-tight font-semibold tabular-nums text-neg">
                    {compactDollars(-dayTotals.expenseCents)}
                  </span>
                )}
                {hasIncome && (
                  <span className="cal-expense text-[10px] leading-tight font-semibold tabular-nums text-pos">
                    {compactDollars(dayTotals.incomeCents)}
                  </span>
                )}
                {/* a marker line keeps every cell the same height whether or not
                    it has anything, so rows don't jump when months change */}
                {billLines <= 1 && expenseLines <= 1 && (
                  <span className="text-[10px] leading-tight text-transparent">·</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selected && (
        <div className="card mt-3 p-0">
          <div className="flex items-baseline justify-between border-b border-line px-4 py-3">
            <div className="text-sm text-ink-2">
              {MONTHS[m - 1]} {selected}, {y}
              {selected === todayDay && <span className="ml-2 text-accent">Today</span>}
            </div>
            <div className="cal-bill text-sm font-semibold tabular-nums">
              {dayBills.length > 0 ? formatCents(dayBillTotal) : "—"}
            </div>
          </div>

          <div className="cal-bill">
            {dayBills.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-ink-3">No bills due.</div>
            ) : (
              <>
                <div className="divide-y divide-line/60">
                  {dayBills.map((c) => (
                    <div key={c.key} className="flex items-center gap-3 px-4 py-3">
                      <span
                        className="size-8 shrink-0 rounded-full"
                        style={{ background: `color-mix(in srgb, ${c.color} 45%, transparent)` }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className={`truncate font-medium ${c.hit ? "text-ink-2 line-through" : ""}`}>
                          {c.name}
                        </div>
                        {c.accountName && <div className="truncate text-xs text-ink-3">{c.accountName}</div>}
                      </div>
                      <div
                        className={`shrink-0 font-semibold tabular-nums ${
                          c.hit ? "text-ink-3 line-through" : "text-lime"
                        }`}
                      >
                        {formatCents(c.amountCents)}
                      </div>
                    </div>
                  ))}
                </div>
                {dayBillRemaining !== dayBillTotal && (
                  <div className="border-t border-line px-4 py-2.5 text-xs text-ink-3">
                    {formatCents(dayBillRemaining)} still to hit the card
                  </div>
                )}
              </>
            )}
          </div>

          <div className="cal-expense px-4 py-3">
            <TransactionList
              rows={dayItems}
              hideDate
              hideCategoryLabel
              colorByKind
              emptyMessage="No expenses or income logged on this day."
            />
          </div>
        </div>
      )}
    </div>
  );
}
