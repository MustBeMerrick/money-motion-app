"use client";

import { useState } from "react";
import { formatCents } from "@/lib/core/money";

export type MobileCharge = {
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
  return `$${Math.round(cents / 100).toLocaleString("en-US")}`;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// Apple-Calendar-shaped month grid: compact numbered cells with the day's
// total underneath, and a tapped day expanding into an Expense-style list
// below the grid rather than trying to fit bill names inside a ~50px cell.
export function MobileBillCalendar({
  month,
  daysInMonth,
  firstWeekday,
  todayDay,
  charges,
}: {
  month: string; // YYYY-MM
  daysInMonth: number;
  firstWeekday: number;
  todayDay: number | null;
  charges: Record<number, MobileCharge[]>;
}) {
  const [selected, setSelected] = useState<number | null>(todayDay);
  const weeks = Math.ceil((firstWeekday + daysInMonth) / 7);
  const [y, m] = month.split("-").map(Number);

  const dayCharges = selected ? (charges[selected] ?? []) : [];
  const dayTotal = dayCharges.reduce((sum, c) => sum + c.amountCents, 0);
  // what's still to come — hit charges are already inside the card balance
  const dayRemaining = dayCharges.reduce((sum, c) => (c.hit ? sum : sum + c.amountCents), 0);

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

            const dayList = charges[day] ?? [];
            const total = dayList.reduce((sum, c) => sum + c.amountCents, 0);
            const allHit = dayList.length > 0 && dayList.every((c) => c.hit);
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
                {dayList.length > 0 && (
                  <span
                    className={`cal-bill text-[10px] leading-tight font-semibold tabular-nums ${
                      allHit ? "text-ink-3 line-through" : "text-lime"
                    }`}
                  >
                    {compactDollars(total)}
                  </span>
                )}
                {/* a second marker line keeps every cell the same height whether
                    or not it has bills, so rows don't jump when months change */}
                {dayList.length > 1 && (
                  <span className="cal-bill text-[10px] leading-tight text-ink-3">+{dayList.length - 1} more</span>
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
            <div className="text-sm font-semibold tabular-nums">
              {dayCharges.length > 0 ? formatCents(dayTotal) : "—"}
            </div>
          </div>
          {dayCharges.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-ink-3">No bills due.</div>
          ) : (
            <>
              <div className="divide-y divide-line/60">
                {dayCharges.map((c) => (
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
              {dayRemaining !== dayTotal && (
                <div className="border-t border-line px-4 py-2.5 text-xs text-ink-3">
                  {formatCents(dayRemaining)} still to hit the card
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
