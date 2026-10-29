import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { DailyBudgetSlot } from "@/components/daily-budget-slot";
import { DeletePayeeButton } from "@/components/delete-payee-button";
import { categoryEmoji, categoryLabel } from "@/lib/core/categories";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PayeesPage() {
  const payees = await prisma.payee.findMany({
    orderBy: { name: "asc" },
    include: { defaultAccount: true, _count: { select: { transactions: true } } },
  });

  return (
    <>
      <DailyBudgetSlot />
      <div className="max-w-xl">
        <Link href="/settings" className="mb-2 inline-flex items-center gap-1 text-xs text-ink-3 hover:text-ink">
          <ChevronLeft size={14} /> Settings
        </Link>
        <PageHeader title="Payees" subtitle="Remembered from past transactions; each prefills the category and account" />

        <div className="card text-sm">
          {payees.length === 0 ? (
            <p className="text-ink-3">No payees yet.</p>
          ) : (
            <ul className="divide-y divide-line/60">
              {payees.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="w-6 shrink-0 text-center">{categoryEmoji(p.category) ?? "🏷️"}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-ink">{p.name}</div>
                    <div className="truncate text-xs text-ink-3">
                      {[
                        p.category ? categoryLabel(p.category) : null,
                        p.defaultAccount?.name,
                        `${p._count.transactions} transaction${p._count.transactions === 1 ? "" : "s"}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                  <DeletePayeeButton id={p.id} name={p.name} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
