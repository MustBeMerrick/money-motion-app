import { prisma } from "@/lib/prisma";
import { deleteBucket } from "@/app/actions";
import { todayIso } from "@/lib/core/dates";
import { bucketValueOn } from "@/lib/core/piggy";
import { Money, PageHeader } from "@/components/ui";
import { ActiveBucketsTable } from "@/components/active-buckets-table";
import { BucketForm } from "@/components/forms";
import { ConfirmDelete } from "@/components/modal";
import { ArchiveButton } from "@/components/archive-button";

export const dynamic = "force-dynamic";

export default async function PiggyPage() {
  const today = todayIso();
  const buckets = await prisma.piggyBucket.findMany({ orderBy: { createdAt: "asc" } });
  const active = buckets.filter((b) => !b.archived);
  const archived = buckets.filter((b) => b.archived);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Piggy Banks"
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

      <ActiveBucketsTable buckets={active} today={today} />

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
