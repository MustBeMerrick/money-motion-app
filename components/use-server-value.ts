"use client";

import { useState, useTransition } from "react";

/**
 * A value the server owns, edited from the client.
 *
 * `useOptimistic` snaps back to the prop the instant the action's promise
 * resolves, on the assumption that the revalidated render has already landed.
 * It hasn't always: an action queued behind another one, or one whose flight
 * response races a navigation, resolves before its fresh payload is applied —
 * and the snap-back repaints the *old* number, which is the edit that "hangs
 * until you do it again".
 *
 * So hold what we sent until the prop itself reports it back (or changes to
 * anything else, which means the server has spoken). A rejected write drops
 * it immediately, since then the old value really is the truth.
 */
export function useServerValue<T>(value: T) {
  const [sent, setSent] = useState<{ v: T } | null>(null);
  const [seen, setSeen] = useState(value);
  const [busy, startTransition] = useTransition();

  // fresh props from the server — ours has served its purpose
  if (!Object.is(seen, value)) {
    setSeen(value);
    setSent(null);
  }

  function commit(next: T, write: () => unknown) {
    setSent({ v: next });
    startTransition(async () => {
      try {
        await write();
      } catch {
        setSent(null);
      }
    });
  }

  return [sent ? sent.v : value, commit, busy] as const;
}
