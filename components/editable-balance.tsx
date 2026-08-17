"use client";

import { useState, useTransition } from "react";
import { updateAccountBalance } from "@/app/actions";
import { formatCents, parseDollarsToCents } from "@/lib/core/money";

export function EditableBalance({
  accountId,
  cents,
  className = "",
}: {
  accountId: string;
  cents: number;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [pending, startTransition] = useTransition();

  function commit() {
    const parsed = parseDollarsToCents(value);
    setEditing(false);
    if (parsed === null || parsed === cents) return;
    startTransition(() => updateAccountBalance(accountId, parsed));
  }

  if (editing) {
    return (
      <input
        autoFocus
        className="input w-28 px-2 py-0.5 text-right text-sm"
        defaultValue={(cents / 100).toFixed(2)}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
        }}
      />
    );
  }

  const color = cents > 0 ? "text-pos" : cents < 0 ? "text-neg" : "text-ink-3";
  return (
    <button
      type="button"
      title="Click to edit balance"
      onClick={() => {
        setValue((cents / 100).toFixed(2));
        setEditing(true);
      }}
      className={`cursor-pointer rounded px-1 font-semibold tabular-nums transition-colors hover:bg-surface-2 ${color} ${pending ? "opacity-50" : ""} ${className}`}
    >
      {formatCents(cents)}
    </button>
  );
}
