"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

// How long to keep showing a value as "saving" before giving up on the write
// ever answering and going back to the server for the truth.
const CONFIRM_TIMEOUT_MS = 8000;

/**
 * A value the server owns, edited from the client.
 *
 * `useOptimistic` snaps back to the prop the instant the action's promise
 * resolves, on the assumption that the revalidated render has already landed.
 * It hasn't always: an action queued behind another one, or one whose flight
 * response races a navigation, resolves before its fresh payload is applied —
 * and the snap-back repaints the *old* number.
 *
 * So hold what we sent until the prop itself reports it back (or changes to
 * anything else, which means the server has spoken). A rejected write drops it
 * immediately, since then the old value really is the truth.
 *
 * Nothing here waits on a signal that can hang. The "saving" state is our own,
 * not the transition's pending flag: an action whose response never arrives
 * used to dim the field forever with no way back. Now it times out, re-reads
 * from the server, and shows whatever actually got written.
 */
export function useServerValue<T>(value: T) {
  const router = useRouter();
  const [sent, setSent] = useState<{ v: T } | null>(null);
  const [saving, setSaving] = useState(false);
  const [seen, setSeen] = useState(value);
  const [, startTransition] = useTransition();

  // fresh props from the server — ours has served its purpose
  if (!Object.is(seen, value)) {
    setSeen(value);
    setSent(null);
    setSaving(false);
  }

  useEffect(() => {
    if (!saving) return;
    const timer = setTimeout(() => {
      // the write never answered: drop our copy and refetch, so what shows is
      // what the server has rather than what we hoped it took
      setSaving(false);
      setSent(null);
      router.refresh();
    }, CONFIRM_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [saving, router]);

  function commit(next: T, write: () => unknown) {
    setSent({ v: next });
    setSaving(true);
    startTransition(async () => {
      try {
        await write();
      } catch {
        setSent(null);
      } finally {
        setSaving(false);
      }
    });
  }

  return [sent ? sent.v : value, commit, saving] as const;
}
