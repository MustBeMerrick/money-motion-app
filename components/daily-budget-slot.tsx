import { getDashboardData } from "@/lib/data";
import { FloatingDailyBudget } from "./floating-daily-budget";

// Rendered inline by the root layout, deliberately without a Suspense boundary
// around it -- see the note in app/layout.tsx. It used to stream separately so
// the shell painted first, but that boundary was gating the commit of every
// server action's re-render.
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
