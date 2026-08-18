"use client";

import { usePathname } from "next/navigation";
import { formatCents } from "@/lib/core/money";
import { Money } from "@/components/ui";

// Shown inline on the dashboard already, so this floating copy only
// appears once you've navigated away from it — it's meant to stay in view
// as a live readout while you tick bills, adjust buckets, etc. elsewhere.
// Keying on pathname remounts the card on every navigation, replaying the
// slide-in animation each time it (re)appears.
export function FloatingDailyBudget({
  dailyBudgetCents,
  tomorrowBudgetCents,
  plannedNetCents,
}: {
  dailyBudgetCents: number;
  tomorrowBudgetCents: number | null;
  plannedNetCents: number;
}) {
  const pathname = usePathname();
  if (pathname === "/") return null;

  return (
    <div
      key={pathname}
      className="card fixed top-7 right-8 z-50 w-56 bg-gradient-to-br from-surface to-forest/20 shadow-lg shadow-black/30"
      style={{ animation: "slide-in-corner 300ms ease-out" }}
    >
      <h2 className="card-title">Daily Budget</h2>
      <div className="flex items-baseline gap-2">
        <div className="text-2xl font-bold text-accent tabular-nums">{formatCents(dailyBudgetCents)}</div>
        {tomorrowBudgetCents !== null && (
          <div className="text-sm font-semibold text-ink-3 tabular-nums" title="Tomorrow's daily budget">
            {formatCents(tomorrowBudgetCents)}
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-ink-2">
        Available / day · <Money cents={plannedNetCents} tone="plain" className="text-xs" /> left
      </p>
    </div>
  );
}
