import { addDays, daysBetween, lastDayOfMonth, type IsoDate, type IsoMonth } from "./dates";

// A bucket's signed value is its adjustment to available money:
//   positive = money granted back to the budget (a big purchase amortized
//              forward: hold value released down to target at ratePerDay)
//   negative = money siphoned aside from the budget (a savings/allowance
//              fund growing more negative each day)
export interface BucketLike {
  startDate: IsoDate;
  principalCents: number;
  ratePerDayCents: number;
  targetCents: number | null;
  originalCents?: number | null;
}

function clampToTarget(value: number, bucket: BucketLike): number {
  const { principalCents, targetCents } = bucket;
  if (targetCents === null) return value;
  // moving down toward target vs up toward target
  if (principalCents >= targetCents) return Math.max(value, targetCents);
  return Math.min(value, targetCents);
}

export function bucketValueOn(bucket: BucketLike, date: IsoDate): number {
  const days = Math.max(0, daysBetween(bucket.startDate, date));
  return clampToTarget(bucket.principalCents + bucket.ratePerDayCents * days, bucket);
}

export function bucketIsComplete(bucket: BucketLike, date: IsoDate): boolean {
  return (
    bucket.targetCents !== null && bucketValueOn(bucket, date) === bucket.targetCents
  );
}

export function bucketDaysLeft(bucket: BucketLike, date: IsoDate): number | null {
  const { ratePerDayCents, targetCents } = bucket;
  if (targetCents === null) return null;
  const remaining = targetCents - bucketValueOn(bucket, date);
  if (remaining === 0) return 0;
  // no rate, or rate pointing away from the target: it will never complete
  if (ratePerDayCents === 0 || Math.sign(remaining) !== Math.sign(ratePerDayCents)) return null;
  return Math.ceil(Math.abs(remaining) / Math.abs(ratePerDayCents));
}

export function bucketCompletionDate(bucket: BucketLike, date: IsoDate): IsoDate | null {
  const daysLeft = bucketDaysLeft(bucket, date);
  return daysLeft === null ? null : addDays(date, daysLeft);
}

export function bucketProjectedEom(bucket: BucketLike, month: IsoMonth): number {
  return bucketValueOn(bucket, lastDayOfMonth(month));
}

// Fraction amortized so far, measured against the original full amount when
// known (the principal may have been manually adjusted along the way).
export function bucketProgress(bucket: BucketLike, date: IsoDate): number | null {
  if (bucket.targetCents === null) return null;
  const base = bucket.originalCents ?? bucket.principalCents;
  const total = base - bucket.targetCents;
  if (total === 0) return 1;
  const remaining = bucketValueOn(bucket, date) - bucket.targetCents;
  const progress = 1 - remaining / total;
  return Math.min(1, Math.max(0, progress));
}

// The still-unamortized change this bucket will apply to the budget
// (the sheet's "Remain" column). Null for perpetual buckets.
export function bucketRemaining(bucket: BucketLike, date: IsoDate): number | null {
  if (bucket.targetCents === null) return null;
  return bucket.targetCents - bucketValueOn(bucket, date);
}
