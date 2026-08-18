import { prisma } from "@/lib/prisma";
import { monthLabel, monthOf, todayIso } from "@/lib/core/dates";
import { BillsNav } from "@/components/bills-nav";
import { AccountColorsProvider } from "@/components/account-colors-context";

export const dynamic = "force-dynamic";

export default async function BillsLayout({ children }: { children: React.ReactNode }) {
  const month = monthLabel(monthOf(todayIso()));
  const accounts = await prisma.account.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, color: true, color2: true },
  });
  return (
    <AccountColorsProvider accounts={accounts.map((a) => ({ ...a, color: a.color ?? "#7ED957" }))}>
      <div className="max-w-[1400px]">
        <BillsNav subtitle={`Shared bills expect a reimbursement · Hit and Paid track ${month}`} />
        {children}
      </div>
    </AccountColorsProvider>
  );
}
