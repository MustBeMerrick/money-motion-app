import { getBillsWithStatus } from "@/lib/data";
import { monthLabel, monthOf, todayIso } from "@/lib/core/dates";
import { BillBoards } from "@/components/bill-tables";

export const dynamic = "force-dynamic";

export default async function WeeklyBillsPage() {
  const month = monthOf(todayIso());
  const bills = (await getBillsWithStatus(month)).filter((b) => b.frequency === "WEEKLY");

  return (
    <BillBoards
      bills={bills}
      month={month}
      frequency="WEEKLY"
      note={`Amounts are per week. Each chip is one charge in ${monthLabel(month)} — tick them off as they land, or click the count to do all at once. Totals are the full monthly cost.`}
    />
  );
}
