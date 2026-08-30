import { getDashboardData } from "@/lib/data";
import { FloatingDailyBudget } from "./floating-daily-budget";

// Rendered by each page that wants the card, never by a layout. A client
// refresh only re-renders the segments it marks stale, and the root layout is
// not one of them -- a card rendered up there keeps its first-paint numbers
// forever. See the note in app/layout.tsx.
//
// getDashboardData is React-cache()d per request, so a page that already reads
// it (the bills pages, piggy) pays nothing to render this as well.
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
