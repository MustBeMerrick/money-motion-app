"use client";

import { useState } from "react";

// One control for both calendars: rather than threading a flag through the
// server-rendered desktop grid and the client mobile grid, it flips a data
// attribute on the wrapper and CSS hides everything marked as an in-cell bill
// (.cal-bill). The day list under the mobile calendar is deliberately not
// marked, so it keeps showing the bills for whichever day is selected.
export function BillViewFrame({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState(true);

  return (
    <div data-bills={show ? "on" : "off"} className="flex min-h-0 flex-1 flex-col">
      <button
        type="button"
        role="switch"
        aria-checked={show}
        onClick={() => setShow(!show)}
        className={`mb-3 inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
          show
            ? "border-lime bg-lime/10 text-ink"
            : "border-line-2 bg-surface-2 text-ink-3 hover:border-lime/50"
        }`}
      >
        <span
          className={`flex size-4 items-center justify-center rounded-full border transition-colors ${
            show ? "border-lime" : "border-line-2"
          }`}
        >
          {show && <span className="size-2 rounded-full bg-lime" />}
        </span>
        Bill View
      </button>
      {children}
    </div>
  );
}
