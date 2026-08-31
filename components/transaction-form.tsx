"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, X } from "lucide-react";
import type { Account, Payee, TransactionType } from "@prisma/client";
import { getTransactionFormOptions, saveTransaction } from "@/app/actions";
import { evaluateArithmetic } from "@/lib/core/arithmetic";
import { CATEGORY_TREE, INCOME_CATEGORY_TREE, categoryEmoji, categoryLabel, type CategoryKey } from "@/lib/core/categories";
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

  // Desktop: browsers size a closed <select> to fit its widest *option*, not
  // the one currently selected -- so with "Credit Card Payment" in the list,
  // picking "Wedding" still rendered a wide box. Measuring in a hidden
  // <select> of our own (one option, same classes as the visible one) and
  // setting the real select's width explicitly gets it to track the current
  // text instead -- has to be a real select, not a measuring <span>, because
  // mobile Safari renders a <select>'s text noticeably wider than identical
  // text in a plain span, by an amount that grows with the string.
  //
  // Mobile: pinned to the payee field's width instead of chasing that
  // per-device rendering gap with an ever-growing box. A shrink-to-fit font
  // size was tried here too, computed the same way, but iOS Safari didn't
  // budge on the select's rendered text size no matter what was set via JS
  // or CSS -- so a too-long label (e.g. "Auto: Registration") truncates with
  // an ellipsis instead, which is reliably respected for a closed select's
  // text across browsers, unlike an explicit smaller font-size apparently is.
  const categoryTree = type === "INCOME" ? INCOME_CATEGORY_TREE : CATEGORY_TREE;
  const categoryDisplay = category ? categoryLabel(category) : "No category";
  const categoryMeasureRef = useRef<HTMLSelectElement>(null);
  const [categoryWidth, setCategoryWidth] = useState<number>();
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (categoryMeasureRef.current) {
      // small margin only for rounding/antialiasing -- the hidden select
      // already renders its own dropdown arrow, so that's accounted for
      setCategoryWidth(categoryMeasureRef.current.offsetWidth + 4);
    }
  }, [categoryDisplay]);

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="card w-full max-w-md border-line-2 shadow-2xl">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex gap-1 rounded-full bg-surface-2 p-1">
            {TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => {
                  setUiType(t.value);
                  // Income and Expense/Reimburse draw from different category
                  // lists, so a selection from one wouldn't be valid in the other
                  setCategory("");
                }}
                className={`cursor-pointer rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  uiType === t.value ? `bg-surface ${TYPE_ACCENT[t.value]}` : "text-ink-3 hover:text-ink"
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
                  list="payee-options"
                  value={payeeName}
                  onChange={(e) => applyPayee(e.target.value)}
                  placeholder="Payee"
                  className="input w-full"
                  required
                />
                {/* hidden measuring twin: same classes as the real select
                    below, one option, left to size naturally -- desktop-only,
                    to compute the pixel width that fits the current text */}
                <select
                  ref={categoryMeasureRef}
                  aria-hidden
                  tabIndex={-1}
                  className="pointer-events-none invisible absolute w-auto rounded-md border border-line-2 px-2 py-1 text-xs"
                >
                  <option>{categoryDisplay}</option>
                </select>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CategoryKey | "")}
                  style={isDesktop ? { width: categoryWidth } : undefined}
                  className="mt-1 w-full max-w-full truncate rounded-md border border-line-2 bg-surface-2 px-2 py-1 text-xs text-ink-2 outline-none"
                >
                  <option value="">No category</option>
                  {categoryTree.map((c) => (
                    <Fragment key={c.key}>
                      <option value={c.key}>{c.label}</option>
                      {c.children?.map((s) => (
                        // an optgroup's label is a permanently disabled heading in
                        // every browser, so "Auto" itself couldn't be selected from
                        // one -- a plain option under the parent keeps it clickable.
                        // Spelling out "Auto: Gas" (via categoryLabel) rather than
                        // just "Gas" also means the closed select shows the same
                        // "Parent: Child" text the ledger does.
                        <option key={s.key} value={s.key}>
                          {categoryLabel(s.key)}
                        </option>
                      ))}
                    </Fragment>
                  ))}
                </select>
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

          <datalist id="payee-options">
            {options.payees.map((p) => (
              <option key={p.id} value={p.name} />
            ))}
          </datalist>

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
                <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="input">
                  {options.accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
                <select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} className="input">
                  {options.accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
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
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="input w-36 shrink-0">
                {options.accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
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
