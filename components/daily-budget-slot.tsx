import { getDashboardData } from "@/lib/data";
import { FloatingDailyBudget } from "./floating-daily-budget";

// Split out of the root layout so the layout itself doesn't await the month's
// queries: the shell (and the loading cartoon under it) streams immediately,
// and this card fills in when its data lands.
export async function DailyBudgetSlot() {
  const { snapshot } = await getDashboardData();
  return (
    <FloatingDailyBudget
      dailyBudgetCents={snapshot.dailyBudgetCents}
      tomorrowBudgetCents={snapshot.tomorrowBudgetCents}
      plannedNetCents={snapshot.plannedNetCents}
    />
  );
}
