import { describe, expect, it } from "vitest";
import { dayExpenseCents } from "./day-totals";

describe("dayExpenseCents", () => {
  it("does not let another payee's reimbursement hide an expense (Nov 17: AT&T payback + Amazon)", () => {
    expect(
      dayExpenseCents([
        { amountCents: 2174, reimbursement: true, payeeId: "att" },
        { amountCents: 1385, reimbursement: false, payeeId: "amazon" },
      ]),
    ).toBe(1385);
  });

  it("nets a reimbursement against the same payee's expense", () => {
    expect(
      dayExpenseCents([
        { amountCents: 6020, reimbursement: false, payeeId: "att" },
        { amountCents: 3010, reimbursement: true, payeeId: "att" },
      ]),
    ).toBe(3010);
  });

  it("clamps a same-payee surplus at zero", () => {
    expect(dayExpenseCents([{ amountCents: 3010, reimbursement: true, payeeId: "att" }])).toBe(0);
  });
});
