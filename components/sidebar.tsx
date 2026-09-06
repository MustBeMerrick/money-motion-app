"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  LogOut,
  PiggyBank,
  ReceiptText,
  Settings,
} from "lucide-react";
import { LogoMark, Wordmark } from "./logo";
import { AddTransactionFab } from "./transaction-form";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/bills", label: "Bills & Recurring", icon: ReceiptText },
  { href: "/piggy", label: "Piggy Bank", icon: PiggyBank },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/accounts", label: "Accounts", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings },
];

// On mobile, Bills, Piggy, Calendar and Accounts move to the bottom tab bar
// (see BottomNav below) so the drawer only needs the leftovers.
const MOBILE_MENU_NAV = NAV.filter((n) => n.href === "/" || n.href === "/settings");

const BOTTOM_NAV_LEFT = [
  { href: "/bills", label: "Bills", icon: ReceiptText },
  { href: "/piggy", label: "Piggy", icon: PiggyBank },
];
const BOTTOM_NAV_RIGHT = [
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/accounts", label: "Accounts", icon: CreditCard },
];

function NavLinks({
  items,
  pathname,
  onNavigate,
  // when set, each item eases in one after the next as the drawer opens
  stagger,
}: {
  items: typeof NAV;
  pathname: string;
  onNavigate?: () => void;
  stagger?: boolean;
}) {
  return (
    <>
      {items.map(({ href, label, icon: Icon }, i) => {
        // sections with subpages (e.g. /bills/monthly) keep their nav item lit
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            style={
              stagger === undefined
                ? undefined
                : {
                    // each row starts fully off the left edge (the drawer
                    // clips the overflow) and streaks in stretched + skewed,
                    // fading up fast so the travel itself is what you see.
                    // Opening rolls down the list; closing collapses at once.
                    transition:
                      "opacity 160ms ease-out, transform 620ms var(--ease-liquid), filter 260ms ease-out",
                    transitionDelay: stagger ? `${40 + i * 80}ms` : "0ms",
                    opacity: stagger ? 1 : 0,
                    transform: stagger
                      ? "none"
                      : "translateX(-115%) scaleX(1.3) skewX(-14deg)",
                    filter: stagger ? "blur(0px)" : "blur(2px)",
                  }
            }
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
    </>
  );
}

function BottomNavItem({
  href,
  label,
  icon: Icon,
  pathname,
}: {
  href: string;
  label: string;
  icon: typeof ReceiptText;
  pathname: string;
}) {
  const active = pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
        active ? "text-lime" : "text-ink-3"
      }`}
    >
      <Icon size={30} strokeWidth={active ? 2.4 : 2} />
      {label}
    </Link>
  );
}

function SignOut() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.replace("/login");
        router.refresh();
      }}
      className="flex cursor-pointer items-center gap-2 text-left text-[11px] font-medium text-ink-3 transition-colors hover:text-ink"
    >
      <LogOut size={13} />
      Sign out
    </button>
  );
}

/** Three bars that fold into an X — the app is called MoneyMotion. */
function MenuIcon({ open }: { open: boolean }) {
  const bar = "absolute left-0 block h-0.5 w-5 rounded-full bg-current transition-all duration-300 ease-out";
  return (
    <span className="relative block h-4 w-5">
      <span className={`${bar} ${open ? "top-1/2 -translate-y-1/2 rotate-45" : "top-0 rotate-0"}`} />
      <span
        className={`${bar} top-1/2 -translate-y-1/2 origin-left ${open ? "scale-x-0 opacity-0" : "scale-x-100 opacity-100"}`}
      />
      <span className={`${bar} ${open ? "top-1/2 -translate-y-1/2 -rotate-45" : "top-full -translate-y-full rotate-0"}`} />
    </span>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  // mobile drawer; a tap on a link closes it so the new page isn't hidden
  const [open, setOpen] = useState(false);

  // the login page is the one screen reachable without a session, so it
  // shows no navigation
  if (pathname === "/login") return null;

  return (
    <>
      {/* desktop: fixed left rail */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-line bg-surface/60 px-4 py-5 lg:flex">
        <Link href="/" className="px-2">
          <Wordmark />
        </Link>
        <AddTransactionFab label="Add Transaction" className="btn btn-primary mt-6 justify-center" />
        <nav className="mt-4 flex flex-col gap-1">
          <NavLinks items={NAV} pathname={pathname} />
        </nav>
        <div className="mt-auto flex flex-col gap-3 px-3 text-[11px] leading-relaxed text-ink-3">
          <SignOut />
          <span>
            Private budget console.
            <br />
            Data lives in local SQLite.
          </span>
        </div>
      </aside>

      {/* mobile: the same nav collapsed into a top bar + hamburger drawer */}
      <header className="sticky top-0 z-50 border-b border-line bg-surface/95 backdrop-blur lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <LogoMark size={30} />
            <span className="text-base font-bold tracking-tight">MoneyMotion</span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className={`-mr-1 cursor-pointer rounded-lg p-2 transition-colors duration-300 active:scale-90 ${
              open ? "bg-forest/25 text-lime" : "text-ink-2 hover:bg-surface-2 hover:text-ink"
            }`}
          >
            <MenuIcon open={open} />
          </button>
        </div>
        <nav
          inert={!open}
          className={`overflow-hidden transition-[max-height] duration-[420ms] ease-[var(--ease-liquid)] ${
            open ? "max-h-[28rem]" : "max-h-0"
          }`}
        >
          <div className="flex flex-col gap-1 border-t border-line px-3 pt-2 pb-3">
            <NavLinks
              items={MOBILE_MENU_NAV}
              pathname={pathname}
              onNavigate={() => setOpen(false)}
              stagger={open}
            />
            <div className="mt-1 border-t border-line px-3 pt-3">
              <SignOut />
            </div>
          </div>
        </nav>
      </header>

      {/* mobile: bottom tab bar — Bills & Piggy on the left, Calendar &
          Accounts on the right, flanking the Add Transaction FAB, which
          pokes up above the bar so it still reads as the primary action */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-20 items-stretch border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="flex flex-1 justify-evenly">
          {BOTTOM_NAV_LEFT.map((item) => (
            <BottomNavItem key={item.href} pathname={pathname} {...item} />
          ))}
        </div>
        <div className="relative flex w-20 items-center justify-center">
          <AddTransactionFab className="absolute -top-7 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-forest to-lime text-[#08130a] shadow-lg shadow-black/40" />
        </div>
        <div className="flex flex-1 justify-evenly">
          {BOTTOM_NAV_RIGHT.map((item) => (
            <BottomNavItem key={item.href} pathname={pathname} {...item} />
          ))}
        </div>
      </nav>
    </>
  );
}
