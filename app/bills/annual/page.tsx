import { getBillsWithStatus } from "@/lib/data";
import { monthOf, todayIso } from "@/lib/core/dates";
import { BillBoards } from "@/components/bill-tables";

export const dynamic = "force-dynamic";

export default async function AnnualBillsPage() {
  const month = monthOf(todayIso());
  const bills = (await getBillsWithStatus(month)).filter((b) => b.frequency === "YEARLY");

  return (
    <BillBoards
      bills={bills}
      month={month}
      frequency="YEARLY"
      note="Charged once a year on their due date."
    />
  );
}
