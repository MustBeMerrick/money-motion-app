"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { formatCents } from "@/lib/core/money";
import { TransactionList, type LedgerRow } from "@/components/transaction-list";

export type DayTotals = { expenseCents: number; incomeCents: number };

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// Desktop Expense View: a chip per transaction got unreadable once a real
// import logs a dozen+ charges on one day. Pocket Expense's month view (a
// tally per day, click a day for an itemized list) scales to that density --
// this mirrors it, reusing the same TransactionList/LedgerRow the
// per-account ledger uses so delete-from-the-calendar comes for free.
//
// The day panel is a sibling in the same flex row, not an overlay: opening it
// shrinks the grid's width (via min-w-0 on the grid column) rather than
// covering Fri/Sat under a fixed panel, so every day column stays visible.
export function ExpenseDayCalendar({
  month,
  daysInMonth,
  firstWeekday,
  todayDay,
  dayTotals,
  itemsByDay,
}: {
  month: string; // YYYY-MM
  daysInMonth: number;
  firstWeekday: number;
  todayDay: number | null;
  dayTotals: Record<number, DayTotals>;
  itemsByDay: Record<number, LedgerRow[]>;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const weeks = Math.ceil((firstWeekday + daysInMonth) / 7);
  const [y, m] = month.split("-").map(Number);

  const selectedRows = selected ? (itemsByDay[selected] ?? []) : [];

  useEffect(() => {
    if (selected === null) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelected(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  return (
    // same structure/classes as the Bill View grid card in app/calendar/page.tsx
    // (including the min-h-0 on the inner grid, without which a row sizes to
    // its content instead of its fair 1fr share) so the two views match pixel
    // for pixel when toggled -- just a row instead of a column, so the day
    // panel can sit alongside the grid rather than under it.
    <div className="cal-expense card mt-4 hidden min-h-0 flex-1 overflow-hidden p-0 lg:flex">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="grid shrink-0 grid-cols-7 border-b border-line bg-surface-2/60">
          {WEEKDAYS.map((d) => (
            <div key={d} className="truncate px-2 py-2.5 text-center text-xs font-semibold tracking-wider text-ink-3 uppercase">
              {d}
            </div>
          ))}
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-7" style={{ gridTemplateRows: `repeat(${weeks}, minmax(0, 1fr))` }}>
          {Array.from({ length: weeks * 7 }, (_, i) => {
            const day = i - firstWeekday + 1;
            const inMonth = day >= 1 && day <= daysInMonth;
            if (!inMonth) {
              return (
                <div
                  key={i}
                  className="border-r border-b border-line-2 bg-bg/60 last:border-r-0 [&:nth-child(7n)]:border-r-0"
                />
              );
            }
            const totals = dayTotals[day];
            const isToday = day === todayDay;
            const isSelected = day === selected;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setSelected(day === selected ? null : day)}
                className={`flex min-w-0 cursor-pointer flex-col items-end gap-1 overflow-hidden border-r border-b border-line-2 p-2 text-right last:border-r-0 [&:nth-child(7n)]:border-r-0 ${
                  isSelected ? "bg-lime/10" : isToday ? "bg-forest/15" : "bg-surface-2/30 hover:bg-surface-2/60"
                }`}
              >
                <span className={`text-sm font-semibold ${isToday ? "text-accent" : "text-ink-3"}`}>{day}</span>
                {!!totals?.expenseCents && (
                  <span className="truncate text-xs font-semibold tabular-nums text-neg">{formatCents(-totals.expenseCents)}</span>
                )}
                {!!totals?.incomeCents && (
                  <span className="truncate text-xs font-semibold tabular-nums text-pos">{formatCents(totals.incomeCents)}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div
        className={`flex min-h-0 shrink-0 flex-col overflow-hidden border-l border-line-2 bg-surface transition-[width] duration-300 ${
          selected !== null ? "w-[26rem]" : "w-0"
        }`}
      >
        {selected !== null && (
          <div className="flex h-full w-[26rem] flex-col">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-5 py-4">
              <h3 className="text-base font-bold">
                {MONTHS[m - 1]} {selected}, {y}
              </h3>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setSelected(null)}
                className="cursor-pointer rounded-md p-1 text-ink-3 hover:bg-surface-2 hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
              <TransactionList
                rows={selectedRows}
                hideDate
                hideCategoryLabel
                colorByKind
                emptyMessage="No expenses or income logged on this day."
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
