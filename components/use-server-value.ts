"use client";

import { useState } from "react";
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

  // fresh props from the server — ours has served its purpose
  if (!Object.is(seen, value)) {
    setSeen(value);
    setSent(null);
    setSaving(false);
  }

  function commit(next: T, write: () => unknown) {
    setSent({ v: next });
    setSaving(true);
    // Deliberately not inside startTransition: the write is dispatched at the
    // click's own priority, and the refresh that follows carries the update.
    void (async () => {
      try {
        await write();
        scheduleRefresh();
      } catch (error) {
        setSent(null);
        // A page served by the previous deploy holds action ids the new build
        // does not have, so every save is rejected until it is reloaded --
        // which looks exactly like "the app stopped saving". Get the new build.
        if (isStaleDeployment(error)) window.location.reload();
      } finally {
        setSaving(false);
      }
    })();
  }

  return [sent ? sent.v : value, commit, saving] as const;
}

// Next throws UnrecognizedActionError when the action id in this page's bundle
// is missing from the running server -- i.e. the server was redeployed under us.
function isStaleDeployment(error: unknown): boolean {
  const text = String(error);
  return text.includes("Server Action") && text.includes("was not found on the server");
}
