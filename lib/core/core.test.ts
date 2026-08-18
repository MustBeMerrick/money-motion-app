import { describe, expect, it } from "vitest";
import { addDays, addMonths, daysBetween, daysInMonth, daysLeftInMonth, lastDayOfMonth, semiMonthlyPayDates } from "./dates";
import { bucketCompletionDate, bucketDaysLeft, bucketProgress, bucketRemaining, bucketValueOn, type BucketLike } from "./piggy";
import {
  billDueInMonth,
  billMonthlyCostCents,
  billMonthlyOutOfPocketCents,
  billOccurrencesInMonth,
  billOutOfPocketCents,
  extraIncomeStatus,
  monthSnapshot,
} from "./month";
import { countWeekdayInMonth, weekdayDatesInMonth, weekdayOf } from "./dates";
import { formatCents, parseDollarsToCents, splitHalfCents } from "./money";

const TODAY = "2026-08-16";

describe("money", () => {
  it("splits a bill in half, rounding the odd cent up", () => {
    expect(splitHalfCents(235_000)).toBe(117_500);
    expect(splitHalfCents(2_499)).toBe(1_250); // $24.99 -> $12.50
    expect(splitHalfCents(8_999)).toBe(4_500); // $89.99 -> $45.00
    expect(splitHalfCents(1)).toBe(1);
    expect(splitHalfCents(0)).toBe(0);
  });

  it("parses dollar input leniently", () => {
    expect(parseDollarsToCents("$1,234.56")).toBe(123_456);
    expect(parseDollarsToCents(" 12.5 ")).toBe(1_250);
    expect(parseDollarsToCents("-14")).toBe(-1_400);
    expect(parseDollarsToCents("")).toBeNull();
    expect(parseDollarsToCents("abc")).toBeNull();
  });

  it("formats negatives with the sign outside the symbol", () => {
    expect(formatCents(-217_703)).toBe("-$2,177.03");
    expect(formatCents(7_300)).toBe("$73.00");
  });
});

describe("dates", () => {
  it("daysBetween spans month boundaries", () => {
    expect(daysBetween("2026-06-23", TODAY)).toBe(54);
    expect(daysBetween(TODAY, TODAY)).toBe(0);
  });

  it("addDays and month helpers", () => {
    expect(addDays(TODAY, 81)).toBe("2026-11-05");
    expect(daysInMonth("2026-08")).toBe(31);
    expect(daysInMonth("2026-02")).toBe(28);
    expect(daysInMonth("2028-02")).toBe(29);
    expect(lastDayOfMonth("2026-08")).toBe("2026-08-31");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-12", 1)).toBe("2027-01");
  });

  it("today counts as a remaining day (sheet shows 16 left on Aug 16)", () => {
    expect(daysLeftInMonth(TODAY)).toBe(16);
    expect(daysLeftInMonth("2026-08-31")).toBe(1);
    expect(daysLeftInMonth("2026-08-01")).toBe(31);
  });

  it("semi-monthly pay dates pull back off weekends", () => {
    // Aug 15 2026 is a Saturday, so pay lands Friday the 14th
    expect(semiMonthlyPayDates("2026-08")).toEqual({ mid: "2026-08-14", end: "2026-08-31" });
    // Sept 15 and 30 both land on weekdays already
    expect(semiMonthlyPayDates("2026-09")).toEqual({ mid: "2026-09-15", end: "2026-09-30" });
  });
});

// Fixtures lifted straight from Marc's Numbers sheet on 2026-08-16.
// principal = the sheet's "Offset", original = the sheet's "Start".
const ring: BucketLike = {
  startDate: "2026-06-23",
  principalCents: 189_000,
  ratePerDayCents: -1_400,
  targetCents: 0,
  originalCents: 319_000,
};
const cruise: BucketLike = {
  startDate: "2026-08-01",
  principalCents: 50_000,
  ratePerDayCents: -500,
  targetCents: 0,
  originalCents: 94_500,
};
const tabby: BucketLike = {
  startDate: "2026-07-23",
  principalCents: 28_500,
  ratePerDayCents: -500,
  targetCents: 0,
  originalCents: 28_500,
};
const lightningLane: BucketLike = {
  startDate: "2026-07-20",
  principalCents: 36_500,
  ratePerDayCents: -700,
  targetCents: 0,
  originalCents: 42_494,
};
const clothes: BucketLike = {
  startDate: "2026-03-21",
  principalCents: -14_000,
  ratePerDayCents: -100,
  targetCents: null,
};
const appleDeveloper: BucketLike = {
  startDate: "2026-02-22",
  principalCents: -9_900,
  ratePerDayCents: 0,
  targetCents: -9_900,
};

describe("weekly recurrence", () => {
  it("knows the weekday of a date", () => {
    expect(weekdayOf("2026-08-16")).toBe(0); // a Sunday
    expect(weekdayOf("2026-08-17")).toBe(1); // Monday
  });

  it("counts 4 or 5 occurrences depending on the month", () => {
    // August 2026 starts on a Saturday and runs 31 days = 4 weeks + 3 days,
    // so Sat/Sun/Mon land 5 times and every other weekday lands 4
    expect(countWeekdayInMonth("2026-08", 6)).toBe(5); // Saturdays
    expect(countWeekdayInMonth("2026-08", 0)).toBe(5); // Sundays
    expect(countWeekdayInMonth("2026-08", 1)).toBe(5); // Mondays
    expect(countWeekdayInMonth("2026-08", 2)).toBe(4); // Tuesdays
    expect(weekdayDatesInMonth("2026-08", 1)).toEqual([
      "2026-08-03", "2026-08-10", "2026-08-17", "2026-08-24", "2026-08-31",
    ]);
    // every weekday accounted for, no double counting
    const all = [0, 1, 2, 3, 4, 5, 6].reduce((n, d) => n + countWeekdayInMonth("2026-08", d), 0);
    expect(all).toBe(31);
  });

  it("a weekly bill costs more in a 5-week month", () => {
    const weekly = {
      frequency: "WEEKLY" as const,
      dueMonth: null,
      dueWeekday: 6, // Saturday
      amountCents: 5_000,
      reimburseCents: 2_500,
    };
    expect(billOccurrencesInMonth(weekly, "2026-08")).toBe(5);
    expect(billMonthlyCostCents(weekly, "2026-08")).toBe(25_000);
    expect(billMonthlyOutOfPocketCents(weekly, "2026-08")).toBe(12_500);
    // September 2026 has only 4 Saturdays
    expect(billOccurrencesInMonth(weekly, "2026-09")).toBe(4);
    expect(billMonthlyCostCents(weekly, "2026-09")).toBe(20_000);
  });

  it("weekly and monthly bills land in every month, yearly only in its own", () => {
    expect(billDueInMonth({ frequency: "WEEKLY", dueMonth: null, dueWeekday: 3 }, "2026-02")).toBe(true);
    expect(billDueInMonth({ frequency: "MONTHLY", dueMonth: null }, "2026-02")).toBe(true);
    expect(billDueInMonth({ frequency: "YEARLY", dueMonth: 2 }, "2026-02")).toBe(true);
    expect(billDueInMonth({ frequency: "YEARLY", dueMonth: 2 }, "2026-08")).toBe(false);
  });

  it("a weekly bill with no weekday set costs nothing rather than throwing", () => {
    const orphan = { frequency: "WEEKLY" as const, dueMonth: null, dueWeekday: null, amountCents: 5_000 };
    expect(billOccurrencesInMonth(orphan, "2026-08")).toBe(0);
    expect(billMonthlyCostCents(orphan, "2026-08")).toBe(0);
  });
});

describe("piggy buckets (sheet fixtures)", () => {
  it("reproduces the sheet's Piggy column", () => {
    expect(bucketValueOn(ring, TODAY)).toBe(113_400);
    expect(bucketValueOn(cruise, TODAY)).toBe(42_500);
    expect(bucketValueOn(tabby, TODAY)).toBe(16_500);
    expect(bucketValueOn(lightningLane, TODAY)).toBe(17_600);
    expect(bucketValueOn(clothes, TODAY)).toBe(-28_800);
  });

  it("reproduces Days Left and Amrt Date", () => {
    expect(bucketDaysLeft(ring, TODAY)).toBe(81);
    expect(bucketCompletionDate(ring, TODAY)).toBe("2026-11-05");
    expect(bucketDaysLeft(cruise, TODAY)).toBe(85);
    expect(bucketCompletionDate(cruise, TODAY)).toBe("2026-11-09");
    expect(bucketDaysLeft(tabby, TODAY)).toBe(33);
    expect(bucketCompletionDate(tabby, TODAY)).toBe("2026-09-18");
    expect(bucketDaysLeft(lightningLane, TODAY)).toBe(26);
    expect(bucketCompletionDate(lightningLane, TODAY)).toBe("2026-09-11");
  });

  it("clamps at target and reports completion", () => {
    expect(bucketValueOn(ring, "2027-01-01")).toBe(0);
    expect(bucketDaysLeft(ring, "2027-01-01")).toBe(0);
    expect(bucketValueOn(appleDeveloper, TODAY)).toBe(-9_900);
    expect(bucketRemaining(appleDeveloper, TODAY)).toBe(0);
    // zero-rate bucket sitting at its target is complete, not perpetual
    expect(bucketDaysLeft(appleDeveloper, TODAY)).toBe(0);
  });

  it("perpetual buckets never complete", () => {
    expect(bucketDaysLeft(clothes, TODAY)).toBeNull();
    expect(bucketRemaining(clothes, TODAY)).toBeNull();
    expect(bucketProgress(clothes, TODAY)).toBeNull();
  });

  it("remaining is the sheet's Remain column", () => {
    expect(bucketRemaining(ring, TODAY)).toBe(-113_400);
    expect(bucketRemaining(cruise, TODAY)).toBe(-42_500);
  });

  it("progress measures against the original amount", () => {
    expect(bucketProgress(tabby, TODAY)).toBeCloseTo(1 - 16_500 / 28_500, 5);
    expect(bucketProgress(ring, TODAY)).toBeCloseTo(1 - 113_400 / 319_000, 5);
  });

  it("value never accrues before the start date", () => {
    expect(bucketValueOn(cruise, "2026-07-15")).toBe(50_000);
  });
});

const occ = (date: string, hit = false, paid = false) => ({ date, hit, paid });

describe("month snapshot", () => {
  const base = {
    today: TODAY,
    accounts: [
      { type: "CASH" as const, balanceCents: 20_000 },
      { type: "CHECKING" as const, balanceCents: 352_018 },
      { type: "CREDIT" as const, balanceCents: -113_400 },
    ],
    plan: {
      salaryMidCents: 260_000,
      salaryMidReceived: false,
      salaryEndCents: 260_000,
      salaryEndReceived: false,
      savingsCents: 100_000,
    },
    bills: [
      // shared, already hit, not yet reimbursed
      { amountCents: 9_900, shared: true, reimburseCents: 9_900, occurrences: [occ("2026-08-06", true, false)] },
      // shared, not yet hit
      { amountCents: 26_700, shared: true, reimburseCents: 13_350, occurrences: [occ("2026-08-16")] },
      // non-shared, not yet hit
      { amountCents: 4_500, shared: false, reimburseCents: 0, occurrences: [occ("2026-08-20")] },
      // yearly bill due in a different month: no occurrences, so it drops out
      { amountCents: 99_900, shared: false, reimburseCents: 0, occurrences: [] },
    ],
    extras: [
      { expectedCents: 12_000, receivedCents: 0 },
      { expectedCents: 8_500, receivedCents: 3_500 },
    ],
    buckets: [ring, clothes],
  };

  it("computes the whole pipeline", () => {
    const s = monthSnapshot(base);
    expect(s.daysLeft).toBe(16);
    expect(s.liquidCents).toBe(372_018);
    expect(s.ccNetCents).toBe(-113_400);
    expect(s.netLiquidCents).toBe(258_618);
    expect(s.salaryOutstandingCents).toBe(520_000);
    expect(s.extraOutstandingCents).toBe(17_000);
    expect(s.pendingReimburseCents).toBe(9_900);
    // cash & checking on hand (372,018) + salary still outstanding, i.e. not
    // yet received (520,000) + extras counted at the higher of
    // expected/received (20,500) + only the reimbursements actually owed
    // back so far (9,900)
    expect(s.plannedIncomeCents).toBe(372_018 + 520_000 + 20_500 + 9_900);
    expect(s.recurringTotalCents).toBe(41_100);
    expect(s.recurringHitCents).toBe(9_900);
    expect(s.recurringRemainingCents).toBe(31_200);
    // only unhit charges, and only your share of the shared one still unhit
    // (26,700 - 13,350 reimbursed) plus the full non-shared one (4,500)
    expect(s.recurringOutOfPocketRemainingCents).toBe(13_350 + 4_500);
    expect(s.piggyNetCents).toBe(113_400 - 28_800);
    // signed: credit cards (-113,400) minus out-of-pocket remaining (17,850)
    // minus the savings target (100,000)
    expect(s.plannedExpensesCents).toBe(-113_400 - 17_850 - 100_000);
    // literally income + expenses + virtual adjustments, the three lines
    // shown above Net on the dashboard
    expect(s.plannedNetCents).toBe(
      s.plannedIncomeCents + s.plannedExpensesCents + s.piggyNetCents,
    );
    expect(s.availableCents).toBe(
      372_018 - 113_400 + 520_000 + 17_000 + 9_900 - 31_200 - 100_000 + 84_600,
    );
    expect(s.dailyBudgetCents).toBe(Math.floor(s.plannedNetCents / 16));
    // ring and clothes both drip at their full rate/day tomorrow (neither is
    // clamped at its target yet): -1,400 + -100 = -1,500 off net
    expect(s.tomorrowBudgetCents).toBe(Math.floor((s.plannedNetCents - 1_500) / 15));
  });

  it("no tomorrow budget on the last day of the month", () => {
    const s = monthSnapshot({ ...base, today: "2026-08-31" });
    expect(s.daysLeft).toBe(1);
    expect(s.tomorrowBudgetCents).toBeNull();
  });

  it("a bucket completing overnight stops dripping, so tomorrow's budget isn't overcharged", () => {
    // today (day 1): 100 - 80 = 20; naively tomorrow would be -60, but it
    // clamps at the target of 0 instead
    const almostDone: BucketLike = {
      startDate: "2026-08-15",
      principalCents: 100,
      ratePerDayCents: -80,
      targetCents: 0,
    };
    const s = monthSnapshot({ ...base, buckets: [almostDone] });
    expect(bucketValueOn(almostDone, TODAY)).toBe(20);
    const naiveTomorrowNet = s.plannedNetCents - 80;
    const clampedTomorrowNet = s.plannedNetCents - 20;
    expect(s.tomorrowBudgetCents).toBe(Math.floor(clampedTomorrowNet / 15));
    expect(s.tomorrowBudgetCents).not.toBe(Math.floor(naiveTomorrowNet / 15));
  });

  it("marking a bill hit stops double-counting it against available", () => {
    const before = monthSnapshot(base);
    const after = monthSnapshot({
      ...base,
      bills: base.bills.map((b, i) =>
        i === 2 ? { ...b, occurrences: [occ("2026-08-20", true, false)] } : b,
      ),
    });
    // the bill left "remaining"; in reality the CC balance drops by the same
    // amount when the charge lands, keeping available unchanged overall
    expect(after.recurringRemainingCents).toBe(before.recurringRemainingCents - 4_500);
    expect(after.availableCents).toBe(before.availableCents + 4_500);
  });

  it("counts a weekly bill charge by charge", () => {
    // $90 groceries every Sunday: 5 charges in August, 2 already on the card
    const weekly = {
      amountCents: 9_000,
      shared: false,
      reimburseCents: 0,
      occurrences: [
        occ("2026-08-02", true),
        occ("2026-08-09", true),
        occ("2026-08-16"),
        occ("2026-08-23"),
        occ("2026-08-30"),
      ],
    };
    const s = monthSnapshot({ ...base, bills: [weekly] });
    expect(s.recurringTotalCents).toBe(45_000);
    expect(s.recurringHitCents).toBe(18_000);
    // only the three charges still to come weigh on available money
    expect(s.recurringRemainingCents).toBe(27_000);

    // ticking one more charge frees exactly one week's worth
    const after = monthSnapshot({
      ...base,
      bills: [{ ...weekly, occurrences: weekly.occurrences.map((o, i) => (i === 2 ? occ(o.date, true) : o)) }],
    });
    expect(after.recurringRemainingCents).toBe(18_000);
    expect(after.availableCents).toBe(s.availableCents + 9_000);
  });

  it("a shared weekly bill accrues reimbursement per charge", () => {
    const weekly = {
      amountCents: 8_000,
      shared: true,
      reimburseCents: 4_000,
      occurrences: [
        occ("2026-08-06", true, true), // hit and already paid back
        occ("2026-08-13", true, false), // hit, still owed
        occ("2026-08-20", true, false), // hit, still owed
        occ("2026-08-27", false, false), // not yet charged
      ],
    };
    const s = monthSnapshot({ ...base, bills: [weekly] });
    // two unpaid-but-hit charges are owed back to you
    expect(s.pendingReimburseCents).toBe(8_000);
    expect(s.recurringTotalCents).toBe(32_000);
    expect(s.recurringRemainingCents).toBe(8_000);
  });

  it("marking a shared bill paid removes the pending reimbursement", () => {
    const after = monthSnapshot({
      ...base,
      bills: base.bills.map((b, i) =>
        i === 0 ? { ...b, occurrences: [occ("2026-08-06", true, true)] } : b,
      ),
    });
    expect(after.pendingReimburseCents).toBe(0);
  });

  // Someone can Venmo you before a shared charge even posts. Once that
  // happens you're on the hook for the whole amount when it does hit (no
  // more reimbursement coming), so the unhit occurrence should switch from
  // costing just your share to costing the full amount.
  it("marking an unhit shared bill paid in advance charges the full amount, not just your share", () => {
    const before = monthSnapshot(base);
    // base.bills[1]: shared, unhit, 26,700 / 13,350 reimburse
    expect(before.recurringOutOfPocketRemainingCents).toBe(13_350 + 4_500);

    const after = monthSnapshot({
      ...base,
      bills: base.bills.map((b, i) =>
        i === 1 ? { ...b, occurrences: [occ("2026-08-16", false, true)] } : b,
      ),
    });
    // the reimbursed share is no longer subtracted, so the full 26,700 is
    // now outstanding instead of just the 13,350 out-of-pocket portion
    expect(after.recurringOutOfPocketRemainingCents).toBe(26_700 + 4_500);
    // it hasn't hit, so this still isn't a pending reimbursement either way
    expect(after.pendingReimburseCents).toBe(before.pendingReimburseCents);
  });

  it("salary received moves out of outstanding", () => {
    const after = monthSnapshot({
      ...base,
      plan: { ...base.plan, salaryMidReceived: true, salaryEndReceived: true },
    });
    expect(after.salaryOutstandingCents).toBe(0);
    expect(after.availableCents).toBe(monthSnapshot(base).availableCents - 520_000);
    // received paychecks already sit in cash/checking (liquidCents), so
    // counting them again in Total Income would double them up
    expect(after.plannedIncomeCents).toBe(monthSnapshot(base).plannedIncomeCents - 520_000);
  });

  it("out of pocket is amount minus reimbursement", () => {
    // an even split: you carry half
    expect(billOutOfPocketCents({ amountCents: 12_198, reimburseCents: 6_099 })).toBe(6_099);
    // an uneven split: rent is 5400 with 2300 coming back
    expect(billOutOfPocketCents({ amountCents: 540_000, reimburseCents: 230_000 })).toBe(310_000);
    // non-shared bills have no reimbursement, so you carry all of it
    expect(billOutOfPocketCents({ amountCents: 2_000, reimburseCents: 0 })).toBe(2_000);
    // fully reimbursed: costs you nothing
    expect(billOutOfPocketCents({ amountCents: 9_900, reimburseCents: 9_900 })).toBe(0);
  });

  it("billDueInMonth handles yearly bills", () => {
    expect(billDueInMonth({ frequency: "YEARLY", dueMonth: 8 }, "2026-08")).toBe(true);
    expect(billDueInMonth({ frequency: "YEARLY", dueMonth: 2 }, "2026-08")).toBe(false);
    expect(billDueInMonth({ frequency: "MONTHLY", dueMonth: null }, "2026-08")).toBe(true);
  });

  it("extra income status", () => {
    expect(extraIncomeStatus({ expectedCents: 100, receivedCents: 0 })).toBe("PENDING");
    expect(extraIncomeStatus({ expectedCents: 100, receivedCents: 50 })).toBe("PARTIAL");
    expect(extraIncomeStatus({ expectedCents: 100, receivedCents: 100 })).toBe("RECEIVED");
  });
});
