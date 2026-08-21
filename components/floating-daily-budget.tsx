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
  // dashboard already shows it inline; calendar fills the whole viewport
  // and has no room for a floating overlay
  if (pathname === "/" || pathname === "/login" || pathname.startsWith("/calendar")) return null;

  return (
    <div
      key={pathname}
      className="card fixed right-3 bottom-3 z-40 w-auto rounded-full px-3.5 py-2 bg-gradient-to-br from-surface to-forest/20 shadow-lg shadow-black/40 lg:top-7 lg:right-8 lg:bottom-auto lg:w-56 lg:rounded-2xl lg:p-5"
      style={{ animation: "slide-in-corner 300ms ease-out" }}
    >
      <h2 className="card-title hidden lg:flex">Daily Budget</h2>
      <div className="flex items-baseline gap-2">
        <div className="text-base font-bold text-accent tabular-nums lg:text-2xl">
          {formatCents(dailyBudgetCents)}
        </div>
        <span className="text-[10px] font-medium text-ink-3 lg:hidden">/day</span>
        {tomorrowBudgetCents !== null && (
          <div
            className="hidden text-sm font-semibold text-ink-3 tabular-nums lg:block"
            title="Tomorrow's daily budget"
          >
            {formatCents(tomorrowBudgetCents)}
          </div>
        )}
      </div>
      <p className="mt-2 hidden text-xs text-ink-2 lg:block">
        Available / day · <Money cents={plannedNetCents} tone="plain" className="text-xs" /> left
      </p>
    </div>
  );
}
