"use client";

import { Fragment, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Account } from "@prisma/client";
import { commitImport } from "@/app/actions";
import { CATEGORY_TREE, INCOME_CATEGORY_TREE, categoryLabel, type CategoryKey } from "@/lib/core/categories";
import {
  parsePocketExpenseCsv,
  summarizeImport,
  type ImportTransactionType,
  type ParsedImportRow,
} from "@/lib/core/import-pocketexpense";
import { formatCents } from "@/lib/core/money";

type Override = {
  type?: ImportTransactionType;
  category?: CategoryKey | null;
  reimbursement?: boolean;
  accountName?: string;
  toAccountName?: string;
};

type EffectiveRow = ParsedImportRow & { accountResolved: boolean; toAccountResolved: boolean };

export function ImportWorkspace({ accounts }: { accounts: Account[] }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedImportRow[] | null>(null);
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const [parseError, setParseError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const accountNames = useMemo(() => accounts.map((a) => a.name), [accounts]);
  const accountByName = useMemo(() => new Map(accounts.map((a) => [a.name, a])), [accounts]);

  const effectiveRows: EffectiveRow[] = useMemo(() => {
    if (!rows) return [];
    return rows.map((r) => {
      const o = overrides[r.key];
      const accountName = o?.accountName ?? r.accountName;
      const toAccountName = o?.toAccountName ?? r.toAccountName;
      return {
        ...r,
        type: o?.type ?? r.type,
        category: o && "category" in o ? (o.category ?? null) : r.category,
        reimbursement: o?.reimbursement ?? r.reimbursement,
        accountName,
        toAccountName,
        accountResolved: accountByName.has(accountName),
        toAccountResolved: toAccountName ? accountByName.has(toAccountName) : true,
      };
    });
  }, [rows, overrides, accountByName]);

  const flaggedRows = effectiveRows.filter((r) => r.flagged || !r.accountResolved || !r.toAccountResolved);
  const summary = rows ? summarizeImport(rows) : null;
  const blockedCount = effectiveRows.filter((r) => !r.accountResolved || !r.toAccountResolved).length;

  function setOverride(key: string, patch: Override) {
    setOverrides((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  async function handleFile(file: File) {
    setParseError(null);
    setSubmitError(null);
    setOverrides({});
    try {
      const text = await file.text();
      setRows(parsePocketExpenseCsv(text, accountNames));
    } catch (e) {
      setRows(null);
      setParseError(e instanceof Error ? e.message : "Couldn't parse that file");
    }
  }

  async function handleImport() {
    if (!rows) return;
    setImporting(true);
    setSubmitError(null);
    try {
      const payload = effectiveRows.map((r) => ({
        date: r.date,
        type: r.type,
        reimbursement: r.type === "EXPENSE" ? r.reimbursement : false,
        accountId: accountByName.get(r.accountName)!.id,
        toAccountId: r.type === "TRANSFER" ? accountByName.get(r.toAccountName!)!.id : undefined,
        payeeName: r.payeeName,
        category: r.type === "TRANSFER" ? null : r.category,
        amountCents: r.amountCents,
        memo: r.memo,
      }));
      await commitImport(payload);
      router.push("/accounts");
      router.refresh();
    } catch {
      setSubmitError("Import failed — nothing was saved. Check the flagged rows and try again.");
      setImporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {!rows && (
        <div className="card">
          <h2 className="card-title">Import from Pocket Expense</h2>
          <p className="mb-3 text-sm text-ink-2">
            Export a CSV from Pocket Expense and pick it here. Nothing is saved until you review the
            preview below and confirm.
          </p>
          <input
            ref={fileInput}
            type="file"
            accept=".csv,text/csv"
            className="text-sm text-ink-2"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          {parseError && <p className="mt-2 text-xs text-neg">{parseError}</p>}
        </div>
      )}

      {rows && summary && (
        <>
          <div className="card">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="card-title mb-0">Preview</h2>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setRows(null);
                  setOverrides({});
                  if (fileInput.current) fileInput.current.value = "";
                }}
              >
                Choose a different file
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2">
              <span>{summary.total} transactions</span>
              <span className="text-ink-3">·</span>
              <span>{summary.dateRange ? `${summary.dateRange.start} – ${summary.dateRange.end}` : "no dates"}</span>
              <span className="text-ink-3">·</span>
              <span>{summary.byType.EXPENSE} expense</span>
              <span>{summary.byType.INCOME} income</span>
              <span>{summary.byType.TRANSFER} transfer</span>
              {flaggedRows.length > 0 && (
                <>
                  <span className="text-ink-3">·</span>
                  <span className="text-warn">{flaggedRows.length} need review</span>
                </>
              )}
            </div>
          </div>

          {flaggedRows.length > 0 && (
            <div className="card">
              <h3 className="card-title">Needs review</h3>
              <div className="flex flex-col divide-y divide-line">
                {flaggedRows.map((r) => (
                  <FlaggedRowEditor
                    key={r.key}
                    row={r}
                    accountNames={accountNames}
                    onChange={(patch) => setOverride(r.key, patch)}
                  />
                ))}
              </div>
            </div>
          )}

          {submitError && <p className="text-sm text-neg">{submitError}</p>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-primary"
              disabled={importing || blockedCount > 0}
              onClick={handleImport}
              title={blockedCount > 0 ? "Resolve every flagged account before importing" : undefined}
            >
              {importing ? "Importing…" : `Import ${summary.total} transactions`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function FlaggedRowEditor({
  row,
  accountNames,
  onChange,
}: {
  row: EffectiveRow;
  accountNames: string[];
  onChange: (patch: Override) => void;
}) {
  const categoryTree = row.type === "INCOME" ? INCOME_CATEGORY_TREE : CATEGORY_TREE;

  return (
    <div className="flex flex-col gap-2 py-3 text-sm">
      <div className="flex items-center gap-3">
        <div className="w-24 shrink-0 text-ink-3">{row.date}</div>
        <div className="min-w-0 flex-1 truncate font-medium">{row.payeeName ?? (row.raw.category || "—")}</div>
        <div className="shrink-0 font-semibold tabular-nums">{formatCents(row.amountCents)}</div>
      </div>
      <div className="pl-[7.5rem] text-xs text-warn">{row.flagReason}</div>

      <div className="flex flex-wrap items-center gap-3 pl-[7.5rem]">
      {!row.accountResolved && (
        <select
          value={accountNames.includes(row.accountName) ? row.accountName : ""}
          onChange={(e) => onChange({ accountName: e.target.value })}
          className="input w-36"
        >
          <option value="" disabled>
            Pick account…
          </option>
          {accountNames.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      )}

      {row.type === "TRANSFER" && !row.toAccountResolved && (
        <select
          value={accountNames.includes(row.toAccountName ?? "") ? row.toAccountName : ""}
          onChange={(e) => onChange({ toAccountName: e.target.value })}
          className="input w-36"
        >
          <option value="" disabled>
            Pick destination…
          </option>
          {accountNames.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      )}

      {row.type !== "TRANSFER" && (
        <>
          <select
            value={row.type}
            onChange={(e) => onChange({ type: e.target.value as ImportTransactionType, category: null })}
            className="input w-28"
          >
            <option value="EXPENSE">Expense</option>
            <option value="INCOME">Income</option>
          </select>

          <select
            value={row.category ?? ""}
            onChange={(e) => onChange({ category: (e.target.value || null) as CategoryKey | null })}
            className="input w-40"
          >
            <option value="">No category</option>
            {categoryTree.map((c) => (
              <Fragment key={c.key}>
                <option value={c.key}>{c.label}</option>
                {/* an optgroup label can never be selected in any browser, so a
                    plain sibling option keeps the parent itself clickable —
                    same pattern as transaction-form.tsx's category picker */}
                {c.children?.map((s) => (
                  <option key={s.key} value={s.key}>{categoryLabel(s.key)}</option>
                ))}
              </Fragment>
            ))}
          </select>

          {row.type === "EXPENSE" && (
            <label className="flex items-center gap-1.5 text-xs text-ink-2">
              <input
                type="checkbox"
                checked={row.reimbursement}
                onChange={(e) => onChange({ reimbursement: e.target.checked })}
              />
              Reimbursement
            </label>
          )}
        </>
      )}
      </div>
    </div>
  );
}
