import type { Account, Bill, ExtraIncome, MonthPlan, PiggyBucket } from "@prisma/client";
import { prisma } from "./prisma";
import { monthOf, todayIso, type IsoDate, type IsoMonth } from "./core/dates";
import {
  billDueDatesInMonth,
  monthSnapshot,
  type MonthSnapshot,
  type OccurrenceStatus,
} from "./core/month";

export type BillWithStatus = Bill & {
  // one entry per charge this month, in date order
  occurrences: OccurrenceStatus[];
  // rolled up across occurrences: hit only when every charge has landed
  hit: boolean;
  paid: boolean;
};

export interface DashboardData {
  today: IsoDate;
  month: IsoMonth;
  accounts: Account[];
  plan: MonthPlan;
  bills: BillWithStatus[];
  extras: ExtraIncome[];
  buckets: PiggyBucket[];
  snapshot: MonthSnapshot;
}

export async function getOrCreateMonthPlan(month: IsoMonth): Promise<MonthPlan> {
  const existing = await prisma.monthPlan.findUnique({ where: { month } });
  if (existing) return existing;
  const previous = await prisma.monthPlan.findFirst({
    where: { month: { lt: month } },
    orderBy: { month: "desc" },
  });
  return prisma.monthPlan.upsert({
    where: { month },
    update: {},
    create: {
      month,
      salaryMidCents: previous?.salaryMidCents ?? 0,
      salaryEndCents: previous?.salaryEndCents ?? 0,
      savingsCents: previous?.savingsCents ?? 0,
    },
  });
}

export async function getBillsWithStatus(month: IsoMonth): Promise<BillWithStatus[]> {
  const bills = await prisma.bill.findMany({
    where: { active: true },
    orderBy: [{ dueMonth: "asc" }, { dueDay: "asc" }, { name: "asc" }],
    // rows only exist once ticked, so start from the dates the bill is due
    // and fold any stored status onto them
    include: { occurrences: { where: { date: { startsWith: month } } } },
  });

  return bills.map(({ occurrences: stored, ...bill }) => {
    const byDate = new Map(stored.map((o) => [o.date, o]));
    const occurrences: OccurrenceStatus[] = billDueDatesInMonth(bill, month).map((date) => ({
      date,
      hit: byDate.get(date)?.hit ?? false,
      paid: byDate.get(date)?.paid ?? false,
    }));
    return {
      ...bill,
      occurrences,
      // a weekly bill counts as hit only once every charge has landed
      hit: occurrences.length > 0 && occurrences.every((o) => o.hit),
      paid: occurrences.length > 0 && occurrences.every((o) => o.paid),
    };
  });
}

export async function getDashboardData(today: IsoDate = todayIso()): Promise<DashboardData> {
  const month = monthOf(today);
  const [accounts, plan, allBills, extras, buckets] = await Promise.all([
    prisma.account.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    getOrCreateMonthPlan(month),
    getBillsWithStatus(month),
    prisma.extraIncome.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    prisma.piggyBucket.findMany({ where: { archived: false }, orderBy: { createdAt: "asc" } }),
  ]);

  // a bill with no occurrences this month (a yearly one in an off month) is
  // simply not part of this month's picture
  const bills = allBills.filter((b) => b.occurrences.length > 0);

  const snapshot = monthSnapshot({
    today,
    accounts,
    plan,
    bills,
    extras,
    buckets,
  });

  return { today, month, accounts, plan, bills, extras, buckets, snapshot };
}
