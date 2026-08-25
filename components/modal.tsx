"use client";

import { useEffect, useState } from "react";
import { useScheduleRefresh } from "@/lib/refresh-context";
import { Trash2, X } from "lucide-react";

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="card w-full max-w-md border-line-2 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold">{title}</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="cursor-pointer rounded-md p-1 text-ink-3 hover:bg-surface-2 hover:text-ink"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Two-click delete: first click arms, second click fires. No browser dialogs.
export function ConfirmDelete({
  onDelete,
  label = "Delete",
}: {
  onDelete: () => Promise<void>;
  label?: string;
}) {
  const scheduleRefresh = useScheduleRefresh();
  const [armed, setArmed] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!armed) return setArmed(true);
        setPending(true);
        void (async () => {
          try {
            await onDelete();
            scheduleRefresh();
          } finally {
            setArmed(false);
            setPending(false);
          }
        })();
      }}
      className={`btn btn-danger px-2 py-1 text-xs ${armed ? "border-neg bg-neg/15" : ""} ${pending ? "opacity-50" : ""}`}
    >
      <Trash2 size={13} />
      {armed ? "Sure?" : label}
    </button>
  );
}
