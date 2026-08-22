"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { traceClient } from "@/lib/trace";

// How long to keep showing a value as "saving" before giving up on the write
// ever answering and going back to the server for the truth.
const CONFIRM_TIMEOUT_MS = 8000;

// The payload arrives in ~60ms, but React can leave the update unprocessed for
// seconds -- until any click sweeps it up. Both the action's own re-render and
// router.refresh() schedule at transition priority, which React is free to
// defer; a click is discrete priority, which forces a render pass that picks up
// everything pending. So escalate rather than refetching blindly:
//
//   FLUSH  a plain setState here is default priority, so React must render --
//          and that pass collects the payload already sitting in its queue.
//          No network, and it is what a click does for you.
//   NUDGE  the flush found nothing to collect, so the payload really is
//          missing: go and fetch it.
//   GIVE UP  nothing answered at all; show what the server has.
const FLUSH_MS = 400;
const NUDGE_MS = 1200;

let commitSeq = 0;

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
// Next throws UnrecognizedActionError when the action id in this page's bundle
// is missing from the running server -- i.e. the server was redeployed under us.
function isStaleDeployment(error: unknown): boolean {
  const text = String(error);
  return text.includes("Server Action") && text.includes("was not found on the server");
}

export function useServerValue<T>(value: T, label = "value") {
  const router = useRouter();
  const [sent, setSent] = useState<{ v: T } | null>(null);
  const [saving, setSaving] = useState(false);
  // bumped only to force a render pass; the value is never read
  const [, setFlushes] = useState(0);
  const [seen, setSeen] = useState(value);

  // fresh props from the server — ours has served its purpose
  if (!Object.is(seen, value)) {
    if (sent) traceClient("confirmed", { label, was: seen, now: value, sent: sent.v });
    setSeen(value);
    setSent(null);
    setSaving(false);
  }

  // effects run only after a commit, so a "confirmed" (render) with no
  // "committed" after it means React built the new tree and never showed it
  useEffect(() => {
    traceClient("committed", { label, value });
  }, [label, value]);

  // `sent` is a fresh object per commit, so both timers restart on every edit
  // and are cleared the moment the server's own render confirms it. The ref is
  // belt and braces: a timer that somehow outlives its cleanup still checks
  // whether this edit is genuinely unconfirmed before spending a refresh on it.
  const pendingRef = useRef(sent);
  useEffect(() => {
    pendingRef.current = sent;
    if (!sent) return;
    const flush = setTimeout(() => {
      if (pendingRef.current !== sent) return;
      traceClient("flush", { label });
      setFlushes((n) => n + 1);
    }, FLUSH_MS);
    const nudge = setTimeout(() => {
      if (pendingRef.current !== sent) return;
      traceClient("nudge", { label });
      router.refresh();
    }, NUDGE_MS);
    const giveUp = setTimeout(() => {
      // the write never answered: drop our copy and refetch, so what shows is
      // what the server has rather than what we hoped it took
      traceClient("timeout", { label, afterMs: CONFIRM_TIMEOUT_MS });
      setSaving(false);
      setSent(null);
      router.refresh();
    }, CONFIRM_TIMEOUT_MS);
    return () => {
      clearTimeout(flush);
      clearTimeout(nudge);
      clearTimeout(giveUp);
    };
  }, [sent, router, label]);

  function commit(next: T, write: () => unknown) {
    const id = ++commitSeq;
    const started = Date.now();
    traceClient("send", { label, id, from: value, to: next });
    setSent({ v: next });
    setSaving(true);
    // Deliberately NOT inside startTransition. Dispatching a server action from
    // within a transition attaches the response's router update to that
    // transition, and transition work is interruptible -- which is how an
    // arrived payload ends up sitting unrendered until an unrelated click
    // bumps priority. Called from a plain handler, Next schedules that update
    // on its own. We track pending ourselves, so we need nothing useTransition
    // offers.
    void (async () => {
      try {
        await write();
        traceClient("resolved", { label, id, ms: Date.now() - started });
      } catch (error) {
        traceClient("rejected", { label, id, ms: Date.now() - started, error: String(error) });
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
