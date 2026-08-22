"use client";

import { updateMonthPlanAmount } from "@/app/actions";
import { AmountField } from "./amount-field";

// The dashboard's salary and savings figures, editable in place — the month
// plan has no settings form of its own any more.
export function EditablePlanAmount({
  month,
  field,
  cents,
  // savings is shown as an expense (negative) but stored positive
  negated = false,
  tone = "plain",
}: {
  month: string;
  field: "salaryMid" | "salaryEnd" | "savings";
  cents: number;
  negated?: boolean;
  tone?: "plain" | "neg" | "muted";
}) {
  const color = tone === "neg" ? "text-neg" : tone === "muted" ? "text-ink-3" : "text-ink";
  return (
    <AmountField
      cents={cents}
      color={color}
      negated={negated}
      // salary and savings are amounts, never debts — no sign to flip
      allowNegative={false}
      onCommit={(next) => updateMonthPlanAmount(month, field, next)}
    />
  );
}
