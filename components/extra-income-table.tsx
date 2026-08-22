"use client";

import { useRef, useState, useTransition } from "react";
import { GripVertical } from "lucide-react";
import type { ExtraIncome } from "@prisma/client";
import { deleteExtraIncome, reorderExtraIncome } from "@/app/actions";
import { Money } from "@/components/ui";
import { ExtraIncomeForm } from "@/components/forms";
import { ConfirmDelete } from "@/components/modal";

function reorder(list: ExtraIncome[], id: string, targetId: string): ExtraIncome[] {
  const from = list.findIndex((r) => r.id === id);
  const to = list.findIndex((r) => r.id === targetId);
  if (from === -1 || to === -1 || from === to) return list;
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function ExtraIncomeTable({ extras }: { extras: ExtraIncome[] }) {
  const [rows, setRows] = useState(extras);
  const [dragId, setDragId] = useState<string | null>(null);
  const [reordering, startTransition] = useTransition();
  const rowEls = useRef(new Map<string, HTMLTableRowElement>());

  // keep local order in sync when the server data changes underneath us —
  // but not mid-drag or while our own reorder is still in flight, or we'd
  // flash back to the stale order for the split second before it refreshes
  if (rows.length !== extras.length || rows.some((r, i) => r.id !== extras[i]?.id)) {
    if (dragId === null && !reordering) setRows(extras);
  }

  // custom pointer-driven drag instead of native HTML5 DnD — the native
  // drag ghost has an unavoidable "snap back to origin" animation in most
  // browsers, which fights with our own reordering visuals.
  //
  // Touch needs a long press first: a finger on the grip would otherwise be
  // read as a scroll, and the browser cancels the pointer stream the moment
  // it decides the page is scrolling. Holding arms the drag (the row lifts),
  // and sliding before that just lets the page scroll as normal.
  function startDrag(id: string, ev: React.PointerEvent) {
    if (ev.button !== 0) return;
    const touch = ev.pointerType !== "mouse";
    const startY = ev.clientY;
    let armed = false;
    let holdTimer: number | undefined;
    let latest = rows;

    function arm() {
      armed = true;
      setDragId(id);
      // a short tick confirms the lift on phones that support it
      navigator.vibrate?.(12);
    }

    function onMove(e: PointerEvent) {
      if (!armed) {
        // moved before the hold completed — treat it as a scroll, not a drag
        if (Math.abs(e.clientY - startY) > 8) cleanup();
        return;
      }
      e.preventDefault();
      for (const [rowId, el] of rowEls.current) {
        if (rowId === id) continue;
        const rect = el.getBoundingClientRect();
        if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
          latest = reorder(latest, id, rowId);
          setRows(latest);
          break;
        }
      }
    }

    function cleanup() {
      window.clearTimeout(holdTimer);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", cleanup);
    }

    function onUp() {
      const wasArmed = armed;
      cleanup();
      if (!wasArmed) return;
      setDragId(null);
      startTransition(() => reorderExtraIncome(latest.map((r) => r.id)));
    }

    if (touch) {
      holdTimer = window.setTimeout(arm, 300);
    } else {
      ev.preventDefault();
      arm();
    }

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", cleanup);
  }

  return (
    <table className="table-base select-none">
      <thead>
        <tr>
          <th />
          <th>Source</th>
          <th className="pr-3 text-right">Expected</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {rows.map((e) => (
          <tr
            key={e.id}
            ref={(el) => {
              if (el) rowEls.current.set(e.id, el);
              else rowEls.current.delete(e.id);
            }}
            className={`transition-[transform,box-shadow,background-color] duration-200 ${
              dragId === e.id
                ? "relative z-10 scale-[1.02] bg-surface-2 shadow-lg shadow-black/50"
                : ""
            }`}
          >
            <td
              className={`w-8 touch-none pr-0 pl-0 text-ink-3 lg:w-7 ${dragId === e.id ? "cursor-grabbing text-lime" : "cursor-grab"}`}
              title="Drag to reorder (press and hold on touch)"
              style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none" }}
              onPointerDown={(ev) => startDrag(e.id, ev)}
            >
              <span className="flex h-8 w-8 items-center justify-center lg:h-5 lg:w-4 lg:-translate-x-1 lg:justify-start">
                <GripVertical size={16} className="lg:size-3.5" />
              </span>
            </td>
            <td className="font-medium">
              <span className="flex items-center gap-1">
                <ExtraIncomeForm initial={e} trigger={<span className="cursor-pointer hover:text-lime">{e.source}</span>} />
              </span>
            </td>
            <td className="text-right">
              <Money cents={e.expectedCents} tone="plain" />
            </td>
            <td className="text-right">
              <ConfirmDelete onDelete={deleteExtraIncome.bind(null, e.id)} label="" />
            </td>
          </tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <td colSpan={4} className="text-center text-xs text-ink-3">
              No extra income this month
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
