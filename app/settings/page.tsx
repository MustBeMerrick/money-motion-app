import { saveMonthPlan } from "@/app/actions";
import { getOrCreateMonthPlan } from "@/lib/data";
import { monthLabel, monthOf, todayIso } from "@/lib/core/dates";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const month = monthOf(todayIso());
  const plan = await getOrCreateMonthPlan(month);

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Settings" subtitle={`Month plan for ${monthLabel(month)}`} />

      <form action={saveMonthPlan} className="card flex flex-col gap-4">
        <input type="hidden" name="month" value={month} />
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-2">Salary ($ / month)</span>
          <input
            name="salary"
            required
            defaultValue={(plan.salaryCents / 100).toFixed(2)}
            className="input"
            inputMode="decimal"
          />
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-2">
          <input
            type="checkbox"
            name="salaryReceived"
            defaultChecked={plan.salaryReceived}
            className="h-4 w-4 accent-[#7ED957]"
          />
          Salary already received (it&apos;s sitting in checking, so don&apos;t count it again)
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-2">Monthly savings target ($)</span>
          <input
            name="savings"
            required
            defaultValue={(plan.savingsCents / 100).toFixed(2)}
            className="input"
            inputMode="decimal"
          />
          <span className="mt-1 block text-[11px] text-ink-3">
            Treated as a fixed expense — set aside before the daily budget is computed.
          </span>
        </label>
        <div className="flex justify-end">
          <button type="submit" className="btn btn-primary">
            Save Month Plan
          </button>
        </div>
      </form>

      <div className="card mt-4 text-sm leading-relaxed text-ink-2">
        <h2 className="card-title">About</h2>
        MoneyMotion is a private, single-user budget console. Data lives in a local SQLite file at{" "}
        <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">data/money-motion.sqlite</code>.
        Deployment to the home server uses <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">deploy/deploy.sh</code>.
      </div>
    </div>
  );
}
