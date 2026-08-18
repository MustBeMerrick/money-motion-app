"use client";

import { useAccountColors } from "./account-colors-context";

// Bill colors are picked from an account's card color, so hovering the dot
// should surface which account it came from. A custom tooltip (rather than
// the native title attribute) shows instantly instead of after the
// browser's hover delay.
export function BillColorDot({ color }: { color?: string | null }) {
  const accounts = useAccountColors();
  const account = accounts.find((a) => a.color === color);

  return (
    <span className="group relative inline-flex shrink-0">
      <span
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={{ background: color ?? "var(--ink-3)" }}
      />
      {account && (
        <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 rounded-md border border-line-2 bg-surface-2 px-2 py-1 text-[11px] font-medium whitespace-nowrap text-ink opacity-0 shadow-lg group-hover:opacity-100">
          {account.name}
        </span>
      )}
    </span>
  );
}
