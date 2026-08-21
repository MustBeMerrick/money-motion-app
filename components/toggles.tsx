"use client";

import { useOptimistic, useTransition } from "react";
import { Check } from "lucide-react";
import { setBillStatus, setBillStatusForMonth, setSalaryReceived } from "@/app/actions";
import type { OccurrenceStatus } from "@/lib/core/month";

function CheckBox({
  checked,
  onToggle,
  label,
}: {
  checked: boolean;
  onToggle: (next: boolean) => void;
  label: string;
}) {
  const [, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic(checked);
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={shown}
      onClick={() =>
        startTransition(async () => {
          setShown(!shown);
          await onToggle(!shown);
        })
      }
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
  const [, startTransition] = useTransition();
  // chips paint optimistically and the counter follows them, so a tap lands
  // without waiting for the server to write and re-render
  const [shownOccurrences, applyOptimistic] = useOptimistic(
    occurrences,
    (state, patch: { dates: string[]; value: boolean }) =>
      state.map((o) =>
        patch.dates.includes(o.date) ? { ...o, [field]: patch.value } : o,
      ),
  );
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
              startTransition(async () => {
                applyOptimistic({ dates: [o.date], value: !on });
                await setBillStatus(billId, o.date, field, !on);
              })
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
            startTransition(async () => {
              applyOptimistic({ dates, value: !allDone });
              await setBillStatusForMonth(billId, dates, field, !allDone);
            });
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
