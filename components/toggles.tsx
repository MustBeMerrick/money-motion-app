"use client";

import { useRef, useState } from "react";
import { Check } from "lucide-react";
import { setBillStatus, setBillStatusForMonth, setSalaryReceived } from "@/app/actions";
import { useScheduleRefresh } from "@/lib/refresh-context";
import { useServerValue } from "./use-server-value";
import type { OccurrenceStatus } from "@/lib/core/month";

function CheckBox({
  checked,
  onToggle,
  label,
}: {
  checked: boolean;
  onToggle: (next: boolean) => unknown;
  label: string;
}) {
  const [shown, save] = useServerValue(checked);
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={shown}
      onClick={() => save(!shown, () => onToggle(!shown))}
      className={`flex h-5 w-5 cursor-pointer items-center justify-center rounded-md border transition-colors ${
        shown
          ? "border-lime bg-gradient-to-br from-forest to-lime text-[#08130a]"
          : "border-line-2 bg-bg hover:border-lime/60"
      }`}
    >
      {shown && <Check size={13} strokeWidth={3.5} />}
    </button>
  );
}

/** A single charge's checkbox — used by monthly and yearly bills. */
export function BillCheck({
  billId,
  date,
  field,
  checked,
  billName,
}: {
  billId: string;
  date: string;
  field: "hit" | "paid";
  checked: boolean;
  billName: string;
}) {
  return (
    <CheckBox
      checked={checked}
      label={`${billName} ${field}`}
      onToggle={(next) => setBillStatus(billId, date, field, next)}
    />
  );
}

/**
 * One chip per charge, labelled with the day of the month. A weekly bill is
 * charged four or five times, so each is ticked off separately; the count on
 * the right summarises progress and toggles them all at once.
 */
export function OccurrenceChips({
  billId,
  billName,
  field,
  occurrences,
  showMarkAll = true,
}: {
  billId: string;
  billName: string;
  field: "hit" | "paid";
  occurrences: OccurrenceStatus[];
  showMarkAll?: boolean;
}) {
  const scheduleRefresh = useScheduleRefresh();
  // Chips paint on tap and the counter follows them, so a tap lands without
  // waiting for the server to write and re-render. What we ticked outlives the
  // action's promise, since a resolved action whose refresh has not landed yet
  // would otherwise repaint the chip unticked.
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());

  // Retire optimistic chips one at a time, each when the server reports back
  // the value that chip sent. Clearing the whole map on any change to this
  // bill -- which is what a signature check does -- is wrong while several
  // taps are in flight: the refresh answering the first tap carries the
  // second chip's *old* value, so it dropped a still-correct optimistic chip
  // and visibly un-ticked it until the next refresh put it back.
  const settled = occurrences.filter((o) => o.date in pending && pending[o.date] === o[field]);
  if (settled.length > 0) {
    setPending((p) => {
      const next = { ...p };
      for (const o of settled) delete next[o.date];
      return next;
    });
  }

  const shownOccurrences = occurrences.map((o) =>
    o.date in pending ? { ...o, [field]: pending[o.date] } : o,
  );

  function save(dates: string[], value: boolean, write: () => Promise<void>) {
    setPending((p) => ({ ...p, ...Object.fromEntries(dates.map((d) => [d, value])) }));
    // Writes for this bill go one at a time. Firing them concurrently -- which
    // is what tapping the same chip twice quickly does -- leaves the order the
    // upserts commit in up to chance, so the row can end up holding the older
    // tap's value while the screen shows the newer one.
    queueRef.current = queueRef.current
      .then(write)
      .then(
        // Not wrapped in startTransition: that would put the whole re-render --
        // this chip, the row totals, the daily budget in the layout -- on a
        // deferrable lane React is free to leave uncommitted. A refresh is a
        // router update instead, which always lands.
        () => scheduleRefresh(),
        () => setPending({}),
      );
  }

  const done = shownOccurrences.filter((o) => o[field]).length;
  const allDone = done === shownOccurrences.length && shownOccurrences.length > 0;

  if (occurrences.length === 0) return <span className="text-ink-3">—</span>;

  return (
    <span className="flex items-center justify-center gap-1">
      {shownOccurrences.map((o) => {
        const on = o[field];
        return (
          <button
            key={o.date}
            type="button"
            title={`${billName} — ${o.date} ${field}`}
            aria-label={`${billName} ${o.date} ${field}`}
            aria-pressed={on}
            onClick={() =>
              save([o.date], !on, () => setBillStatus(billId, o.date, field, !on))
            }
            className={`h-5 w-5 cursor-pointer rounded border text-[9px] font-semibold tabular-nums transition-colors ${
              on
                ? "border-lime bg-gradient-to-br from-forest to-lime text-[#08130a]"
                : "border-line-2 bg-bg text-ink-3 hover:border-lime/60"
            }`}
          >
            {Number(o.date.slice(8, 10))}
          </button>
        );
      })}
      {showMarkAll && (
        <button
          type="button"
          title={allDone ? "Clear all" : "Mark all"}
          onClick={() => {
            const dates = shownOccurrences.map((o) => o.date);
            save(dates, !allDone, () =>
              setBillStatusForMonth(billId, dates, field, !allDone),
            );
          }}
          className={`ml-0.5 cursor-pointer rounded px-1 text-[10px] font-semibold tabular-nums transition-colors hover:text-lime ${
            allDone ? "text-lime" : "text-ink-3"
          }`}
        >
          {done}/{occurrences.length}
        </button>
      )}
    </span>
  );
}

export function SalaryReceivedToggle({
  month,
  which,
  received,
}: {
  month: string;
  which: "mid" | "end";
  received: boolean;
}) {
  return (
    <CheckBox
      checked={received}
      label={`${which === "mid" ? "Mid-month" : "End-of-month"} salary received`}
      onToggle={(next) => setSalaryReceived(month, which, next)}
    />
  );
}
