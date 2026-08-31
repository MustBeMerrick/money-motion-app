import Link from "next/link";
import type { Account } from "@prisma/client";
import { getAccountsWithBalances, type AccountWithBalance } from "@/lib/data";
import { deleteAccount } from "@/app/actions";
import { Money, PageHeader } from "@/components/ui";
import { AccountForm } from "@/components/forms";
import { ConfirmDelete } from "@/components/modal";
import { DailyBudgetSlot } from "@/components/daily-budget-slot";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<Account["type"], string> = {
  CASH: "Cash",
  CHECKING: "Checking",
  SAVINGS: "Savings",
  CREDIT: "Credit Card",
};

function AccountCard({ account }: { account: AccountWithBalance }) {
  const color = account.color ?? "#7ED957";
  const color2 = account.color2 && account.color2 !== color ? account.color2 : null;
  const background = color2
    ? `linear-gradient(120deg, color-mix(in srgb, ${color} 85%, var(--surface)), ${color2} 60%, var(--surface) 95%)`
    : `linear-gradient(120deg, color-mix(in srgb, ${color} 85%, var(--surface)), var(--surface) 95%)`;
  return (
    // The pencil/delete buttons used to live *inside* the <Link>, with a
    // click-swallowing wrapper trying to stop the Link without also
    // cancelling the edit form's own Save click -- impossible to get right,
    // since React re-dispatches a click to every React ancestor (including
    // through a portal) regardless of preventDefault/stopPropagation calls
    // along the way, so any handler that stops the Link also stops Save's
    // submit. Layering instead of event-cancellation sidesteps the whole
    // problem: the Link is a full-bleed sibling *behind* the content
    // (z-0), and the buttons sit above it (z-10, not covered) so they simply
    // receive the click themselves and the Link never sees it -- ordinary
    // hit-testing, no event tricks. The decorative text keeps pointer-events
    // none so a click there still falls through to the Link beneath it.
    <div
      className="card relative overflow-hidden transition-shadow hover:shadow-lg hover:shadow-black/30"
      style={{ background }}
    >
      <Link href={`/accounts/${account.id}`} className="absolute inset-0 z-0" aria-label={`${account.name} transactions`} />
      <div className="relative z-10 flex items-start justify-between">
        <div className="pointer-events-none">
          <div className="font-semibold">{account.name}</div>
          <div className="text-xs text-white">{TYPE_LABEL[account.type]}</div>
        </div>
        <span className="flex items-center gap-1">
          <AccountForm initial={account} />
          <ConfirmDelete onDelete={deleteAccount.bind(null, account.id)} label="" />
        </span>
      </div>
      <div className="relative z-10 pointer-events-none mt-4 text-xl">
        <Money cents={account.balanceCents} className="text-xl" />
      </div>
    </div>
  );
}

export default async function AccountsPage() {
  const accounts = (await getAccountsWithBalances()).filter((a) => a.active);
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
