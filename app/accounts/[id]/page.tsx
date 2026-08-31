import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getAccountsWithBalances } from "@/lib/data";
import { shortDateLabel } from "@/lib/core/dates";
import { Money } from "@/components/ui";
import { DailyBudgetSlot } from "@/components/daily-budget-slot";
import { TransactionList, type LedgerRow } from "@/components/transaction-list";
import { categoryEmoji, categoryLabel } from "@/lib/core/categories";

export const dynamic = "force-dynamic";

const TYPE_LABEL = {
  CASH: "Cash",
  CHECKING: "Checking",
  SAVINGS: "Savings",
  CREDIT: "Credit Card",
} as const;

export default async function AccountLedgerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const account = (await getAccountsWithBalances()).find((a) => a.id === id);
  if (!account) notFound();

  const transactions = await prisma.transaction.findMany({
    where: { OR: [{ accountId: id }, { toAccountId: id }] },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: { payee: true, account: true, toAccount: true },
  });

  const rows: LedgerRow[] = transactions.map((t) => {
    const isTransfer = t.type === "TRANSFER";
    const incoming = isTransfer && t.toAccountId === id;
    // signed relative to *this* account, mirroring saveTransaction's balance math
    const signedCents = t.type === "INCOME" || incoming || t.reimbursement ? t.amountCents : -t.amountCents;
    return {
      id: t.id,
      dateLabel: shortDateLabel(t.date),
      isTransfer,
      incoming,
      reimbursement: t.reimbursement,
      otherAccountName: incoming ? t.account.name : t.toAccount?.name,
      payeeName: t.payee?.name,
      categoryLabel: categoryLabel(t.category),
      categoryEmoji: categoryEmoji(t.category),
      memo: t.memo,
      signedCents,
      edit: {
        type: t.type,
        reimbursement: t.reimbursement,
        date: t.date,
        amountCents: t.amountCents,
        accountId: t.accountId,
        toAccountId: t.toAccountId,
        payeeName: t.payee?.name,
        category: t.category,
        memo: t.memo,
      },
    };
  });

  return (
    <>
      <DailyBudgetSlot />
      <div className="max-w-3xl">
        <Link href="/accounts" className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-ink-3 hover:text-ink">
          <ArrowLeft size={13} /> Accounts
        </Link>
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{account.name}</h1>
            <p className="mt-0.5 text-sm text-ink-2">{TYPE_LABEL[account.type]}</p>
          </div>
          <Money cents={account.balanceCents} className="text-2xl" />
        </div>

        <div className="card overflow-hidden">
          <TransactionList rows={rows} />
        </div>
      </div>
    </>
  );
}
