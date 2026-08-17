import { getBillsWithStatus } from "@/lib/data";
import { monthOf, todayIso } from "@/lib/core/dates";
import { BillBoards } from "@/components/bill-tables";

export const dynamic = "force-dynamic";

export default async function MonthlyBillsPage() {
  const month = monthOf(todayIso());
  const bills = (await getBillsWithStatus(month)).filter((b) => b.frequency === "MONTHLY");

  return (
    <BillBoards
      bills={bills}
      month={month}
      frequency="MONTHLY"
      note="Charged once a month on the same day."
    />
  );
}
