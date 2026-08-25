import type { Account } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { deleteAccount } from "@/app/actions";
import { PageHeader } from "@/components/ui";
import { AccountForm } from "@/components/forms";
import { ConfirmDelete } from "@/components/modal";
import { EditableBalance } from "@/components/editable-balance";
import { DailyBudgetSlot } from "@/components/daily-budget-slot";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<Account["type"], string> = {
  CASH: "Cash",
  CHECKING: "Checking",
  SAVINGS: "Savings",
  CREDIT: "Credit Card",
};

function AccountCard({ account }: { account: Account }) {
  const color = account.color ?? "#7ED957";
  const color2 = account.color2 && account.color2 !== color ? account.color2 : null;
  const background = color2
    ? `linear-gradient(120deg, color-mix(in srgb, ${color} 85%, var(--surface)), ${color2} 60%, var(--surface) 95%)`
    : `linear-gradient(120deg, color-mix(in srgb, ${color} 85%, var(--surface)), var(--surface) 95%)`;
  return (
    <div
      className="card relative overflow-hidden"
      style={{ background }}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold">{account.name}</div>
          <div className="text-xs text-white">{TYPE_LABEL[account.type]}</div>
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
  return (
    <>
      <DailyBudgetSlot />
      <div className="max-w-5xl">
        <PageHeader title="Accounts" action={<AccountForm />} />

        <section className="mb-6">
          <h2 className="mb-3 text-sm font-semibold tracking-wider text-ink-3 uppercase">
            Cash &amp; Bank
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {liquid.map((a) => (
              <AccountCard key={a.id} account={a} />
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold tracking-wider text-ink-3 uppercase">
            Credit Cards
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {credit.map((a) => (
              <AccountCard key={a.id} account={a} />
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
