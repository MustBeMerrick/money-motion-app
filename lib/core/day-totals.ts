export type DayExpenseRow = { amountCents: number; reimbursement: boolean; payeeId: string | null };

// A day's expense tally on the calendar. A reimbursement offsets only the
// same-payee expense it pays back, and a surplus (a payback landing on a day
// without its charge) shows nothing rather than going negative -- so an AT&T
// payback can't silently erase an unrelated Amazon charge logged that day.
export function dayExpenseCents(rows: DayExpenseRow[]): number {
  const netByPayee = new Map<string | null, number>();
  for (const r of rows) {
    netByPayee.set(r.payeeId, (netByPayee.get(r.payeeId) ?? 0) + (r.reimbursement ? -r.amountCents : r.amountCents));
  }
  let total = 0;
  for (const net of netByPayee.values()) total += Math.max(0, net);
  return total;
}
