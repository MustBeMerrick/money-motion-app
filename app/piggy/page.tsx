import { prisma } from "@/lib/prisma";
import { deleteBucket } from "@/app/actions";
import { todayIso, shortDateLabel, monthOf } from "@/lib/core/dates";
import {
  bucketCompletionDate,
  bucketDaysLeft,
  bucketProgress,
  bucketProjectedEom,
  bucketRemaining,
  bucketValueOn,
} from "@/lib/core/piggy";
import { Money, PageHeader, Pill, ProgressBar } from "@/components/ui";
import { BucketForm } from "@/components/forms";
import { ConfirmDelete } from "@/components/modal";
import { ArchiveButton } from "@/components/archive-button";

export const dynamic = "force-dynamic";

export default async function PiggyPage() {
  const today = todayIso();
  const month = monthOf(today);
  const buckets = await prisma.piggyBucket.findMany({ orderBy: { createdAt: "asc" } });
  const active = buckets.filter((b) => !b.archived);
  const archived = buckets.filter((b) => b.archived);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Piggy Bank"
        subtitle="Buckets drip money in or out of the budget a little every day"
        action={<BucketForm />}
      />

      <section className="card mb-4 text-sm text-ink-2">
        <span className="font-semibold text-ink">How it works: </span>
        a bucket with a <span className="text-pos">positive value</span>{" "}
        is money you granted back to the budget — it spreads a big purchase forward, shrinking daily
        until it hits its end value. A <span className="text-neg">negative value</span>{" "}
        is money siphoned aside each day into a fund (clothes, gifts…). The sum of all buckets
        adjusts today&apos;s available money.
      </section>

      <section className="card">
        <h2 className="card-title">Active Buckets</h2>
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
              <th className="text-right">EOM</th>
              <th className="w-36 pl-5">Progress</th>
              <th className="w-28 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {active.map((b) => {
              const daysLeft = bucketDaysLeft(b, today);
              const completes = bucketCompletionDate(b, today);
              const progress = bucketProgress(b, today);
              const remaining = bucketRemaining(b, today);
              return (
                <tr key={b.id}>
                  <td className="font-medium">{b.name}</td>
                  <td className="text-right">
                    <Money cents={bucketValueOn(b, today)} />
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
                  <td className="text-right">
                    <Money cents={bucketProjectedEom(b, month)} tone="plain" className="text-xs" />
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
            {active.length === 0 && (
              <tr>
                <td colSpan={10} className="text-center text-xs text-ink-3">
                  No buckets yet — add one to start dripping
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {archived.length > 0 && (
        <section className="card mt-4">
          <h2 className="card-title">Archived</h2>
          <table className="table-base">
            <tbody>
              {archived.map((b) => (
                <tr key={b.id}>
                  <td className="font-medium text-ink-3">{b.name}</td>
                  <td className="text-right">
                    <Money cents={bucketValueOn(b, today)} tone="muted" />
                  </td>
                  <td className="w-44">
                    <span className="flex items-center justify-end gap-1">
                      <ArchiveButton id={b.id} archived />
                      <ConfirmDelete onDelete={deleteBucket.bind(null, b.id)} label="" />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
