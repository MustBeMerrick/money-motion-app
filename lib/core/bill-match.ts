// Auto-"Hit"/"Paid": which bills a logged transaction settles, so saving it
// can tick a bill's Hit checkbox (an expense) or Paid checkbox (a
// reimbursement) without a second trip to Bills & Recurring.
//
// Rules are per bill and user-editable (the bill form's Auto-checkboxing
// tab). A rule states any of payee / category / amount; with `matchAll` every
// stated field must match (AND), otherwise any one is enough (OR). A bill
// ticks when any of its rules match.

import type { CategoryKey } from "./categories";

export type MatchRule = {
  payee?: string | null;
  category?: CategoryKey | string | null;
  amountCents?: number | null;
  matchAll: boolean;
};

export type HitCandidate = {
  type: "EXPENSE" | "INCOME" | "TRANSFER";
  reimbursement: boolean;
  payeeName?: string | null;
  category?: CategoryKey | string | null;
  amountCents: number;
};

export function ruleMatches(rule: MatchRule, t: HitCandidate): boolean {
  // only expenses (and reimbursements of them) settle a bill
  if (t.type !== "EXPENSE") return false;
  const payee = rule.payee?.trim().toLowerCase();
  const checks: boolean[] = [];
  if (payee) checks.push(payee === t.payeeName?.trim().toLowerCase());
  if (rule.category) checks.push(rule.category === t.category);
  // a reimbursement is a share of the charge, not the full amount, so the
  // amount can't be compared against it
  if (rule.amountCents != null && !t.reimbursement) checks.push(rule.amountCents === t.amountCents);
  if (checks.length === 0) return false;
  return rule.matchAll ? checks.every(Boolean) : checks.some(Boolean);
}

/** Ids of the bills this transaction settles (usually zero or one). */
export function matchingBillIds(t: HitCandidate, bills: { id: string; matchRules: MatchRule[] }[]): string[] {
  return bills.filter((b) => b.matchRules.some((r) => ruleMatches(r, t))).map((b) => b.id);
}

// Starting rules for a bill of this name, used by the seed and the backfill
// script so existing bills begin with sensible auto-checkboxing.
export const DEFAULT_RULES_BY_BILL: Record<string, MatchRule[]> = {
  "apple one": [{ payee: "Apple One", matchAll: true }],
  water: [{ payee: "Water", matchAll: true }],
  "care club": [{ payee: "VCA Care Club", matchAll: true }],
  "vca care club": [{ payee: "VCA Care Club", matchAll: true }],
  "sdg&e": [{ payee: "SDG&E", matchAll: true }],
  rent: [{ payee: "Rent", category: "RENT", matchAll: false }],
  chatgpt: [{ payee: "ChatGPT", matchAll: true }],
  "sirius xm": [{ payee: "Sirius XM", matchAll: true }],
  netflix: [{ payee: "Netflix", matchAll: true }],
  internet: [{ category: "UTILITIES_INTERNET", matchAll: true }],
  mobile: [{ category: "UTILITIES_PHONE", matchAll: true }],
  car: [{ payee: "Tesla", category: "AUTO", amountCents: 60_522, matchAll: true }],
  "car ins": [{ payee: "Tesla Ins", category: "AUTO", matchAll: true }],
  "car insurance": [{ payee: "Tesla Ins", category: "AUTO", matchAll: true }],
};
