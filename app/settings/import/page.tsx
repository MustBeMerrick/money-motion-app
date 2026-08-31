import { PageHeader } from "@/components/ui";
import { ImportWorkspace } from "@/components/import-workspace";
import { getTransactionFormOptions } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const { accounts } = await getTransactionFormOptions();

  return (
    <div className="max-w-2xl">
      <PageHeader title="Import Transactions" subtitle="From a Pocket Expense CSV export" />
      <ImportWorkspace accounts={accounts} />
    </div>
  );
}
