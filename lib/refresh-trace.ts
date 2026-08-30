"use client";

/**
 * Diagnostic tracing for issue #1 (edits sitting unpainted until an unrelated
 * click). Off by default — the bug only reproduces deployed, so enabling it
 * has to be a runtime flip, not a rebuild: run `localStorage.mm_trace = "1"`
 * in the deployed tab's console, then reload.
 *
 * Partitions a stall the way the issue thread left it:
 *   - no RSC fetch to this pathname after the edit -> client never asked
 *     (check inFlightRef gating in refresh-context.tsx)
 *   - fetch happened, response tiny (~64B) -> server didn't mark anything
 *     stale; the segment cache is the story, not this app
 *   - fetch happened, response full, screen still stale -> React commit
 *     problem; capture a Performance profile across the next repro
 *
 * All output goes to the console (filter it with the "mm-trace" pattern) and
 * as performance.mark() entries, so a recorded Performance profile lines the
 * edit/refresh/fetch events up against the actual paint.
 */

const ENABLED =
  typeof window !== "undefined" &&
  (process.env.NEXT_PUBLIC_TRACE_REFRESH === "1" || window.localStorage.getItem("mm_trace") === "1");

const STALE_MS = Number(process.env.NEXT_PUBLIC_TRACE_STALE_MS) || 2500;
const MAX_LOG = 200;

type LogEntry = { t: number; kind: string; detail?: unknown };
const log: LogEntry[] = [];

function record(kind: string, detail?: unknown) {
  if (!ENABLED) return;
  log.push({ t: performance.now(), kind, detail });
  if (log.length > MAX_LOG) log.shift();
  try {
    performance.mark(`mm:${kind}`);
  } catch {
    // best-effort — the console line below carries the detail either way
  }
  console.debug(`[mm-trace ${(performance.now() / 1000).toFixed(3)}s] ${kind}`, detail ?? "");
}

// ---- resource-timing watch: did the RSC fetch actually happen? ----

type ResourceEntry = { t: number; url: string; transferSize: number; duration: number };
const resourceLog: ResourceEntry[] = [];
let watching = false;

function startResourceWatch() {
  if (!ENABLED || watching) return;
  watching = true;
  // A back/forward gesture (or browser button) dispatches Next's own
  // ACTION_RESTORE through the same router action queue as our refreshes. If
  // it preempts a still-pending refresh, Next marks that refresh "discarded"
  // and never resolves its promise -- see app-router-instance.js's
  // handleResult(): the discarded branch returns without calling
  // action.resolve(). Whatever's suspended on that promise (via use()) then
  // never gets pinged to retry. This listener exists to catch that
  // coincidence, since nothing else makes it visible.
  window.addEventListener("popstate", () => record("browser:popstate"));
  if (typeof PerformanceObserver === "undefined") return;
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const e = entry as PerformanceResourceTiming;
      if (e.initiatorType !== "fetch") continue;
      let path: string;
      try {
        path = new URL(e.name).pathname;
      } catch {
        continue;
      }
      if (path !== window.location.pathname) continue;
      const rec: ResourceEntry = {
        t: e.startTime,
        url: e.name,
        transferSize: e.transferSize,
        duration: Math.round(e.duration),
      };
      resourceLog.push(rec);
      if (resourceLog.length > MAX_LOG) resourceLog.shift();
      record("resource:rsc-fetch", { transferSize: rec.transferSize, durationMs: rec.duration });
    }
  });
  observer.observe({ type: "resource", buffered: true });
}

// ---- per-edit stale watchdog ----

let editSeq = 0;

/**
 * Call when an edit is sent to the server. Returns `confirm()`, to be called
 * once the server's value has actually been seen back on screen. If confirm()
 * hasn't run within STALE_MS, dumps everything known about the stall: the
 * recent refresh/edit event log and any RSC fetches observed since the edit —
 * enough to tell which of the three failure shapes above this one is.
 */
function watchEdit(description: string) {
  if (!ENABLED) return () => {};
  const id = ++editSeq;
  const sentAt = performance.now();
  record("edit:sent", { id, description });
  let confirmed = false;
  const timer = setTimeout(() => {
    if (confirmed) return;
    const elapsedMs = Math.round(performance.now() - sentAt);
    const recentLog = log.slice(-30);
    const recentResources = resourceLog.filter((r) => r.t >= sentAt - 50);
    console.error(
      `%c[mm-trace] STALE: edit #${id} (${description}) unconfirmed after ${elapsedMs}ms`,
      "color: #ff5e5e; font-weight: bold",
      { recentLog, recentResources },
    );
  }, STALE_MS);
  return function confirm() {
    if (confirmed) return;
    confirmed = true;
    clearTimeout(timer);
    const elapsedMs = Math.round(performance.now() - sentAt);
    record("edit:confirmed", { id, description, elapsedMs });
  };
}

export const refreshTrace = { record, startResourceWatch, watchEdit, ENABLED };
