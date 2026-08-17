import { monthLabel, monthOf, todayIso } from "@/lib/core/dates";
import { BillsNav } from "@/components/bills-nav";

export default function BillsLayout({ children }: { children: React.ReactNode }) {
  const month = monthLabel(monthOf(todayIso()));
  return (
    <div className="mx-auto max-w-[1400px]">
      <BillsNav subtitle={`Shared bills expect a reimbursement · Hit and Paid track ${month}`} />
      {children}
    </div>
  );
}
