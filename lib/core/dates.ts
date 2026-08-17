// All core code works with plain ISO strings — "YYYY-MM-DD" dates and "YYYY-MM"
// months — so the math is timezone-proof and trivially testable.

export type IsoDate = string;
export type IsoMonth = string;

export function todayIso(now: Date = new Date()): IsoDate {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toUtcMs(date: IsoDate): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / 86_400_000);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const d = new Date(toUtcMs(date) + days * 86_400_000);
  return d.toISOString().slice(0, 10);
}

export function monthOf(date: IsoDate): IsoMonth {
  return date.slice(0, 7);
}

export function dayOfMonth(date: IsoDate): number {
  return Number(date.slice(8, 10));
}

export function daysInMonth(month: IsoMonth): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function firstDayOfMonth(month: IsoMonth): IsoDate {
  return `${month}-01`;
}

export function lastDayOfMonth(month: IsoMonth): IsoDate {
  return `${month}-${String(daysInMonth(month)).padStart(2, "0")}`;
}

// Today counts as a remaining day: on Aug 16 of a 31-day month, 16 days left.
export function daysLeftInMonth(date: IsoDate): number {
  return daysInMonth(monthOf(date)) - dayOfMonth(date) + 1;
}

function dayOfWeek(date: IsoDate): number {
  return new Date(toUtcMs(date)).getUTCDay();
}

// Payroll convention: if a scheduled date lands on a weekend, pay lands the
// prior business day instead.
export function prevWeekday(date: IsoDate): IsoDate {
  let d = date;
  while (dayOfWeek(d) === 0 || dayOfWeek(d) === 6) d = addDays(d, -1);
  return d;
}

// Semi-monthly payroll: paid on the 15th and the last day of the month,
// pulled back to the prior weekday whenever either lands on a weekend.
export function semiMonthlyPayDates(month: IsoMonth): { mid: IsoDate; end: IsoDate } {
  return {
    mid: prevWeekday(`${month}-15`),
    end: prevWeekday(lastDayOfMonth(month)),
  };
}

export function addMonths(month: IsoMonth, delta: number): IsoMonth {
  const [y, m] = month.split("-").map(Number);
  const total = y * 12 + (m - 1) + delta;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}

export function monthNumber(month: IsoMonth): number {
  return Number(month.slice(5, 7));
}

// 0 = Sunday .. 6 = Saturday, matching Date#getUTCDay
export const WEEKDAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];
export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function weekdayOf(date: IsoDate): number {
  return new Date(toUtcMs(date)).getUTCDay();
}

// Every date in the month falling on the given weekday — 4 or 5 of them,
// depending on the month. Weekly bills cost a different amount in a 5-week
// month, so this is computed rather than approximated as 52/12.
export function weekdayDatesInMonth(month: IsoMonth, weekday: number): IsoDate[] {
  const total = daysInMonth(month);
  const out: IsoDate[] = [];
  for (let day = 1; day <= total; day++) {
    const date = `${month}-${String(day).padStart(2, "0")}`;
    if (weekdayOf(date) === weekday) out.push(date);
  }
  return out;
}

export function countWeekdayInMonth(month: IsoMonth, weekday: number): number {
  return weekdayDatesInMonth(month, weekday).length;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function monthLabel(month: IsoMonth): string {
  const [y, m] = month.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

export function shortDateLabel(date: IsoDate): string {
  const [, m, d] = date.split("-").map(Number);
  return `${MONTH_NAMES[m - 1].slice(0, 3)} ${d}`;
}
