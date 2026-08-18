"use client";

import { useTransition } from "react";
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
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={checked}
      disabled={pending}
      onClick={() => startTransition(() => onToggle(!checked))}
      className={`flex h-5 w-5 cursor-pointer items-center justify-center rounded-md border transition-colors ${
        checked
          ? "border-lime bg-gradient-to-br from-forest to-lime text-[#08130a]"
          : "border-line-2 bg-bg hover:border-lime/60"
      } ${pending ? "opacity-50" : ""}`}
    >
      {checked && <Check size={13} strokeWidth={3.5} />}
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
  const [pending, startTransition] = useTransition();
  const done = occurrences.filter((o) => o[field]).length;
  const allDone = done === occurrences.length && occurrences.length > 0;

  if (occurrences.length === 0) return <span className="text-ink-3">—</span>;

  return (
    <span className="flex items-center justify-center gap-1">
      {occurrences.map((o) => {
        const on = o[field];
        return (
          <button
            key={o.date}
            type="button"
            title={`${billName} — ${o.date} ${field}`}
            aria-label={`${billName} ${o.date} ${field}`}
            aria-pressed={on}
            disabled={pending}
            onClick={() =>
              startTransition(() => setBillStatus(billId, o.date, field, !on))
            }
            className={`h-5 w-5 cursor-pointer rounded border text-[9px] font-semibold tabular-nums transition-colors ${
              on
                ? "border-lime bg-gradient-to-br from-forest to-lime text-[#08130a]"
                : "border-line-2 bg-bg text-ink-3 hover:border-lime/60"
            } ${pending ? "opacity-50" : ""}`}
          >
            {Number(o.date.slice(8, 10))}
          </button>
        );
      })}
      {showMarkAll && (
        <button
          type="button"
          title={allDone ? "Clear all" : "Mark all"}
          disabled={pending}
          onClick={() =>
            startTransition(() =>
              setBillStatusForMonth(
                billId,
                occurrences.map((o) => o.date),
                field,
                !allDone,
              ),
            )
          }
          className={`ml-0.5 cursor-pointer rounded px-1 text-[10px] font-semibold tabular-nums transition-colors hover:text-lime ${
            allDone ? "text-lime" : "text-ink-3"
          } ${pending ? "opacity-50" : ""}`}
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
    <span className="inline-flex items-center gap-1.5">
      <CheckBox
        checked={received}
        label={`${which === "mid" ? "Mid-month" : "End-of-month"} salary received`}
        onToggle={(next) => setSalaryReceived(month, which, next)}
      />
      <span className="text-[11px] text-ink-3">received</span>
    </span>
  );
}
