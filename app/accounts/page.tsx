import type { Account } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { deleteAccount } from "@/app/actions";
import { Money, PageHeader } from "@/components/ui";
import { AccountForm } from "@/components/forms";
import { ConfirmDelete } from "@/components/modal";
import { EditableBalance } from "@/components/editable-balance";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<Account["type"], string> = {
  CASH: "Cash",
  CHECKING: "Checking",
  SAVINGS: "Savings",
  CREDIT: "Credit Card",
};

function AccountCard({ account }: { account: Account }) {
  const color = account.color ?? "#7ED957";
  return (
    <div
      className="card relative overflow-hidden"
      style={{
        background: `linear-gradient(120deg, color-mix(in srgb, ${color} 16%, var(--surface)), var(--surface) 70%)`,
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold">{account.name}</div>
          <div className="text-xs text-ink-3">{TYPE_LABEL[account.type]}</div>
        </div>
        <span className="flex items-center gap-1">
          <AccountForm initial={account} />
          <ConfirmDelete onDelete={deleteAccount.bind(null, account.id)} label="" />
        </span>
      </div>
      <div className="mt-4 text-xl">
        <EditableBalance accountId={account.id} cents={account.balanceCents} className="text-xl" />
      </div>
    </div>
  );
}

export default async function AccountsPage() {
  const accounts = await prisma.account.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  const liquid = accounts.filter((a) => a.type !== "CREDIT");
  const credit = accounts.filter((a) => a.type === "CREDIT");
  const netCents = accounts.reduce((sum, a) => sum + a.balanceCents, 0);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Accounts"
        subtitle={
          <>
            Net liquid across all accounts: <Money cents={netCents} />
          </>
        }
        action={<AccountForm />}
      />

      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold tracking-wider text-ink-3 uppercase">
          Cash &amp; Bank
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {liquid.map((a) => (
            <AccountCard key={a.id} account={a} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold tracking-wider text-ink-3 uppercase">
          Credit Cards
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {credit.map((a) => (
            <AccountCard key={a.id} account={a} />
          ))}
        </div>
      </section>
    </div>
  );
}
