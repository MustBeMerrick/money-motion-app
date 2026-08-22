import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getBillsWithStatus } from "@/lib/data";
import {
  addMonths,
  daysInMonth,
  monthLabel,
  monthOf,
  todayIso,
  type IsoMonth,
} from "@/lib/core/dates";
import { billMonthlyCostCents, billMonthlyOutOfPocketCents } from "@/lib/core/month";
import { formatCents } from "@/lib/core/money";
import { CalendarBillChip } from "@/components/calendar-bill-chip";
import { MobileBillCalendar, type MobileCharge } from "@/components/mobile-bill-calendar";
import { BillViewFrame } from "@/components/bill-view-toggle";

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

  const [bills, accounts] = await Promise.all([
    getBillsWithStatus(month),
    prisma.account.findMany({ where: { active: true }, select: { name: true, color: true } }),
  ]);
  const accountNameByColor = new Map(
    accounts.filter((a): a is { name: string; color: string } => !!a.color).map((a) => [a.color, a.name]),
  );
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
  // count charges, not unique bills — a weekly bill due 5 times this month
  // is 5 chips on the calendar, not 1
  const chargeCount = bills.reduce((sum, b) => sum + b.occurrences.length, 0);
  const monthTotal = bills.reduce((sum, b) => sum + billMonthlyCostCents(b, month), 0);
  // shared bills get reimbursed, so what Marc actually pays is less than the total due
  const myShareTotal = bills.reduce((sum, b) => sum + billMonthlyOutOfPocketCents(b, month), 0);

  // phones get the same month grid but with the bill names moved out of the
  // cells into a tap-to-open day list, since a ~50px cell truncates every name
  const mobileCharges: Record<number, MobileCharge[]> = {};
  for (const [day, charges] of byDay) {
    mobileCharges[day] = charges.map(({ bill: b, date, hit }) => ({
      key: `${b.id}-${date}`,
      name: b.name,
      amountCents: b.amountCents,
      hit,
      color: b.color ?? "var(--lime)",
      accountName: b.color ? accountNameByColor.get(b.color) : undefined,
    }));
  }

  return (
    // 3.5rem == the layout's py-7 (top + bottom), so on desktop this fills
    // exactly to the viewport edge with no page scroll, however many weeks the
    // month spans. On phones the grid + day list just scroll with the page.
    <div className="flex flex-col lg:h-[calc(100vh-3.5rem)]">
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <div className="flex flex-col gap-1 lg:flex-row lg:items-baseline lg:gap-4">
          <h1 className="text-2xl font-bold">Bill Calendar</h1>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm text-ink-2 lg:gap-x-3">
            <span>{chargeCount} bills</span>
            <span className="px-0.5 text-ink-3 lg:px-0">·</span>
            <span>{formatCents(monthTotal)} due</span>
            <span className="px-0.5 text-ink-3 lg:px-0">·</span>
            <span>{formatCents(myShareTotal)} my share</span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 lg:justify-end">
          <Link href={`/calendar?m=${addMonths(month, -1)}`} className="btn px-2" aria-label="Previous month">
            <ChevronLeft size={16} />
          </Link>
          <span className="text-center text-sm font-semibold lg:w-40">{monthLabel(month)}</span>
          <Link href={`/calendar?m=${addMonths(month, 1)}`} className="btn px-2" aria-label="Next month">
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>

      <BillViewFrame>
        <MobileBillCalendar
          month={month}
          daysInMonth={dim}
          firstWeekday={firstWeekday}
          todayDay={todayDay}
          charges={mobileCharges}
        />

        {/* month grid — desktop */}
        <div className="card mt-4 hidden min-h-0 flex-1 flex-col overflow-hidden p-0 lg:flex">
          <div className="grid shrink-0 grid-cols-7 border-b border-line bg-surface-2/60">
            {WEEKDAYS.map((d) => (
              <div key={d} className="px-3 py-2.5 text-center text-xs font-semibold tracking-wider text-ink-3 uppercase">
                {d}
              </div>
            ))}
          </div>
          <div
            className="grid flex-1 grid-cols-7"
            style={{ gridTemplateRows: `repeat(${weeks}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: weeks * 7 }, (_, i) => {
              const day = i - firstWeekday + 1;
              const inMonth = day >= 1 && day <= dim;
              const isToday = inMonth && day === todayDay;
              const dayBills = inMonth ? (byDay.get(day) ?? []) : [];
              return (
                <div
                  key={i}
                  className={`flex min-h-0 flex-col overflow-hidden border-r border-b border-line/60 p-2.5 last:border-r-0 [&:nth-child(7n)]:border-r-0 ${
                    inMonth ? "" : "bg-bg/60"
                  } ${isToday ? "bg-forest/15" : ""}`}
                >
                  {inMonth && (
                    <>
                      <div
                        className={`mb-1.5 shrink-0 text-right text-sm font-semibold ${
                          isToday
                            ? "text-accent"
                            : "text-ink-3"
                        }`}
                      >
                        {isToday ? `Today · ${day}` : day}
                      </div>
                      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
                        {dayBills.map(({ bill: b, date, hit }) => (
                          <CalendarBillChip
                            key={`${b.id}-${date}`}
                            name={b.name}
                            color={b.color ?? "var(--lime)"}
                            hit={hit}
                            accountName={b.color ? accountNameByColor.get(b.color) : undefined}
                            detail={`${formatCents(b.amountCents)}${hit ? " (hit)" : ""}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </BillViewFrame>
    </div>
  );
}
