import { describe, expect, test } from "vitest";
import { DEFAULT_RULES_BY_BILL, matchingBillIds, ruleMatches, type HitCandidate, type MatchRule } from "./bill-match";

const exp = (o: Partial<HitCandidate>): HitCandidate => ({
  type: "EXPENSE",
  reimbursement: false,
  amountCents: 1000,
  ...o,
});
const rule = (o: Partial<MatchRule>): MatchRule => ({ matchAll: true, ...o });

describe("ruleMatches", () => {
  test("payee, case-insensitive and trimmed", () => {
    expect(ruleMatches(rule({ payee: "VCA Care Club" }), exp({ payeeName: " vca care club " }))).toBe(true);
    expect(ruleMatches(rule({ payee: "VCA Care Club" }), exp({ payeeName: "VCA" }))).toBe(false);
  });

  test("category and amount", () => {
    expect(ruleMatches(rule({ category: "UTILITIES_PHONE" }), exp({ category: "UTILITIES_PHONE" }))).toBe(true);
    expect(ruleMatches(rule({ amountCents: 60_522 }), exp({ amountCents: 60_522 }))).toBe(true);
    expect(ruleMatches(rule({ amountCents: 60_522 }), exp({ amountCents: 5_000 }))).toBe(false);
  });

  test("AND needs every stated field, OR needs one", () => {
    const fields = { payee: "Tesla", category: "AUTO" as const };
    const t = exp({ payeeName: "Tesla", category: "TRANSPORT" });
    expect(ruleMatches(rule({ ...fields, matchAll: true }), t)).toBe(false);
    expect(ruleMatches(rule({ ...fields, matchAll: false }), t)).toBe(true);
  });

  test("a rule with no fields never matches", () => {
    expect(ruleMatches(rule({}), exp({ payeeName: "Netflix" }))).toBe(false);
    expect(ruleMatches(rule({ matchAll: false, payee: "  " }), exp({}))).toBe(false);
  });

  test("reimbursements ignore the amount field", () => {
    const r = rule({ payee: "Tesla", amountCents: 60_522 });
    expect(ruleMatches(r, exp({ payeeName: "Tesla", reimbursement: true, amountCents: 100 }))).toBe(true);
    expect(ruleMatches(r, exp({ payeeName: "Tesla", amountCents: 100 }))).toBe(false);
  });

  test("income and transfers never match", () => {
    expect(ruleMatches(rule({ payee: "Netflix" }), exp({ payeeName: "Netflix", type: "INCOME" }))).toBe(false);
    expect(ruleMatches(rule({ payee: "Netflix" }), exp({ payeeName: "Netflix", type: "TRANSFER" }))).toBe(false);
  });
});

describe("matchingBillIds", () => {
  const bills = [
    { id: "rent", matchRules: DEFAULT_RULES_BY_BILL["rent"] },
    { id: "car", matchRules: DEFAULT_RULES_BY_BILL["car"] },
    { id: "none", matchRules: [] },
  ];

  test("any rule of a bill ticks it", () => {
    expect(matchingBillIds(exp({ category: "RENT" }), bills)).toEqual(["rent"]);
    expect(matchingBillIds(exp({ payeeName: "Rent" }), bills)).toEqual(["rent"]);
  });

  test("Car default needs payee, category and amount", () => {
    const car = { payeeName: "Tesla", category: "AUTO" as const };
    expect(matchingBillIds(exp({ ...car, amountCents: 60_522 }), bills)).toEqual(["car"]);
    expect(matchingBillIds(exp({ ...car, amountCents: 5_000 }), bills)).toEqual([]);
  });
});
