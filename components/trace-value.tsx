"use client";

import { useEffect } from "react";
import { traceClient } from "@/lib/trace";

/**
 * Temporary -- see lib/trace.ts. Logs a server-rendered number from inside an
 * effect, which only runs after React *commits*. Pair it with the "confirmed"
 * line (logged during render): render without a matching commit is a tree that
 * React built and then sat on, which is what a stale card on screen looks like.
 */
export function TraceValue({ label, value }: { label: string; value: number }) {
  useEffect(() => {
    traceClient("committed", { label, value });
  }, [label, value]);
  return null;
}
