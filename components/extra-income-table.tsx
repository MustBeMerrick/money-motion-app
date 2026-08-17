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
  // browsers, which fights with our own reordering visuals
  function startDrag(id: string, ev: React.PointerEvent) {
    if (ev.button !== 0) return;
    ev.preventDefault();
    setDragId(id);
    let latest = rows;

    function onMove(e: PointerEvent) {
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

    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setDragId(null);
      startTransition(() => reorderExtraIncome(latest.map((r) => r.id)));
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  return (
    <table className="table-base select-none">
      <thead>
        <tr>
          <th />
          <th>Source</th>
          <th className="text-right">Expected</th>
          <th className="text-right">Actions</th>
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
            className={dragId === e.id ? "opacity-40" : ""}
          >
            <td
              className={`w-4 text-ink-3 ${dragId === e.id ? "cursor-grabbing" : "cursor-grab"}`}
              title="Drag to reorder"
              onPointerDown={(ev) => startDrag(e.id, ev)}
            >
              <GripVertical size={14} />
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
