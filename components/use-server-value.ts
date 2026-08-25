"use client";

import { useRef, useState } from "react";
import { useScheduleRefresh } from "@/lib/refresh-context";

/**
 * A value the server owns, edited from the client.
 *
 * `useOptimistic` snaps back to the prop the instant the action's promise
 * resolves, on the assumption that the re-render has already landed. It hasn't
 * always, and the snap-back repaints the *old* number. So hold what we sent
 * until the prop itself reports it back (or changes to anything else, which
 * means the server has spoken). A rejected write drops it immediately, since
 * then the old value really is the truth.
 *
 * The refresh that fetches that new prop is asked for here, from the client --
 * a router update React is obliged to commit. Relying on `refresh()` inside the
 * action instead put the re-render on the lane that dispatched the action,
 * where it could sit uncommitted; see lib/refresh-context.tsx.
 */
export function useServerValue<T>(value: T) {
  const scheduleRefresh = useScheduleRefresh();
  const [sent, setSent] = useState<{ v: T } | null>(null);
  const [saving, setSaving] = useState(false);
  const [seen, setSeen] = useState(value);
  // Writes go one at a time. Concurrent ones -- two quick taps on a stepper --
  // leave the order they commit in up to chance, so the row can end up holding
  // the older tap's value while the screen shows the newer one.
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  // state, not a ref: whether anything is still in flight decides whether an
  // incoming prop is allowed to overrule what is on screen, so it is read
  // during render. Decremented before the refresh that follows the write is
  // asked for, so it is always settled by the time that refresh's props land.
  const [inFlight, setInFlight] = useState(0);

  if (!Object.is(seen, value)) {
    setSeen(value);
    // Hold until the server reports back the value we actually sent. Dropping
    // on *any* change is wrong while a second write is in flight: the refresh
    // answering the first one carries a value that is already out of date, and
    // taking it repaints the newer edit away. Once nothing is in flight the
    // server has the last word either way -- which is also how an amount it
    // clamped or adjusted gets to overrule what we put on screen.
    if (sent && (Object.is(value, sent.v) || inFlight === 0)) {
      setSent(null);
      setSaving(false);
    }
  }

  function commit(next: T, write: () => unknown) {
    setSent({ v: next });
    setSaving(true);
    setInFlight((n) => n + 1);
    // Deliberately not inside startTransition: the write is dispatched at the
    // click's own priority, and the refresh that follows carries the update.
    queueRef.current = queueRef.current.then(write).then(
      () => {
        setInFlight((n) => n - 1);
        setSaving(false);
        scheduleRefresh();
      },
      (error) => {
        setInFlight((n) => n - 1);
        setSaving(false);
        setSent(null);
        // A page served by the previous deploy holds action ids the new build
        // does not have, so every save is rejected until it is reloaded --
        // which looks exactly like "the app stopped saving". Get the new build.
        if (isStaleDeployment(error)) window.location.reload();
      },
    );
  }

  return [sent ? sent.v : value, commit, saving] as const;
}

// Next throws UnrecognizedActionError when the action id in this page's bundle
// is missing from the running server -- i.e. the server was redeployed under us.
function isStaleDeployment(error: unknown): boolean {
  const text = String(error);
  return text.includes("Server Action") && text.includes("was not found on the server");
}
