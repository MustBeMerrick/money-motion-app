"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  PiggyBank,
  ReceiptText,
  Settings,
} from "lucide-react";
import { Wordmark } from "./logo";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/bills", label: "Bills & Recurring", icon: ReceiptText },
  { href: "/piggy", label: "Piggy Bank", icon: PiggyBank },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/accounts", label: "Accounts", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 flex w-60 flex-col border-r border-line bg-surface/60 px-4 py-5">
      <Link href="/" className="px-2">
        <Wordmark />
      </Link>
      <nav className="mt-8 flex flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          // sections with subpages (e.g. /bills/monthly) keep their nav item lit
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-forest/25 text-lime"
                  : "text-ink-2 hover:bg-surface-2 hover:text-ink"
              }`}
            >
              <Icon size={17} strokeWidth={active ? 2.4 : 2} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto px-3 text-[11px] leading-relaxed text-ink-3">
        Private budget console.
        <br />
        Data lives in local SQLite.
      </div>
    </aside>
  );
}
