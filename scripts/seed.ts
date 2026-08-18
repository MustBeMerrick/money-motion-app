import { PrismaClient } from "@prisma/client";
import { dayOfMonth, monthOf, todayIso } from "../lib/core/dates";
import { billDueDatesInMonth } from "../lib/core/month";

const prisma = new PrismaClient();

const today = todayIso();
const month = monthOf(today);

async function main() {
  await prisma.billOccurrence.deleteMany();
  await prisma.bill.deleteMany();
  await prisma.account.deleteMany();
  await prisma.extraIncome.deleteMany();
  await prisma.piggyBucket.deleteMany();
  await prisma.monthPlan.deleteMany();

  await prisma.account.createMany({
    data: [
      { name: "Cash", type: "CASH", balanceCents: 7_300, color: "#85BB65", sortOrder: 0 },
      { name: "Chase Checking", type: "CHECKING", balanceCents: 146_273, color: "#14b8a6", sortOrder: 1 },
      { name: "Freedom", type: "CREDIT", balanceCents: 31_982, color: "#29ABE2", sortOrder: 2 },
      { name: "Unlimited", type: "CREDIT", balanceCents: 0, color: "#6366f1", sortOrder: 3 },
      { name: "Prime", type: "CREDIT", balanceCents: -8_726, color: "#a855f7", sortOrder: 4 },
      { name: "Reserve", type: "CREDIT", balanceCents: -217_703, color: "#8b5cf6", sortOrder: 5 },
      { name: "BofA", type: "CREDIT", balanceCents: 0, color: "#f43f5e", sortOrder: 6 },
      { name: "Quicksilver", type: "CREDIT", balanceCents: 0, color: "#f59e0b", sortOrder: 7 },
    ],
  });

  // Bills from the August calendar. Amounts are placeholders — edit to taste.
  const bills: Array<{
    name: string;
    amountCents: number;
    dueDay: number;
    shared?: boolean;
    reimburseCents?: number;
    color?: string;
    frequency?: "MONTHLY" | "YEARLY";
    dueMonth?: number;
  }> = [
    { name: "Rent", amountCents: 235_000, dueDay: 1, shared: true, reimburseCents: 117_500, color: "#14b8a6" },
    { name: "Car", amountCents: 38_500, dueDay: 6, color: "#14b8a6" },
    { name: "Apple One", amountCents: 3_795, dueDay: 6, color: "#3b82f6" },
    { name: "Sirius XM", amountCents: 2_399, dueDay: 11, color: "#f87171" },
    { name: "ChatGPT", amountCents: 2_000, dueDay: 11, color: "#22d3ee" },
    { name: "Mobile", amountCents: 7_000, dueDay: 18, color: "#14b8a6" },
    { name: "Internet", amountCents: 8_999, dueDay: 19, shared: true, reimburseCents: 4_500, color: "#14b8a6" },
    { name: "Water", amountCents: 4_500, dueDay: 19, shared: true, reimburseCents: 2_250, color: "#14b8a6" },
    { name: "Car Ins", amountCents: 14_200, dueDay: 20, color: "#3b82f6" },
    { name: "Care Club", amountCents: 2_499, dueDay: 22, shared: true, reimburseCents: 1_250, color: "#eab308" },
    { name: "SDG&E", amountCents: 11_500, dueDay: 25, shared: true, reimburseCents: 5_750, color: "#14b8a6" },
    { name: "Netflix", amountCents: 2_499, dueDay: 29, color: "#3b82f6" },
    { name: "Apple Developer", amountCents: 9_900, dueDay: 22, frequency: "YEARLY", dueMonth: 2, color: "#94a3b8" },
  ];

  for (const b of bills) {
    const bill = await prisma.bill.create({
      data: {
        name: b.name,
        amountCents: b.amountCents,
        shared: b.shared ?? false,
        reimburseCents: b.reimburseCents ?? 0,
        frequency: b.frequency ?? "MONTHLY",
        dueDay: b.dueDay,
        dueMonth: b.dueMonth ?? null,
        color: b.color ?? null,
      },
    });
    // charges already past their due date this month have hit the card
    for (const date of billDueDatesInMonth(bill, month)) {
      if (Number(date.slice(8, 10)) < dayOfMonth(today)) {
        await prisma.billOccurrence.create({
          data: { billId: bill.id, date, hit: true, paid: b.name === "Rent" },
        });
      }
    }
  }

  await prisma.monthPlan.create({
    data: {
      month,
      salaryMidCents: 260_000,
      salaryMidReceived: false,
      salaryEndCents: 260_000,
      salaryEndReceived: false,
      savingsCents: 100_000,
    },
  });

  await prisma.extraIncome.createMany({
    data: [
      { source: "Tax Return", expectedCents: 12_000, receivedCents: 0 },
      { source: "Sell Old Monitor", expectedCents: 7_500, receivedCents: 3_500 },
      { source: "Cashback Bonus", expectedCents: 2_500, receivedCents: 2_500 },
    ],
  });

  // Piggy buckets copied from the Numbers sheet (principal = Offset, original = Start).
  await prisma.piggyBucket.createMany({
    data: [
      { name: "Clothes", startDate: "2026-03-21", principalCents: -14_000, ratePerDayCents: -100, targetCents: null },
      { name: "Gifts", startDate: "2026-03-21", principalCents: -19_000, ratePerDayCents: -100, targetCents: null },
      { name: "Apple Developer", startDate: "2026-02-22", principalCents: -9_900, ratePerDayCents: 0, targetCents: -9_900 },
      { name: "Sunglasses", startDate: "2026-04-28", principalCents: -26_700, ratePerDayCents: 0, targetCents: -26_700 },
      { name: "Lightning Lane", startDate: "2026-07-20", principalCents: 36_500, ratePerDayCents: -700, targetCents: 0, originalCents: 42_494 },
      { name: "Tabby", startDate: "2026-07-23", principalCents: 28_500, ratePerDayCents: -500, targetCents: 0, originalCents: 28_500 },
      { name: "Ring", startDate: "2026-06-23", principalCents: 189_000, ratePerDayCents: -1_400, targetCents: 0, originalCents: 319_000 },
      { name: "Cruise", startDate: "2026-08-01", principalCents: 50_000, ratePerDayCents: -500, targetCents: 0, originalCents: 94_500 },
    ],
  });

  const counts = {
    accounts: await prisma.account.count(),
    bills: await prisma.bill.count(),
    buckets: await prisma.piggyBucket.count(),
    extras: await prisma.extraIncome.count(),
  };
  console.log(`Seeded for ${month}:`, counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
