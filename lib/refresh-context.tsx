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
// So a refresh is never started mid-flight; one asked for while we're busy is
// queued and fires the moment the current one commits, instead of being
// dropped or racing it.
const ScheduleRefreshContext = createContext<(() => void) | null>(null);

export function RefreshProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Gating on the `isPending` state would be wrong here. option-pilot-app can
  // read it from the render closure because it only ever calls this straight
  // from an event handler, against the latest committed render. We call it from
  // an async continuation -- after `await write()` -- so the closure is the one
  // from the render at click time, which still says "idle" while a refresh
  // kicked off by the previous tap is in flight. Two taps in quick succession
  // then fire two concurrent refreshes, and the older payload can land last and
  // repaint the newer edit away. Refs are read at call time, so they can't go
  // stale that way.
  const inFlightRef = useRef(false);
  const queuedRef = useRef(false);
  const wasPendingRef = useRef(false);

  function scheduleRefresh() {
    if (inFlightRef.current) {
      queuedRef.current = true;
      return;
    }
    inFlightRef.current = true;
    startTransition(() => router.refresh());
  }

  // Only a true -> false edge means a refresh actually finished. Testing
  // `!isPending` alone would also match the render right after startTransition,
  // before React has flipped it true, and clear the flag on a refresh that had
  // barely started.
  useEffect(() => {
    if (isPending) {
      wasPendingRef.current = true;
      return;
    }
    if (!wasPendingRef.current) return;
    wasPendingRef.current = false;
    inFlightRef.current = false;
    // Fire exactly one follow-up if anything asked while we were busy --
    // otherwise the edits that arrived during the refresh are never shown. It
    // has to be a fresh fetch, not a replay: the payload now in hand was
    // requested before those writes committed.
    if (queuedRef.current) {
      queuedRef.current = false;
      inFlightRef.current = true;
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
