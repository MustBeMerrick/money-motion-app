"use client";

import { useState } from "react";

export type CalendarView = "bills" | "expenses";

// One control for the whole calendar: rather than threading the active view
// through the server-rendered desktop grid and the client mobile grid, it
// sets a data attribute on the wrapper and CSS hides whichever dataset
// (.cal-bill / .cal-expense) isn't the current view. Exactly one view is
// ever showing -- there's no "both" or "neither" state.
export function CalendarViewToggle({
  header,
  children,
}: {
  // rendered inside the data-view scope, above the toggle buttons -- lets the
  // page's own header (title + per-view stats) react to the active view via
  // the same .cal-bill/.cal-expense CSS switch as everything else here
  header?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [view, setView] = useState<CalendarView>("bills");

  return (
    <div data-view={view} className="flex min-h-0 flex-1 flex-col">
      {header}
      <div className="mb-3 flex w-fit gap-1 rounded-lg border border-line-2 bg-surface-2 p-1">
        {(
          [
            { value: "bills", label: "Bill View" },
            { value: "expenses", label: "Expense View" },
          ] as const
        ).map((v) => (
          <button
            key={v.value}
            type="button"
            role="radio"
            aria-checked={view === v.value}
            onClick={() => setView(v.value)}
            className={`cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              view === v.value ? "bg-lime/15 text-lime" : "text-ink-3 hover:text-ink"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>
      {children}
    </div>
  );
}
