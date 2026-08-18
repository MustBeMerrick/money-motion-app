"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { parseDollarsToCents } from "@/lib/core/money";
import { daysBetween, todayIso } from "@/lib/core/dates";
import { bucketValueOn } from "@/lib/core/piggy";

const cents = z
  .string()
  .transform((s) => parseDollarsToCents(s))
  .refine((v): v is number => v !== null, "Enter a dollar amount");
const optionalCents = z
  .string()
  .optional()
  .transform((s) => (s && s.trim() !== "" ? parseDollarsToCents(s) : null));
const isoMonth = z.string().regex(/^\d{4}-\d{2}$/);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const checkbox = z
  .string()
  .optional()
  .transform((v) => v === "on" || v === "true");

function refresh() {
  revalidatePath("/", "layout");
}

function fields(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") out[key] = value;
  }
  return out;
}

// --- bill month status ---

/** Toggle hit/paid for one specific charge, identified by its due date. */
export async function setBillStatus(
  billId: string,
  date: string,
  field: "hit" | "paid",
  value: boolean,
) {
  isoDate.parse(date);
  await prisma.billOccurrence.upsert({
    where: { billId_date: { billId, date } },
    create: { billId, date, [field]: value },
    update: { [field]: value },
  });
  refresh();
}

/** Tick or clear every charge of a bill in one month — the header checkbox. */
export async function setBillStatusForMonth(
  billId: string,
  dates: string[],
  field: "hit" | "paid",
  value: boolean,
) {
  dates.forEach((d) => isoDate.parse(d));
  await prisma.$transaction(
    dates.map((date) =>
      prisma.billOccurrence.upsert({
        where: { billId_date: { billId, date } },
        create: { billId, date, [field]: value },
        update: { [field]: value },
      }),
    ),
  );
  refresh();
}

// --- accounts ---

const accountSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1),
  type: z.enum(["CASH", "CHECKING", "SAVINGS", "CREDIT"]),
  balance: cents,
  color: z.string().optional(),
  color2: z.string().optional(),
  sortOrder: z.coerce.number().int().default(0),
});

export async function saveAccount(formData: FormData) {
  const f = accountSchema.parse(fields(formData));
  const data = {
    name: f.name,
    type: f.type,
    balanceCents: f.balance,
    color: f.color || null,
    color2: f.color2 || null,
    sortOrder: f.sortOrder,
  };
  if (f.id) {
    await prisma.account.update({ where: { id: f.id }, data });
  } else {
    await prisma.account.create({ data });
  }
  refresh();
}

export async function updateAccountBalance(id: string, balanceCents: number) {
  z.number().int().parse(balanceCents);
  await prisma.account.update({ where: { id }, data: { balanceCents } });
  refresh();
}

export async function deleteAccount(id: string) {
  await prisma.account.delete({ where: { id } });
  refresh();
}

// --- bills ---

const billSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1),
  amount: cents,
  shared: checkbox,
  reimburse: optionalCents,
  frequency: z.enum(["WEEKLY", "MONTHLY", "YEARLY"]),
  // weekly bills submit a weekday instead of a day of month
  dueDay: z.coerce.number().int().min(1).max(31).optional(),
  dueMonth: z.coerce.number().int().min(1).max(12).optional(),
  dueWeekday: z.coerce.number().int().min(0).max(6).optional(),
  color: z.string().optional(),
});

export async function saveBill(formData: FormData) {
  const f = billSchema.parse(fields(formData));
  const weekly = f.frequency === "WEEKLY";
  const data = {
    name: f.name,
    amountCents: f.amount,
    shared: f.shared,
    // shared bills default to a full payback when no split is given
    reimburseCents: f.shared ? (f.reimburse ?? f.amount) : 0,
    frequency: f.frequency,
    // dueDay is unused for weekly bills; keep it in range rather than nullable
    dueDay: weekly ? 1 : (f.dueDay ?? 1),
    dueMonth: f.frequency === "YEARLY" ? (f.dueMonth ?? 1) : null,
    dueWeekday: weekly ? (f.dueWeekday ?? 1) : null,
    color: f.color || null,
  };
  if (f.id) {
    await prisma.bill.update({ where: { id: f.id }, data });
  } else {
    await prisma.bill.create({ data });
  }
  refresh();
}

export async function deleteBill(id: string) {
  await prisma.bill.delete({ where: { id } });
  refresh();
}

// --- extra income ---

const extraIncomeSchema = z.object({
  id: z.string().optional(),
  source: z.string().trim().min(1),
  expected: cents,
  received: optionalCents,
});

export async function saveExtraIncome(formData: FormData) {
  const f = extraIncomeSchema.parse(fields(formData));
  const data = {
    source: f.source,
    expectedCents: f.expected,
    receivedCents: f.received ?? 0,
  };
  if (f.id) {
    await prisma.extraIncome.update({ where: { id: f.id }, data });
  } else {
    // new rows go to the end of the current order
    const last = await prisma.extraIncome.aggregate({ _max: { sortOrder: true } });
    await prisma.extraIncome.create({ data: { ...data, sortOrder: (last._max.sortOrder ?? 0) + 1 } });
  }
  refresh();
}

export async function deleteExtraIncome(id: string) {
  await prisma.extraIncome.delete({ where: { id } });
  refresh();
}

export async function reorderExtraIncome(orderedIds: string[]) {
  await prisma.$transaction(
    orderedIds.map((id, sortOrder) =>
      prisma.extraIncome.update({ where: { id }, data: { sortOrder } }),
    ),
  );
  refresh();
}

// --- piggy buckets ---

const bucketSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1),
  startDate: isoDate,
  principal: cents,
  ratePerDay: cents,
  target: optionalCents,
  original: optionalCents,
  perpetual: checkbox,
});

export async function saveBucket(formData: FormData) {
  const f = bucketSchema.parse(fields(formData));
  let principalCents = f.principal;

  // Changing just the rate pivots the amortization line around its
  // start-date anchor, which silently shifts today's current value — the
  // spreadsheet issue this mirrors. If the rate is the only thing that
  // changed (principal/start date left as submitted), re-anchor the
  // principal so today's value holds steady and only the future slope moves.
  if (f.id) {
    const existing = await prisma.piggyBucket.findUnique({ where: { id: f.id } });
    if (
      existing &&
      f.ratePerDay !== existing.ratePerDayCents &&
      f.principal === existing.principalCents &&
      f.startDate === existing.startDate
    ) {
      const today = todayIso();
      const todayValue = bucketValueOn(existing, today);
      const days = Math.max(0, daysBetween(existing.startDate, today));
      principalCents = todayValue - f.ratePerDay * days;
    }
  }

  const data = {
    name: f.name,
    startDate: f.startDate,
    principalCents,
    ratePerDayCents: f.ratePerDay,
    targetCents: f.perpetual ? null : (f.target ?? 0),
    originalCents: f.original,
  };
  if (f.id) {
    await prisma.piggyBucket.update({ where: { id: f.id }, data });
  } else {
    await prisma.piggyBucket.create({ data });
  }
  refresh();
}

// Nudges the bucket's whole trajectory up/down by deltaCents — since
// current = principal + ratePerDay * daysSinceStart, adjusting principal by
// a flat amount shifts today's (and every future) value by exactly that
// amount without touching the rate or start date.
export async function adjustBucketPrincipal(id: string, deltaCents: number) {
  await prisma.piggyBucket.update({
    where: { id },
    data: { principalCents: { increment: deltaCents } },
  });
  refresh();
}

export async function setBucketArchived(id: string, archived: boolean) {
  await prisma.piggyBucket.update({ where: { id }, data: { archived } });
  refresh();
}

export async function deleteBucket(id: string) {
  await prisma.piggyBucket.delete({ where: { id } });
  refresh();
}

// --- month plan ---

const monthPlanSchema = z.object({
  month: isoMonth,
  salaryMid: cents,
  salaryMidReceived: checkbox,
  salaryEnd: cents,
  salaryEndReceived: checkbox,
  savings: cents,
});

export async function saveMonthPlan(formData: FormData) {
  const f = monthPlanSchema.parse(fields(formData));
  const data = {
    salaryMidCents: f.salaryMid,
    salaryMidReceived: f.salaryMidReceived,
    salaryEndCents: f.salaryEnd,
    salaryEndReceived: f.salaryEndReceived,
    savingsCents: f.savings,
  };
  await prisma.monthPlan.upsert({
    where: { month: f.month },
    create: { month: f.month, ...data },
    update: data,
  });
  refresh();
}

export async function setSalaryReceived(month: string, which: "mid" | "end", received: boolean) {
  isoMonth.parse(month);
  await prisma.monthPlan.update({
    where: { month },
    data: which === "mid" ? { salaryMidReceived: received } : { salaryEndReceived: received },
  });
  refresh();
}
