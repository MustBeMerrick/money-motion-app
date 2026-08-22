"use client";

import { updateAccountBalance } from "@/app/actions";
import { AmountField } from "./amount-field";

export function EditableBalance({
  accountId,
  cents,
  className = "",
}: {
  accountId: string;
  cents: number;
  className?: string;
}) {
  const color = cents > 0 ? "text-pos" : cents < 0 ? "text-neg" : "text-ink-3";
  return (
    <AmountField
      cents={cents}
      color={color}
      className={className}
      onCommit={(next) => updateAccountBalance(accountId, next)}
    />
  );
}
