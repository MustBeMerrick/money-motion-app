"use client";

import { useRef, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import type { Account, Bill, BillFrequency, ExtraIncome, PiggyBucket } from "@prisma/client";
import { WEEKDAY_NAMES } from "@/lib/core/dates";
import { saveAccount, saveBill, saveBucket, saveExtraIncome } from "@/app/actions";
import { parseDollarsToCents, splitHalfCents } from "@/lib/core/money";
import { useAccountColors } from "./account-colors-context";
import { Modal } from "./modal";

function dollars(cents: number | null | undefined): string {
  return cents == null ? "" : (cents / 100).toFixed(2);
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-2">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] leading-snug text-ink-3">{hint}</span>}
    </label>
  );
}

// Bills are colored by picking one of your accounts rather than a free-form
// swatch, so a bill's color always matches an account's card. The select
// only tracks which account is chosen; a hidden input carries the actual hex
// the server action expects.
function BillColorField({ initialColor }: { initialColor?: string | null }) {
  const accounts = useAccountColors();
  const [selectedId, setSelectedId] = useState(
    accounts.find((a) => a.color === initialColor)?.id ?? "",
  );
  const selected = accounts.find((a) => a.id === selectedId);
  const swatch = selected
    ? selected.color2
      ? `linear-gradient(120deg, ${selected.color}, ${selected.color2})`
      : selected.color
    : "var(--ink-3)";

  return (
    <Field label="Color">
      <div className="flex items-center gap-2">
        <span className="h-9 w-9 shrink-0 rounded-md border border-line-2" style={{ background: swatch }} />
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="input"
        >
          <option value="">Default</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>
      <input type="hidden" name="color" value={selected?.color ?? ""} />
    </Field>
  );
}

function CheckField({ label, name, defaultChecked, onChange }: { label: string; name: string; defaultChecked?: boolean; onChange?: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-2">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        onChange={(e) => onChange?.(e.target.checked)}
        className="h-4 w-4 accent-[#7ED957]"
      />
      {label}
    </label>
  );
}

function FormShell({
  title,
  editing,
  trigger,
  action,
  children,
}: {
  title: string;
  editing: boolean;
  trigger?: React.ReactNode;
  action: (fd: FormData) => Promise<void>;
  children: (open: boolean) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(fd: FormData) {
    try {
      await action(fd);
      setOpen(false);
      setError(null);
    } catch {
      setError("Couldn't save — check the fields.");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          trigger
            ? "cursor-pointer text-left"
            : editing
              ? "cursor-pointer rounded-md p-1 text-ink-3 hover:bg-surface-2 hover:text-ink"
              : "btn btn-primary"
        }
        aria-label={title}
      >
        {trigger ?? (editing ? <Pencil size={14} /> : (
          <>
            <Plus size={15} /> {title}
          </>
        ))}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={title}>
        <form action={submit} className="flex flex-col gap-3.5">
          {children(open)}
          {error && <p className="text-xs text-neg">{error}</p>}
          <div className="mt-1 flex justify-end gap-2">
            <button type="button" className="btn" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

// --- Account ---

export function AccountForm({ initial, trigger }: { initial?: Account; trigger?: React.ReactNode }) {
  return (
    <FormShell
      title={initial ? "Edit Account" : "Add Account"}
      editing={!!initial}
      trigger={trigger}
      action={saveAccount}
    >
      {() => (
        <>
          {initial && <input type="hidden" name="id" value={initial.id} />}
          <Field label="Name">
            <input name="name" required defaultValue={initial?.name} className="input" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <select name="type" defaultValue={initial?.type ?? "CREDIT"} className="input">
                <option value="CASH">Cash</option>
                <option value="CHECKING">Checking</option>
                <option value="SAVINGS">Savings</option>
                <option value="CREDIT">Credit Card</option>
              </select>
            </Field>
            <Field label="Balance ($)" hint="Credit card debt is negative.">
              <input name="balance" required defaultValue={dollars(initial?.balanceCents ?? 0)} className="input" inputMode="decimal" />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Color">
              <input type="color" name="color" defaultValue={initial?.color ?? "#7ED957"} className="input h-9 p-1" />
            </Field>
            <Field label="Color 2" hint="Optional: blends left → right">
              <input type="color" name="color2" defaultValue={initial?.color2 ?? initial?.color ?? "#7ED957"} className="input h-9 p-1" />
            </Field>
            <Field label="Sort order">
              <input name="sortOrder" type="number" defaultValue={initial?.sortOrder ?? 0} className="input" />
            </Field>
          </div>
        </>
      )}
    </FormShell>
  );
}

// --- Bill ---

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function BillForm({
  initial,
  trigger,
  defaultFrequency = "MONTHLY",
}: {
  initial?: Bill;
  trigger?: React.ReactNode;
  defaultFrequency?: BillFrequency;
}) {
  const [shared, setShared] = useState(initial?.shared ?? false);
  const [frequency, setFrequency] = useState<BillFrequency>(
    initial?.frequency ?? defaultFrequency,
  );
  // refs, not state: the inputs stay uncontrolled so they reset to defaults
  // when the modal is dismissed and reopened
  const amountRef = useRef<HTMLInputElement>(null);
  const reimburseRef = useRef<HTMLInputElement>(null);

  function fillHalf() {
    const amount = parseDollarsToCents(amountRef.current?.value ?? "");
    if (amount === null || !reimburseRef.current) return;
    reimburseRef.current.value = (splitHalfCents(amount) / 100).toFixed(2);
  }

  return (
    <FormShell
      title={initial ? "Edit Bill" : "Add Bill"}
      editing={!!initial}
      trigger={trigger}
      action={saveBill}
    >
      {() => (
        <>
          {initial && <input type="hidden" name="id" value={initial.id} />}
          <Field label="Name">
            <input name="name" required defaultValue={initial?.name} className="input" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount ($)">
              <input ref={amountRef} name="amount" required defaultValue={dollars(initial?.amountCents)} className="input" inputMode="decimal" />
            </Field>
            <Field label="Frequency">
              <select
                name="frequency"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as BillFrequency)}
                className="input"
              >
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="YEARLY">Yearly</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {frequency === "WEEKLY" ? (
              <Field label="Day of week" hint="Charged every week on this day.">
                <select name="dueWeekday" defaultValue={initial?.dueWeekday ?? 1} className="input">
                  {WEEKDAY_NAMES.map((d, i) => (
                    <option key={d} value={i}>{d}</option>
                  ))}
                </select>
              </Field>
            ) : (
              <Field label="Due day (1–31)">
                <input name="dueDay" type="number" min={1} max={31} required defaultValue={initial?.dueDay ?? 1} className="input" />
              </Field>
            )}
            {frequency === "YEARLY" ? (
              <Field label="Due month">
                <select name="dueMonth" defaultValue={initial?.dueMonth ?? 1} className="input">
                  {MONTH_NAMES.map((m, i) => (
                    <option key={m} value={i + 1}>{m}</option>
                  ))}
                </select>
              </Field>
            ) : (
              <BillColorField initialColor={initial?.color} />
            )}
          </div>
          {frequency === "YEARLY" && <BillColorField initialColor={initial?.color} />}
          {frequency === "WEEKLY" && (
            <p className="text-[11px] leading-snug text-ink-3">
              Amount is per week. A month with five of this weekday costs five times the amount.
            </p>
          )}
          <CheckField label="Shared (someone reimburses part of it)" name="shared" defaultChecked={shared} onChange={setShared} />
          {shared && (
            /* not a <label>: the button inside would forward its click to the input */
            <div>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-ink-2">Expected reimbursement ($)</span>
                <button
                  type="button"
                  onClick={fillHalf}
                  className="cursor-pointer rounded-md border border-line-2 px-2 py-0.5 text-[11px] font-medium text-lime transition-colors hover:border-lime/60 hover:bg-surface-2"
                >
                  Split 50/50
                </button>
              </div>
              <input
                ref={reimburseRef}
                name="reimburse"
                defaultValue={dollars(initial?.reimburseCents || null)}
                className="input"
                inputMode="decimal"
              />
              <span className="mt-1 block text-[11px] leading-snug text-ink-3">
                Leave empty to expect the full amount back.
              </span>
            </div>
          )}
        </>
      )}
    </FormShell>
  );
}

// --- Extra income ---

export function ExtraIncomeForm({ initial, trigger }: { initial?: ExtraIncome; trigger?: React.ReactNode }) {
  return (
    <FormShell
      title={initial ? "Edit Extra Income" : "Add Extra Income"}
      editing={!!initial}
      trigger={trigger}
      action={saveExtraIncome}
    >
      {() => (
        <>
          {initial && <input type="hidden" name="id" value={initial.id} />}
          <Field label="Source">
            <input name="source" required defaultValue={initial?.source} className="input" placeholder="Tax return, refund, reimbursement…" />
          </Field>
          <Field label="Expected ($)">
            <input name="expected" required defaultValue={dollars(initial?.expectedCents)} className="input" inputMode="decimal" />
          </Field>
        </>
      )}
    </FormShell>
  );
}

// --- Piggy bucket ---

export function BucketForm({ initial, trigger }: { initial?: PiggyBucket; trigger?: React.ReactNode }) {
  const [perpetual, setPerpetual] = useState(initial ? initial.targetCents === null : false);
  return (
    <FormShell
      title={initial ? "Edit Bucket" : "Add Bucket"}
      editing={!!initial}
      trigger={trigger}
      action={saveBucket}
    >
      {() => (
        <>
          {initial && <input type="hidden" name="id" value={initial.id} />}
          <Field label="Name">
            <input name="name" required defaultValue={initial?.name} className="input" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start date">
              <input name="startDate" type="date" required defaultValue={initial?.startDate} className="input" />
            </Field>
            <Field label="Daily change ($)" hint="Applied every day. Usually negative.">
              <input name="ratePerDay" required defaultValue={dollars(initial?.ratePerDayCents)} className="input" inputMode="decimal" placeholder="-1.00" />
            </Field>
          </div>
          <Field
            label="Starting value ($)"
            hint="Positive = money granted back to the budget (spreads a purchase over time). Negative = money siphoned aside into a fund."
          >
            <input name="principal" required defaultValue={dollars(initial?.principalCents)} className="input" inputMode="decimal" />
          </Field>
          <CheckField label="Perpetual (no end value — runs forever)" name="perpetual" defaultChecked={perpetual} onChange={setPerpetual} />
          {!perpetual && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="End value ($)" hint="Bucket stops here. Usually 0.">
                <input name="target" defaultValue={initial ? dollars(initial.targetCents ?? 0) : "0.00"} className="input" inputMode="decimal" />
              </Field>
              <Field label="Original amount ($)" hint="Optional — full amount, for the progress bar.">
                <input name="original" defaultValue={dollars(initial?.originalCents)} className="input" inputMode="decimal" />
              </Field>
            </div>
          )}
        </>
      )}
    </FormShell>
  );
}
