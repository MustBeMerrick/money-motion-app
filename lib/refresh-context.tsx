"use client";

import { createContext, ReactNode, useContext, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";

// Ported from option-pilot-app, which solved this first.
//
// Every edit here is a server action followed by "show me the new numbers".
// The tempting way to do that is `refresh()` from next/cache, which piggybacks
// the re-rendered tree onto the action's own response -- but React then applies
// that update on whatever lane dispatched the action. From a transition (which
// is how you'd naturally write an optimistic button) it lands on a deferrable
// lane and can sit uncommitted until an unrelated click sweeps it up: the
// checkbox you ticked repaints, the daily budget it feeds does not.
//
// A router.refresh() fired from the client is its own router update, so it
// always commits. What it isn't is serialized: refresh() is fire-and-forget
// with no completion signal, and this app triggers it from many independent
// places (every chip, stepper, inline amount, delete). Firing a second while
// the first's RSC payload is still in flight lets them apply out of order.
// Gating on isPending means a new call is never fired mid-flight; one that
// arrives while we're busy is queued and fires the moment the current one
// commits, instead of being dropped or racing it.
const ScheduleRefreshContext = createContext<(() => void) | null>(null);

export function RefreshProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const requestedRef = useRef(false);

  // Reads `isPending` from this render's closure -- correct because this is
  // only ever invoked from event handlers, which run against the most recently
  // committed render, so it's never stale the way a ref frozen at mount would be.
  function scheduleRefresh() {
    if (isPending) {
      requestedRef.current = true;
      return;
    }
    startTransition(() => router.refresh());
  }

  // Once an in-flight refresh actually commits, fire exactly one follow-up if
  // anything asked while we were busy -- otherwise that edit is never shown.
  useEffect(() => {
    if (!isPending && requestedRef.current) {
      requestedRef.current = false;
      startTransition(() => router.refresh());
    }
  }, [isPending, router]);

  return (
    <ScheduleRefreshContext.Provider value={scheduleRefresh}>
      {children}
    </ScheduleRefreshContext.Provider>
  );
}

export function useScheduleRefresh(): () => void {
  const scheduleRefresh = useContext(ScheduleRefreshContext);
  if (!scheduleRefresh) {
    throw new Error("useScheduleRefresh must be used within a RefreshProvider");
  }
  return scheduleRefresh;
}
