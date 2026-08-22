// Temporary instrumentation for the "field stays pending" bug. Both halves log
// one line per event to the SERVER's stdout, so `deploy/deploy.sh logs` shows
// the client and server sides of the same edit interleaved -- the phone has no
// console worth reading. Revert the commit that added this once we have an
// answer.

export type TraceDetail = Record<string, unknown>;

function line(source: string, event: string, detail: TraceDetail): string {
  const parts = Object.entries(detail).map(([k, v]) => `${k}=${JSON.stringify(v)}`);
  return `[mm-trace] ${source} ${event} ${parts.join(" ")}`;
}

/** Server side: straight to stdout, which is where docker logs reads from. */
export function traceServer(event: string, detail: TraceDetail = {}) {
  console.log(line("server", event, detail));
}

// One id per page load so a phone and a laptop hitting the same box stay
// distinguishable in the log.
let tabId: string | null = null;
function tab(): string {
  if (tabId === null) tabId = Math.random().toString(36).slice(2, 8);
  return tabId;
}

/**
 * Client side: console for a desktop browser, and a beacon so the same line
 * lands in the container log. sendBeacon is fire-and-forget and is not
 * cancelled by navigation, so it cannot itself perturb the action we are
 * trying to observe.
 */
export function traceClient(event: string, detail: TraceDetail = {}) {
  const full = { tab: tab(), ...detail };
  console.debug(line("client", event, full));
  try {
    const body = JSON.stringify({ event, detail: full });
    const blob = new Blob([body], { type: "application/json" });
    if (!navigator.sendBeacon("/api/trace", blob)) {
      void fetch("/api/trace", { method: "POST", body, keepalive: true });
    }
  } catch {
    // tracing must never break the thing it is tracing
  }
}
