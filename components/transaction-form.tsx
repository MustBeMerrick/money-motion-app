"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Plus, X } from "lucide-react";
import type { Account, Payee, TransactionType } from "@prisma/client";
import { getTransactionFormOptions, saveTransaction } from "@/app/actions";
import { evaluateArithmetic } from "@/lib/core/arithmetic";
import {
  CATEGORY_TREE,
  INCOME_CATEGORY_TREE,
  categoryColor,
  categoryEmoji,
  categoryLabel,
  type CategoryKey,
} from "@/lib/core/categories";
import { todayIso } from "@/lib/core/dates";
import { useScheduleRefresh } from "@/lib/refresh-context";

type Options = { accounts: Account[]; payees: Payee[] };

export type EditingTransaction = {
  id: string;
  type: TransactionType;
  reimbursement: boolean;
  date: string;
  amountCents: number;
  accountId: string;
  toAccountId?: string | null;
  payeeName?: string | null;
  category?: CategoryKey | null;
  memo?: string | null;
};

// Reimburse is its own button in the UI, but under the hood it's still just
// an EXPENSE with the reimbursement flag set (see saveTransaction) — the
// distinction only exists so a future day/month rollup can net it against
// that day's expense total instead of adding it to income.
type UiType = "EXPENSE" | "INCOME" | "TRANSFER" | "REIMBURSE";

const TYPES: { value: UiType; label: string }[] = [
  { value: "EXPENSE", label: "Expense" },
  { value: "INCOME", label: "Income" },
  { value: "TRANSFER", label: "Transfer" },
  { value: "REIMBURSE", label: "Reimburse" },
];

// Each type reads as a distinct accent rather than a full-bleed color block,
// so the modal still fits the app's dark-theme-only surface.
const TYPE_ACCENT: Record<UiType, string> = {
  EXPENSE: "text-neg",
  INCOME: "text-pos",
  TRANSFER: "text-info",
  REIMBURSE: "text-warn",
};

// Blends the category's hue(s) into the surface color rather than using them
// flat — a subtle tint, not a colored block, so the modal still reads as
// this app's dark theme.
function categoryBackground(colors: string[] | null): string | undefined {
  if (!colors || colors.length === 0) return undefined;
  if (colors.length === 1) {
    return `linear-gradient(160deg, color-mix(in srgb, ${colors[0]} 65%, var(--surface)), var(--surface) 90%)`;
  }
  const stops = colors
    .map((c, i) => `color-mix(in srgb, ${c} 60%, var(--surface)) ${Math.round((i / (colors.length - 1)) * 90)}%`)
    .join(", ");
  return `linear-gradient(160deg, ${stops}, var(--surface) 100%)`;
}

function accountSwatch(a: Account): string {
  const color = a.color ?? "var(--ink-3)";
  return a.color2 && a.color2 !== color ? `linear-gradient(120deg, ${color}, ${a.color2})` : color;
}

// Native <select> can't style individual <option>s (no per-row swatch, cross
// browser), so the account pickers use this custom listbox instead — closes
// on outside click or Escape, same as any dropdown.
function AccountSelect({
  accounts,
  value,
  onChange,
  className = "",
}: {
  accounts: Account[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = accounts.find((a) => a.id === value);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="input flex cursor-pointer items-center gap-2 text-left"
      >
        <span
          className="h-4 w-4 shrink-0 rounded-full border border-line-2"
          style={{ background: selected ? accountSwatch(selected) : "var(--ink-3)" }}
        />
        <span className="min-w-0 flex-1 truncate">{selected?.name ?? "Select account"}</span>
        <ChevronDown size={14} className="shrink-0 text-ink-3" />
      </button>
      {open && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-line-2 bg-surface-2 py-1 shadow-lg shadow-black/40">
          {accounts.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => {
                  onChange(a.id);
                  setOpen(false);
                }}
                className={`flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-surface ${
                  a.id === value ? "text-lime" : "text-ink"
                }`}
              >
                <span
                  className="h-4 w-4 shrink-0 rounded-full border border-line-2"
                  style={{ background: accountSwatch(a) }}
                />
                <span className="min-w-0 flex-1 truncate">{a.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function flattenCategoryKeys(tree: typeof CATEGORY_TREE): CategoryKey[] {
  return tree.flatMap((c) => [c.key, ...(c.children?.map((s) => s.key) ?? [])]);
}

// Native <select> shows the selected <option>'s own text in its closed
// state — there's no way to show the emoji only in the open list and not
// once picked, since both read from the same text. A custom listbox sidesteps
// that (same pattern as AccountSelect above), and as a side effect a <button>
// naturally sizes to its own content instead of a <select>'s widest option,
// so the old hidden-measuring-select trick to keep the closed control from
// ballooning to fit "Credit Card Payment" is no longer needed either.
function CategorySelect({
  tree,
  value,
  onChange,
  className = "",
}: {
  tree: typeof CATEGORY_TREE;
  value: CategoryKey | "";
  onChange: (key: CategoryKey | "") => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const keys = flattenCategoryKeys(tree);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={`relative inline-block max-w-full ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-1 max-w-full cursor-pointer truncate rounded-md border border-line-2 bg-surface-2 px-2 py-1 text-left text-xs text-ink-2 outline-none"
      >
        {value ? categoryLabel(value) : "No category"}
      </button>
      {open && (
        <ul className="absolute z-20 mt-1 max-h-56 w-max max-w-[calc(100vw-2.5rem)] overflow-auto rounded-lg border border-line-2 bg-surface-2 py-1 text-xs shadow-lg shadow-black/40">
          <li>
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className={`block w-full cursor-pointer px-3 py-1.5 text-left whitespace-nowrap hover:bg-surface ${
                value === "" ? "text-lime" : "text-ink"
              }`}
            >
              No category
            </button>
          </li>
          {keys.map((key) => (
            <li key={key}>
              <button
                type="button"
                onClick={() => {
                  onChange(key);
                  setOpen(false);
                }}
                className={`block w-full cursor-pointer px-3 py-1.5 text-left whitespace-nowrap hover:bg-surface ${
                  key === value ? "text-lime" : "text-ink"
                }`}
              >
                {categoryEmoji(key)} {categoryLabel(key)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function TransactionModal({
  onClose,
  options,
  editing,
}: {
  onClose: () => void;
  options: Options;
  editing?: EditingTransaction;
}) {
  const scheduleRefresh = useScheduleRefresh();
  const [uiType, setUiType] = useState<UiType>(
    editing ? (editing.type === "EXPENSE" && editing.reimbursement ? "REIMBURSE" : editing.type) : "EXPENSE",
  );
  const [payeeName, setPayeeName] = useState(editing?.payeeName ?? "");
  const [category, setCategory] = useState<CategoryKey | "">(editing?.category ?? "");
  const [amountRaw, setAmountRaw] = useState(editing ? (editing.amountCents / 100).toFixed(2) : "");
  const [date, setDate] = useState(editing?.date ?? todayIso());
  const [accountId, setAccountId] = useState(editing?.accountId ?? options.accounts[0]?.id ?? "");
  const [toAccountId, setToAccountId] = useState(
    editing?.toAccountId ?? options.accounts.find((a) => a.id !== options.accounts[0]?.id)?.id ?? "",
  );
  const [memo, setMemo] = useState(editing?.memo ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const type: TransactionType = uiType === "REIMBURSE" ? "EXPENSE" : uiType;
  const reimbursement = uiType === "REIMBURSE";

  // Sliding pill behind the active tab label, tracking its actual pixel
  // position/width (labels aren't equal width) instead of a fixed fraction.
  const tabRefs = useRef<Partial<Record<UiType, HTMLButtonElement>>>({});
  const [pillRect, setPillRect] = useState<{ left: number; width: number } | null>(null);
  useLayoutEffect(() => {
    const el = tabRefs.current[uiType];
    if (el) setPillRect({ left: el.offsetLeft, width: el.offsetWidth });
  }, [uiType]);

  const categoryTree = type === "INCOME" ? INCOME_CATEGORY_TREE : CATEGORY_TREE;
  const modalBackground = type !== "TRANSFER" ? categoryBackground(categoryColor(category)) : undefined;

  // Prefix match against what's typed so far, capped to three -- shown as
  // tappable chips near Save instead of a native datalist popover, so each
  // one can carry its usual category's emoji and color, not just its name.
  const payeeSuggestions =
    type !== "TRANSFER" && payeeName.trim()
      ? options.payees
          .filter((p) => p.name.toLowerCase().startsWith(payeeName.trim().toLowerCase()) && p.name !== payeeName)
          .slice(0, 3)
      : [];
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Picking a known payee learns its usual category and account — the fix for
  // the spreadsheet habit of always defaulting to the same card.
  function applyPayee(name: string) {
    setPayeeName(name);
    const match = options.payees.find((p) => p.name.toLowerCase() === name.trim().toLowerCase());
    if (!match) return;
    setCategory((match.category as CategoryKey) ?? "");
    if (match.defaultAccountId && options.accounts.some((a) => a.id === match.defaultAccountId)) {
      setAccountId(match.defaultAccountId);
    }
  }

  // Sign comes from the Expense/Income/Transfer toggle, not from what's typed
  // — a leading "-" is a habit carried over from the balance fields elsewhere
  // in the app, so it's just the magnitude here.
  const previewCents = (() => {
    const evaluated = evaluateArithmetic(amountRaw);
    return evaluated === null ? null : Math.round(Math.abs(evaluated) * 100);
  })();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (previewCents === null || previewCents <= 0) {
      setError("Enter a valid amount");
      return;
    }
    if (type === "TRANSFER" && (!toAccountId || toAccountId === accountId)) {
      setError("Pick a different destination account");
      return;
    }
    setSaving(true);
    setError(null);
    const fd = new FormData();
    if (editing) fd.set("id", editing.id);
    fd.set("type", type);
    fd.set("date", date);
    fd.set("amount", (previewCents / 100).toFixed(2));
    fd.set("accountId", accountId);
    if (type === "TRANSFER") fd.set("toAccountId", toAccountId);
    if (type !== "TRANSFER") {
      fd.set("payeeName", payeeName.trim());
      if (category) fd.set("category", category);
    }
    fd.set("memo", memo.trim());
    if (reimbursement) fd.set("reimbursement", "on");
    try {
      await saveTransaction(fd);
      onClose();
      scheduleRefresh();
    } catch {
      setError("Couldn't save — check the fields.");
      setSaving(false);
    }
  }

  const emoji = categoryEmoji(category) ?? "🏷️";

  // Portalled to <body>: this component can be triggered from inside the
  // sidebar's fixed <aside>/<header>, and `position: fixed` ancestors always
  // open their own stacking context, which traps a nested z-50 overlay below
  // ordinary page content that happens to come later in the DOM (piggy/extra
  // income rows, in this app). Rendering at the body root sidesteps that.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 lg:items-center lg:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* mobile: full-screen sheet sliding up from the bottom, capped short
          of the top so the dimmed app behind it stays visible as a cue this
          is a sub-screen, not a new page — desktop keeps the small centered
          popup */}
      <div
        className="card h-[calc(100dvh-3rem)] w-full overflow-y-auto rounded-b-none border-line-2 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl transition-[background-image] duration-500 lg:h-auto lg:max-w-md lg:overflow-visible lg:rounded-2xl lg:pb-5"
        style={{
          ...(!isDesktop ? { animation: "sheet-up 220ms ease-out" } : {}),
          // backgroundImage only, never the `background` shorthand -- that
          // shorthand also resets background-color to transparent on the
          // inline declaration, so toggling it off (back to "No category")
          // let the dimmed backdrop show through for a frame before the
          // .card class's bg-surface caught back up. Leaving background-color
          // alone (always from .card) and only swapping the image keeps the
          // surface opaque throughout the transition.
          backgroundImage: modalBackground ?? "none",
        }}
      >
        <div className="-mx-5 -mt-5 mb-3 flex justify-center pt-2 lg:hidden">
          <span className="h-1 w-10 rounded-full bg-line-2" />
        </div>
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="relative flex gap-1 rounded-full bg-surface-2 p-1">
            {pillRect && (
              <span
                aria-hidden
                className="absolute top-1 bottom-1 rounded-full bg-surface transition-[left,width] duration-200 ease-out"
                style={{ left: pillRect.left, width: pillRect.width }}
              />
            )}
            {TYPES.map((t) => (
              <button
                key={t.value}
                ref={(el) => {
                  if (el) tabRefs.current[t.value] = el;
                }}
                type="button"
                onClick={() => {
                  setUiType(t.value);
                  // Income and Expense/Reimburse draw from different category
                  // lists, so a selection from one wouldn't be valid in the other
                  setCategory("");
                }}
                className={`relative z-10 cursor-pointer rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  uiType === t.value ? TYPE_ACCENT[t.value] : "text-ink-3 hover:text-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="cursor-pointer rounded-md p-1 text-ink-3 hover:bg-surface-2 hover:text-ink"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3.5">
          {type !== "TRANSFER" && (
            // items-start, not items-center: the category select adds a
            // second row under Payee, and centering against that whole
            // two-row block pushed the amount field down instead of level
            // with Payee itself
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-lg">
                {emoji}
              </span>
              {/* min-w-0 overrides the flex default of min-width:auto (sized
                  to content) -- without it this column silently grows to fit
                  the category select's natural width instead of being capped
                  at its fair share of the row */}
              <div className="relative min-w-0 flex-1">
                <input
                  value={payeeName}
                  onChange={(e) => applyPayee(e.target.value)}
                  placeholder="Payee"
                  className="input w-full"
                  required
                />
                <CategorySelect tree={categoryTree} value={category} onChange={setCategory} />
              </div>
              <input
                value={amountRaw}
                onChange={(e) => setAmountRaw(e.target.value)}
                placeholder="0.00"
                inputMode="decimal"
                className="input w-28 text-right text-lg font-semibold"
              />
            </div>
          )}

          {type === "TRANSFER" && (
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-lg">
                🔁
              </span>
              <input
                value={amountRaw}
                onChange={(e) => setAmountRaw(e.target.value)}
                placeholder="0.00"
                inputMode="decimal"
                className="input ml-auto w-28 text-right text-lg font-semibold"
              />
            </div>
          )}

          {type === "TRANSFER" ? (
            <>
              {/* same fixed w-36 as the non-transfer date field below -- a
                  full-width native date input hits the same overflow past
                  its own box on mobile that a 50/50 grid split did */}
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input w-36"
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <AccountSelect accounts={options.accounts} value={accountId} onChange={setAccountId} />
                <AccountSelect accounts={options.accounts} value={toAccountId} onChange={setToAccountId} />
              </div>
            </>
          ) : (
            // a fixed, equal width on both -- letting either one flex/grow
            // (even within a minmax floor) is what let the date input's
            // native rendering spill past its box again; pinning both to the
            // exact same width that was already proven safe avoids that
            // entirely, at the cost of some empty space to the right
            <div className="flex gap-3">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input w-36 shrink-0"
                required
              />
              <AccountSelect
                accounts={options.accounts}
                value={accountId}
                onChange={setAccountId}
                className="w-36 shrink-0"
              />
            </div>
          )}

          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="Memo (optional)"
            rows={2}
            className="input resize-none"
          />

          {error && <p className="text-xs text-neg">{error}</p>}

          <div className="mt-1 flex justify-end gap-2">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? "Saving…" : "Save"}
            </button>
          </div>

          {payeeSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {payeeSuggestions.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPayee(p.name)}
                  style={{ background: categoryBackground(categoryColor(p.category)) ?? "var(--surface-2)" }}
                  className="flex max-w-full cursor-pointer items-center gap-1.5 rounded-full border border-line-2 px-2.5 py-1 text-xs text-ink-2 hover:border-lime/50"
                >
                  <span className="shrink-0">{categoryEmoji(p.category) ?? "🏷️"}</span>
                  <span className="min-w-0 truncate">{p.name}</span>
                </button>
              ))}
            </div>
          )}
        </form>
      </div>
    </div>,
    document.body,
  );
}

/** Global "+" button: opens the add-transaction modal from anywhere in the app. */
export function AddTransactionFab({
  className = "",
  label,
}: {
  className?: string;
  label?: string;
}) {
  const [options, setOptions] = useState<Options | null>(null);
  const [loading, setLoading] = useState(false);

  async function open() {
    setLoading(true);
    try {
      setOptions(await getTransactionFormOptions());
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        disabled={loading}
        aria-label="Add transaction"
        className={className}
      >
        <Plus size={label ? 15 : 20} strokeWidth={2.5} />
        {label}
      </button>
      {options && <TransactionModal options={options} onClose={() => setOptions(null)} />}
    </>
  );
}
