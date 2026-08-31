"use client";

import { useState } from "react";
import { ArrowLeftRight, Pencil, Undo2 } from "lucide-react";
import { deleteTransaction, getTransactionFormOptions } from "@/app/actions";
import { useScheduleRefresh } from "@/lib/refresh-context";
import { Money } from "@/components/ui";
import { ConfirmDelete } from "@/components/modal";
import { SwipeToDelete } from "@/components/swipe-to-delete";
import { TransactionModal, type EditingTransaction } from "@/components/transaction-form";

export type LedgerRow = {
  id: string;
  dateLabel: string;
  isTransfer: boolean;
  otherAccountName?: string | null;
  incoming?: boolean;
  reimbursement?: boolean;
  payeeName?: string | null;
  categoryLabel?: string | null;
  categoryEmoji?: string | null;
  // only meaningful where a row's account isn't already implied by the
  // page it's on (a single-account ledger doesn't need it; a cross-account
  // day view, like the calendar's Expense View, does)
  accountName?: string | null;
  memo?: string | null;
  signedCents: number;
  // raw fields needed to reopen this row in the Add Transaction modal for
  // editing — display-only rows (there are none currently) can omit it, but
  // any row wired up to a delete action should carry this too
  edit?: Omit<EditingTransaction, "id">;
};

/** Desktop-only: reopens the row in the same modal used to add one, prefilled. */
function EditTransactionButton({ row }: { row: LedgerRow }) {
  const [options, setOptions] = useState<Awaited<ReturnType<typeof getTransactionFormOptions>> | null>(null);
  const [loading, setLoading] = useState(false);

  if (!row.edit) return null;

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
        aria-label="Edit transaction"
        className="cursor-pointer rounded-md p-1.5 text-ink-3 hover:bg-surface-2 hover:text-ink disabled:opacity-60"
      >
        <Pencil size={14} />
      </button>
      {options && (
        <TransactionModal
          options={options}
          editing={{ id: row.id, ...row.edit }}
          onClose={() => setOptions(null)}
        />
      )}
    </>
  );
}

function Description({ row, hideCategoryLabel }: { row: LedgerRow; hideCategoryLabel: boolean }) {
  if (row.isTransfer) {
    return (
      <span className="flex items-center gap-1.5">
        <ArrowLeftRight size={13} className="text-info" />
        {row.incoming ? `From ${row.otherAccountName ?? "—"}` : `To ${row.otherAccountName ?? "—"}`}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5">
      {row.categoryEmoji && <span title={row.categoryLabel ?? undefined}>{row.categoryEmoji}</span>}
      {row.payeeName ?? (row.reimbursement ? "Reimbursement" : row.signedCents > 0 ? "Income" : "Expense")}
      {!hideCategoryLabel && row.categoryLabel && <span className="text-xs text-ink-3">· {row.categoryLabel}</span>}
      {row.reimbursement && (
        <span title="Reimbursement — nets against expenses, not income" className="flex items-center text-ink-3">
          <Undo2 size={12} />
        </span>
      )}
    </span>
  );
}

export function TransactionList({
  rows,
  hideDate = false,
  // the emoji already carries the category on the calendar's day panel --
  // the text label alongside it is redundant there, unlike the fuller
  // per-account ledger where there's no emoji-only shorthand established
  hideCategoryLabel = false,
  // colors the amount by what kind of row it is (expense/income/reimbursement/
  // transfer) instead of the account-relative +/- sign, and drops the sign
  // entirely -- meaningful on the calendar's cross-account day panel, where
  // "up or down for this account" isn't the question being asked
  colorByKind = false,
  emptyMessage = "No transactions logged against this account yet.",
}: {
  rows: LedgerRow[];
  // the calendar's day panel already states the date once in its header --
  // repeating it per row would be pure noise
  hideDate?: boolean;
  hideCategoryLabel?: boolean;
  colorByKind?: boolean;
  emptyMessage?: string;
}) {
  const scheduleRefresh = useScheduleRefresh();

  if (rows.length === 0) {
    return <p className="text-sm text-ink-3">{emptyMessage}</p>;
  }

  async function remove(id: string) {
    await deleteTransaction(id);
    scheduleRefresh();
  }

  function amount(row: LedgerRow, className = "") {
    if (!colorByKind) return <Money cents={row.signedCents} signed tone="plain" className={className} />;
    const tone = row.isTransfer ? "info" : row.reimbursement ? "warn" : row.signedCents > 0 ? "pos" : "neg";
    // color alone conveys direction here -- a leading "-" on top of a red
    // expense (or "+" on a green one) would just be saying it twice
    return <Money cents={Math.abs(row.signedCents)} tone={tone} className={className} />;
  }

  return (
    <>
      {/* desktop: table with a trash icon on the far right */}
      <table className="table-base hidden lg:table">
        <thead>
          <tr>
            {!hideDate && <th>Date</th>}
            <th>Description</th>
            <th className="text-right">Amount</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {!hideDate && <td className="text-xs text-ink-3">{row.dateLabel}</td>}
              <td>
                <Description row={row} hideCategoryLabel={hideCategoryLabel} />
                {row.accountName && <div className="mt-0.5 text-xs text-ink-3">{row.accountName}</div>}
                {row.memo && <div className="mt-0.5 text-xs text-ink-3">{row.memo}</div>}
              </td>
              <td className="text-right">{amount(row)}</td>
              <td className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <EditTransactionButton row={row} />
                  <ConfirmDelete onDelete={() => remove(row.id)} label="" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* mobile: swipe-left-to-delete list */}
      <div className="flex flex-col divide-y divide-line lg:hidden">
        {rows.map((row) => (
          <SwipeToDelete key={row.id} onDelete={() => remove(row.id)}>
            <div className="flex items-center justify-between gap-3 bg-surface py-2.5">
              <div className="min-w-0">
                {!hideDate && <div className="text-xs text-ink-3">{row.dateLabel}</div>}
                <Description row={row} hideCategoryLabel={hideCategoryLabel} />
                {row.accountName && <div className="mt-0.5 text-xs text-ink-3">{row.accountName}</div>}
                {row.memo && <div className="mt-0.5 text-xs text-ink-3">{row.memo}</div>}
              </div>
              {amount(row, "shrink-0")}
            </div>
          </SwipeToDelete>
        ))}
      </div>
    </>
  );
}
