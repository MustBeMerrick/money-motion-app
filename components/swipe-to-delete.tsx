"use client";

import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";

const BUTTON_WIDTH = 84;

/**
 * iOS-style swipe-left-to-reveal-delete for a mobile list row. Custom pointer
 * drag rather than a library, matching the reorder gesture in
 * extra-income-table.tsx — deleting still needs an explicit tap on the
 * revealed button, so a swipe alone can't fire it by accident.
 */
export function SwipeToDelete({
  onDelete,
  children,
}: {
  onDelete: () => Promise<void>;
  children: React.ReactNode;
}) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const openRef = useRef(false);

  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const startX = e.clientX;
    const startDragX = openRef.current ? -BUTTON_WIDTH : 0;
    let armed = false;
    let current = startDragX;

    function onMove(ev: PointerEvent) {
      const delta = ev.clientX - startX;
      if (!armed) {
        if (Math.abs(delta) < 6) return;
        // only swipes that start going left open the row; a rightward
        // start is someone scrolling the page, not swiping to delete
        if (delta > 0 && startDragX === 0) return;
        armed = true;
        setDragging(true);
      }
      current = Math.min(0, Math.max(-BUTTON_WIDTH, startDragX + delta));
      setDragX(current);
    }

    function onUp() {
      cleanup();
      setDragging(false);
      if (!armed) return;
      const open = current <= -BUTTON_WIDTH / 2;
      openRef.current = open;
      setDragX(open ? -BUTTON_WIDTH : 0);
    }

    function cleanup() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await onDelete();
    } catch {
      setDeleting(false);
      openRef.current = false;
      setDragX(0);
    }
  }

  return (
    <div className="relative touch-pan-y overflow-hidden">
      <div className="absolute inset-y-0 right-0 flex">
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          aria-label="Delete transaction"
          style={{ width: BUTTON_WIDTH }}
          className="flex flex-col items-center justify-center gap-0.5 bg-neg text-[11px] font-semibold text-white disabled:opacity-60"
        >
          <Trash2 size={16} />
          Delete
        </button>
      </div>
      <div
        onPointerDown={onPointerDown}
        style={{
          transform: `translateX(${dragX}px)`,
          transition: dragging ? "none" : "transform 200ms ease-out",
        }}
        className="relative bg-surface"
      >
        {children}
      </div>
    </div>
  );
}
