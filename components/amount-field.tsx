"use client";

import { useState, useSyncExternalStore } from "react";
import { Check, Delete } from "lucide-react";
import { formatCents, parseDollarsToCents } from "@/lib/core/money";
import { useServerValue } from "./use-server-value";

const COARSE = "(pointer: coarse)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(COARSE);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

// Touch devices get the in-app keypad; a mouse keeps plain typing. Read
// through useSyncExternalStore rather than an effect so the first client
// render already knows which one it is.
function useCoarsePointer() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(COARSE).matches,
    () => false,
  );
}

// Mouse editing has no keypad behind it, so clicking a value selects it and
// typing replaces it — everything but a leading "-", which keeps a credit
// card's balance negative without retyping the sign. On the keypad the first
// key press already replaces the amount, so it puts the caret at the end
// instead of highlighting the whole field.
function selectAmount(el: HTMLInputElement, coarse: boolean) {
  const start = coarse ? el.value.length : el.value.startsWith("-") ? 1 : 0;
  el.setSelectionRange(start, el.value.length);
}

type Key = { label: React.ReactNode; press: string; wide?: boolean; muted?: boolean };

const KEYS: Key[] = [
  { label: "1", press: "1" },
  { label: "2", press: "2" },
  { label: "3", press: "3" },
  { label: <Delete size={18} />, press: "back", muted: true },
  { label: "4", press: "4" },
  { label: "5", press: "5" },
  { label: "6", press: "6" },
  { label: "C", press: "clear", muted: true },
  { label: "7", press: "7" },
  { label: "8", press: "8" },
  { label: "9", press: "9" },
  { label: "±", press: "sign", muted: true },
  { label: ".", press: "." },
  { label: "0", press: "0" },
];

/**
 * A dollar amount that turns into an editable field on click. On phones,
 * tapping it opens an in-app keypad instead of the system keyboard — iOS has
 * no numeric layout with a minus sign, and the OS pad zooms the page in.
 */
export function AmountField({
  cents,
  onCommit,
  // savings is shown as an expense (negative) but stored positive
  negated = false,
  allowNegative = true,
  color,
  className = "",
}: {
  cents: number;
  onCommit: (nextCents: number) => unknown;
  negated?: boolean;
  allowNegative?: boolean;
  color: string;
  className?: string;
}) {
  const [value, setValue] = useState<string | null>(null);
  const [fresh, setFresh] = useState(true);
  // the amount we last saved stays on screen until the server re-renders with
  // it, so a slow (or dropped) revalidation never repaints the old number
  const [savedCents, save, pending] = useServerValue(cents);
  const coarse = useCoarsePointer();
  const editing = value !== null;

  // edit in the same terms the row displays: savings reads -$2,000.00, so the
  // field opens on -2000.00 rather than dropping the sign mid-edit
  const displayCents = negated ? -savedCents : savedCents;

  function open() {
    setValue((displayCents / 100).toFixed(2));
    setFresh(true);
  }

  function commit(raw: string | null) {
    setValue(null);
    const parsed = raw === null ? null : parseDollarsToCents(raw);
    if (parsed === null) return;
    const next = negated ? Math.abs(parsed) : parsed;
    if (next === savedCents) return;
    save(next, () => onCommit(next));
  }

  function press(key: string) {
    setValue((current) => {
      const v = current ?? "";
      if (key === "clear") return "";
      if (key === "back") return v.slice(0, -1);
      if (key === "sign") return v.startsWith("-") ? v.slice(1) : `-${v}`;
      // the first digit replaces the old amount, like a calculator — after
      // that it appends, so corrections don't wipe what you just typed
      const base = fresh ? (v.startsWith("-") ? "-" : "") : v;
      if (key === "." && base.includes(".")) return base;
      return base + key;
    });
    setFresh(false);
  }

  if (editing) {
    return (
      <>
        <input
          autoFocus
          value={value}
          inputMode={coarse ? "none" : "decimal"}
          className="input w-32 px-2 py-1 text-right text-sm lg:w-28 lg:py-0.5"
          onChange={(e) => {
            setValue(e.target.value);
            setFresh(false);
          }}
          onFocus={(e) => selectAmount(e.currentTarget, coarse)}
          onBlur={() => !coarse && commit(value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit(value);
            if (e.key === "Escape") setValue(null);
          }}
        />
        {coarse && (
          <>
            {/* tapping anywhere off the keypad saves, the same as tapping ✓ */}
            <div className="fixed inset-0 z-40" onPointerDown={() => commit(value)} />
            <div
              className="fixed inset-x-0 bottom-0 z-50 grid touch-none grid-cols-4 gap-px border-t border-line-2 bg-line-2 select-none pb-[env(safe-area-inset-bottom)]"
              // keep the field focused (and the caret visible) while tapping the
              // 1px seams between keys
              onPointerDown={(e) => e.preventDefault()}
            >
              {KEYS.map((k) => (
                <button
                  key={k.press}
                  type="button"
                  // act on the press itself: preventing pointerdown's default
                  // is what holds focus, but it also costs Safari's synthesised
                  // click, and a tap that drifts a few pixels loses it anyway —
                  // either way the click landed on the dismiss layer instead and
                  // shut the keypad
                  onPointerDown={(e) => {
                    e.preventDefault();
                    if (allowNegative || k.press !== "sign") press(k.press);
                  }}
                  className={`flex h-14 items-center justify-center bg-surface text-xl font-semibold active:bg-surface-2 ${
                    k.muted ? "text-ink-2" : "text-ink"
                  } ${!allowNegative && k.press === "sign" ? "opacity-30" : ""}`}
                >
                  {k.label}
                </button>
              ))}
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  commit(value);
                }}
                className="col-span-2 flex h-14 items-center justify-center bg-gradient-to-r from-forest to-lime text-[#08130a] active:opacity-90"
                aria-label="Save amount"
              >
                <Check size={22} strokeWidth={3} />
              </button>
            </div>
          </>
        )}
      </>
    );
  }

  return (
    <button
      type="button"
      title="Click to edit"
      onClick={open}
      className={`cursor-pointer rounded px-1 font-semibold tabular-nums transition-colors hover:bg-surface-2 ${color} ${
        pending ? "opacity-50" : ""
      } ${className}`}
    >
      {formatCents(displayCents)}
    </button>
  );
}
