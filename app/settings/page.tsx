import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { DailyBudgetSlot } from "@/components/daily-budget-slot";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <>
      <DailyBudgetSlot />
      <div className="max-w-xl">
        <PageHeader title="Settings" subtitle="Salary and savings are edited on the dashboard" />

        <div className="card mb-4 text-sm leading-relaxed text-ink-2">
          <h2 className="card-title">Transactions</h2>
          <div className="flex items-center gap-3">
            <Link href="/settings/import" className="btn btn-primary">
              Import CSV
            </Link>
            <a href="/api/export/transactions" className="btn">
              Export CSV
            </a>
          </div>
        </div>

        <div className="card text-sm leading-relaxed text-ink-2">
          <h2 className="card-title">About</h2>
          MoneyMotion is a private, single-user budget console. Data lives in a local SQLite file at{" "}
          <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">data/money-motion.sqlite</code>.
          Deployment to the home server uses <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">deploy/deploy.sh</code>.
        </div>
      </div>
    </>
  );
}
