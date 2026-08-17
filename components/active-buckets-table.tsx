"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpDown } from "lucide-react";
import type { PiggyBucket } from "@prisma/client";
import {
  bucketCompletionDate,
  bucketDaysLeft,
  bucketProgress,
  bucketRemaining,
  bucketValueOn,
} from "@/lib/core/piggy";
import { shortDateLabel, type IsoDate } from "@/lib/core/dates";
import { Money, Pill, ProgressBar } from "@/components/ui";
import { BucketCurrentStepper } from "@/components/bucket-current-stepper";
import { BucketForm } from "@/components/forms";
import { ArchiveButton } from "@/components/archive-button";

// Inf (never completes) first, then Done, then soonest-to-complete to
// furthest-out last.
function daysLeftRank(daysLeft: number | null): number {
  if (daysLeft === null) return 0;
  if (daysLeft === 0) return 1;
  return 2;
}

// order is a persisted, frozen list of bucket ids — clicking Sort recomputes
// it from today's days-left and saves it; it does not silently re-sort as
// buckets change underneath it, so editing a bucket won't reshuffle the rows
// until Sort is pressed again
const SORT_STORAGE_KEY = "mm.piggy.sortOrder";

export function ActiveBucketsTable({ buckets, today }: { buckets: PiggyBucket[]; today: IsoDate }) {
  const [order, setOrder] = useState<string[] | null>(null);

  // localStorage isn't available during server rendering, so restore the
  // last-saved order after hydration
  useEffect(() => {
    const raw = localStorage.getItem(SORT_STORAGE_KEY);
    if (!raw) return;
    try {
      setOrder(JSON.parse(raw));
    } catch {
      // ignore corrupt/old data
    }
  }, []);

  function applySort() {
    const ids = buckets
      .map((b) => ({ id: b.id, daysLeft: bucketDaysLeft(b, today) }))
      .sort((a, b) => {
        const ra = daysLeftRank(a.daysLeft);
        const rb = daysLeftRank(b.daysLeft);
        if (ra !== rb) return ra - rb;
        if (ra === 2) return (a.daysLeft as number) - (b.daysLeft as number);
        return 0;
      })
      .map((x) => x.id);
    localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify(ids));
    setOrder(ids);
  }

  const rows = useMemo(() => {
    let ordered = buckets;
    if (order) {
      const byId = new Map(buckets.map((b) => [b.id, b]));
      const known = order.map((id) => byId.get(id)).filter((b): b is PiggyBucket => b !== undefined);
      const seen = new Set(order);
      // buckets not part of the last saved sort (newly added) tack onto the end
      ordered = [...known, ...buckets.filter((b) => !seen.has(b.id))];
    }
    return ordered.map((b) => ({ bucket: b, daysLeft: bucketDaysLeft(b, today) }));
  }, [buckets, today, order]);

  return (
    <section className="card">
      <h2 className="card-title">
        Active Buckets
        <button
          type="button"
          onClick={applySort}
          className="ml-auto flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium normal-case tracking-normal text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <ArrowUpDown size={12} />
          Sort by days left
        </button>
      </h2>
      <table className="table-base">
        <thead>
          <tr>
            <th>Bucket</th>
            <th className="text-right">Current</th>
            <th className="text-right">Remain</th>
            <th className="text-right">Rate/Day</th>
            <th className="pl-4">Started</th>
            <th className="text-right">Days Left</th>
            <th className="text-right">Completes</th>
            <th className="w-36 pl-5">Progress</th>
            <th className="w-28 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ bucket: b, daysLeft }) => {
            const completes = bucketCompletionDate(b, today);
            const progress = bucketProgress(b, today);
            const remaining = bucketRemaining(b, today);
            return (
              <tr key={b.id}>
                <td className="font-medium">{b.name}</td>
                <td className="text-right">
                  <BucketCurrentStepper bucketId={b.id} cents={bucketValueOn(b, today)} />
                </td>
                <td className="text-right">
                  {remaining === null ? (
                    <span className="text-ink-3">—</span>
                  ) : (
                    <Money cents={remaining} tone="plain" className="text-xs" />
                  )}
                </td>
                <td className="text-right">
                  {b.ratePerDayCents === 0 ? (
                    <span className="text-ink-3">—</span>
                  ) : (
                    <Money cents={b.ratePerDayCents} signed className="text-xs" />
                  )}
                </td>
                <td className="pl-4 text-xs text-ink-3">{shortDateLabel(b.startDate)}</td>
                <td className="text-right text-ink-2">
                  {daysLeft === 0 ? <Pill tone="pos">Done</Pill> : (daysLeft ?? "∞")}
                </td>
                <td className="text-right text-xs text-ink-3">
                  {completes && daysLeft !== 0 ? shortDateLabel(completes) : "—"}
                </td>
                <td className="pl-5">
                  {progress === null ? (
                    <Pill tone="muted">perpetual</Pill>
                  ) : (
                    <div className="flex items-center gap-2">
                      <ProgressBar fraction={progress} className="flex-1" />
                      <span className="w-9 text-right text-xs text-ink-2 tabular-nums">
                        {Math.round(progress * 100)}%
                      </span>
                    </div>
                  )}
                </td>
                <td>
                  <span className="flex items-center justify-end gap-1">
                    <BucketForm initial={b} />
                    <ArchiveButton id={b.id} archived={false} />
                  </span>
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={10} className="text-center text-xs text-ink-3">
                No buckets yet — add one to start dripping
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
