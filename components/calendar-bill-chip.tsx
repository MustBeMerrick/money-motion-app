"use client";

import { useRef, useState } from "react";

// Fixed positioning (rather than an absolutely-positioned tooltip) escapes
// the calendar's overflow-hidden day cells, and appears on mouseenter with
// no artificial delay.
export function CalendarBillChip({
  name,
  color,
  hit,
  accountName,
  detail,
}: {
  name: string;
  color: string;
  hit: boolean;
  accountName?: string;
  detail: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  function show() {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    setPos({ top: rect.top, left: rect.left });
  }

  return (
    <>
      <div
        ref={ref}
        onMouseEnter={show}
        onMouseLeave={() => setPos(null)}
        className={`cal-bill shrink-0 truncate rounded px-1.5 py-1 text-xs font-semibold ${hit ? "line-through opacity-60" : ""}`}
        style={{
          color: `color-mix(in srgb, ${color} 40%, white)`,
          background: `color-mix(in srgb, ${color} 32%, transparent)`,
        }}
      >
        {name}
      </div>
      {pos && (
        <div
          className="pointer-events-none fixed z-50 -translate-y-full rounded-md border border-line-2 bg-surface-2 px-2 py-1 text-[11px] font-medium whitespace-nowrap text-ink shadow-lg"
          style={{ top: pos.top - 6, left: pos.left }}
        >
          {accountName && <div className="font-semibold">{accountName}</div>}
          <div className={accountName ? "text-ink-3" : ""}>{detail}</div>
        </div>
      )}
    </>
  );
}
