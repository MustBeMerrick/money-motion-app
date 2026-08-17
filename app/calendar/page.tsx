import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getBillsWithStatus } from "@/lib/data";
import {
  addMonths,
  daysInMonth,
  monthLabel,
  monthOf,
  todayIso,
  type IsoMonth,
} from "@/lib/core/dates";
import { billMonthlyCostCents } from "@/lib/core/month";
import { formatCents } from "@/lib/core/money";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const params = await searchParams;
  const today = todayIso();
  const month: IsoMonth = /^\d{4}-\d{2}$/.test(params.m ?? "") ? params.m! : monthOf(today);

  const bills = await getBillsWithStatus(month);
  const dim = daysInMonth(month);
  const [y, m] = month.split("-").map(Number);
  const firstWeekday = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const weeks = Math.ceil((firstWeekday + dim) / 7);
  const todayDay = monthOf(today) === month ? Number(today.slice(8, 10)) : null;

  // one entry per charge, so a weekly bill appears on each of its dates and
  // each is struck through independently once that charge has hit
  type Charge = { bill: (typeof bills)[number]; date: string; hit: boolean };
  const byDay = new Map<number, Charge[]>();
  for (const bill of bills) {
    for (const o of bill.occurrences) {
      const day = Number(o.date.slice(8, 10));
      byDay.set(day, [...(byDay.get(day) ?? []), { bill, date: o.date, hit: o.hit }]);
    }
  }
  const monthTotal = bills.reduce((sum, b) => sum + billMonthlyCostCents(b, month), 0);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Bill Calendar"
        subtitle={`${bills.length} bills · ${formatCents(monthTotal)} due in ${monthLabel(month)}`}
        action={
          <div className="flex items-center gap-2">
            <Link href={`/calendar?m=${addMonths(month, -1)}`} className="btn px-2" aria-label="Previous month">
              <ChevronLeft size={16} />
            </Link>
            <span className="w-40 text-center text-sm font-semibold">{monthLabel(month)}</span>
            <Link href={`/calendar?m=${addMonths(month, 1)}`} className="btn px-2" aria-label="Next month">
              <ChevronRight size={16} />
            </Link>
          </div>
        }
      />

      <div className="card overflow-hidden p-0">
        <div className="grid grid-cols-7 border-b border-line bg-surface-2/60">
          {WEEKDAYS.map((d) => (
            <div key={d} className="px-3 py-2 text-center text-[11px] font-semibold tracking-wider text-ink-3 uppercase">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: weeks * 7 }, (_, i) => {
            const day = i - firstWeekday + 1;
            const inMonth = day >= 1 && day <= dim;
            const isToday = inMonth && day === todayDay;
            const dayBills = inMonth ? (byDay.get(day) ?? []) : [];
            return (
              <div
                key={i}
                className={`min-h-24 border-r border-b border-line/60 p-2 last:border-r-0 [&:nth-child(7n)]:border-r-0 ${
                  inMonth ? "" : "bg-bg/60"
                } ${isToday ? "bg-forest/15" : ""}`}
              >
                {inMonth && (
                  <>
                    <div
                      className={`mb-1 text-right text-xs font-semibold ${
                        isToday
                          ? "text-accent"
                          : "text-ink-3"
                      }`}
                    >
                      {isToday ? `Today · ${day}` : day}
                    </div>
                    <div className="flex flex-col gap-1">
                      {dayBills.map(({ bill: b, date, hit }) => (
                        <div
                          key={`${b.id}-${date}`}
                          title={`${b.name} — ${formatCents(b.amountCents)}${hit ? " (hit)" : ""}`}
                          className={`truncate rounded px-1.5 py-0.5 text-[11px] font-semibold ${hit ? "line-through opacity-45" : ""}`}
                          style={{ color: b.color ?? "var(--lime)", background: "color-mix(in srgb, currentColor 12%, transparent)" }}
                        >
                          {b.name}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-3 text-xs text-ink-3">
        Struck-through charges have already hit the card. Weekly bills appear on each of their dates.
      </p>
    </div>
  );
}
