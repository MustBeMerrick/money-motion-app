"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { BillFrequency } from "@prisma/client";
import { BillForm } from "@/components/forms";

const TABS: { href: string; label: string; frequency: BillFrequency }[] = [
  { href: "/bills/weekly", label: "Weekly", frequency: "WEEKLY" },
  { href: "/bills/monthly", label: "Monthly", frequency: "MONTHLY" },
  { href: "/bills/annual", label: "Annual", frequency: "YEARLY" },
];

export function BillsNav({ subtitle }: { subtitle: string }) {
  const pathname = usePathname();
  // new bills default to the tab you're looking at
  const current = TABS.find((t) => pathname.startsWith(t.href)) ?? TABS[1];

  return (
    <div className="mb-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Bills &amp; Recurring</h1>
          <p className="mt-0.5 text-sm text-ink-2">{subtitle}</p>
        </div>
        {/* key: BillsNav survives tab navigation, so without a remount the
            form would keep the frequency it first mounted with */}
        <BillForm key={current.frequency} defaultFrequency={current.frequency} />
      </div>
      <nav className="mt-4 flex gap-1 border-b border-line">
        {TABS.map((tab) => {
          const active = tab.href === current.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                active
                  ? "border-lime text-lime"
                  : "border-transparent text-ink-2 hover:text-ink"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
