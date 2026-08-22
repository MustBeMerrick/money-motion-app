"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// The server's answer to an edit arrives in ~60ms, but React schedules the
// update that applies it at transition priority, which it is free to defer --
// measured sitting unprocessed for seconds until an unrelated click swept it
// up. A click works because it is discrete priority: React must render for it,
// and that pass collects every lane already pending.
//
// So poll with a plain setState, which is default priority and costs one render
// pass and no network. Across 21 traced edits this recovered every deferred
// update within 2-9ms and the refetch below never once had to run -- the data
// was always already in React's queue, only unprocessed.
const FLUSH_MS = 150;
// The flush found nothing to collect, so the answer really is missing: refetch.
const REFETCH_MS = 1200;
// Nothing answered at all -- stop showing the edit as if it took.
const GIVE_UP_MS = 8000;

/**
 * A value the server owns, edited from the client.
 *
 * `useOptimistic` snaps back to the prop the instant the action's promise
 * resolves, on the assumption that the re-render has already landed. It hasn't
 * always, and the snap-back repaints the *old* number. So hold what we sent
 * until the prop itself reports it back (or changes to anything else, which
 * means the server has spoken). A rejected write drops it immediately, since
 * then the old value really is the truth.
 */
export function useServerValue<T>(value: T) {
  const router = useRouter();
  const [sent, setSent] = useState<{ v: T } | null>(null);
  const [saving, setSaving] = useState(false);
  const [seen, setSeen] = useState(value);
  // bumped only to force a render pass; the value is never read
  const [, setFlushes] = useState(0);

  // fresh props from the server — ours has served its purpose
  if (!Object.is(seen, value)) {
    setSeen(value);
    setSent(null);
    setSaving(false);
  }

  // `sent` is a fresh object per commit, so these restart on every edit and are
  // cleared the moment the server's own render confirms it. The ref is belt and
  // braces: a timer that outlives its cleanup still checks that this edit is
  // genuinely unconfirmed before acting.
  const pendingRef = useRef(sent);
  useEffect(() => {
    pendingRef.current = sent;
    if (!sent) return;
    const flush = setInterval(() => {
      if (pendingRef.current === sent) setFlushes((n) => n + 1);
    }, FLUSH_MS);
    const refetch = setTimeout(() => {
      if (pendingRef.current === sent) router.refresh();
    }, REFETCH_MS);
    const giveUp = setTimeout(() => {
      if (pendingRef.current !== sent) return;
      setSaving(false);
      setSent(null);
      router.refresh();
    }, GIVE_UP_MS);
    return () => {
      clearInterval(flush);
      clearTimeout(refetch);
      clearTimeout(giveUp);
    };
  }, [sent, router]);

  function commit(next: T, write: () => unknown) {
    setSent({ v: next });
    setSaving(true);
    // Deliberately not inside startTransition: dispatching a server action from
    // within one attaches the response's update to that transition, and we want
    // as little of this on a deferrable lane as possible.
    void (async () => {
      try {
        await write();
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
