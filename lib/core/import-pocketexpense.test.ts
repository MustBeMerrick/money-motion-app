import { describe, expect, it } from "vitest";
import { parsePocketExpenseCsv, summarizeImport } from "./import-pocketexpense";

const KNOWN_ACCOUNTS = ["Checking", "Reserve", "Freedom"];

const FIXTURE = [
  "Expense 6 Report",
  "01/01/2026 - 08/30/2026",
  "",
  '"expense","$-90,603.52"',
  "",
  '"Date&Time","Account","Category","Payee/Place","Amount","Cleared","Note"',
  '"01/01/2026 10:29 AM","Reserve","Coffee","Starbucks","$-13.65","Yes",""',
  '"01/01/2026 11:43 AM","Chase Checking","Rent","Rent","$-5,000.00","Yes",""',
  '"01/02/2026 01:21 PM","Chase Checking","Rent","Rent","$290.00","Yes",""',
  '"01/03/2026 09:00 AM","Chase Checking","Salary","(null)","$4,929.47","Yes",""',
  '"01/04/2026 08:56 AM","Chase Checking->Reserve","(null)","(null)","$128.28","Yes",""',
  '"01/05/2026 11:22 AM","Chase Checking","Reimbursement","HSA","$74.00","Yes",""',
  '"01/06/2026 11:22 AM","Reserve","Gambling","Kalshi","$-10.00","Yes",""',
  '"01/07/2026 11:22 AM","Chase Checking","Gambling  ","Kalshi","$14.54","Yes",""',
  '"01/08/2026 11:22 AM","Chase Checking","Mystery Cat","Widget Co","$-5.00","Yes",""',
  '"01/09/2026 11:22 AM","Vault","Coffee","Starbucks","$-3.00","Yes",""',
].join("\n");

describe("parsePocketExpenseCsv", () => {
  const rows = parsePocketExpenseCsv(FIXTURE, KNOWN_ACCOUNTS);

  it("parses a normal expense", () => {
    const r = rows[0];
    expect(r.date).toBe("2026-01-01");
    expect(r.type).toBe("EXPENSE");
    expect(r.reimbursement).toBe(false);
    expect(r.category).toBe("COFFEE");
    expect(r.amountCents).toBe(1365);
    expect(r.accountName).toBe("Reserve");
    expect(r.flagged).toBe(false);
  });

  it("resolves the Chase Checking alias to Checking", () => {
    expect(rows[1].accountName).toBe("Checking");
    expect(rows[1].accountMatched).toBe(true);
  });

  it("treats a positive amount in an expense category as a reimbursement", () => {
    const r = rows[2];
    expect(r.type).toBe("EXPENSE");
    expect(r.reimbursement).toBe(true);
    expect(r.category).toBe("RENT");
    expect(r.amountCents).toBe(29000);
    expect(r.flagged).toBe(false);
  });

  it("maps an income-only category to INCOME", () => {
    const r = rows[3];
    expect(r.type).toBe("INCOME");
    expect(r.category).toBe("INCOME_SALARY");
    expect(r.payeeName).toBeNull();
    expect(r.flagged).toBe(false);
  });

  it("detects a transfer from the Account field", () => {
    const r = rows[4];
    expect(r.type).toBe("TRANSFER");
    expect(r.accountName).toBe("Checking");
    expect(r.toAccountName).toBe("Reserve");
    expect(r.amountCents).toBe(12828);
    expect(r.flagged).toBe(false);
  });

  it("flags a Reimbursement-category row for manual category assignment", () => {
    const r = rows[5];
    expect(r.type).toBe("EXPENSE");
    expect(r.reimbursement).toBe(true);
    expect(r.category).toBeNull();
    expect(r.flagged).toBe(true);
  });

  it("flags ambiguous categories that appear on both sides of the ledger", () => {
    const loss = rows[6];
    expect(loss.flagged).toBe(true);
    expect(loss.type).toBe("EXPENSE");
    expect(loss.category).toBe("GAMBLING");

    const win = rows[7];
    expect(win.flagged).toBe(true);
    expect(win.type).toBe("INCOME");
    expect(win.category).toBe("INCOME_GAMBLING");
  });

  it("flags an unrecognized category", () => {
    const r = rows[8];
    expect(r.flagged).toBe(true);
    expect(r.category).toBeNull();
    expect(r.type).toBe("EXPENSE");
  });

  it("flags an unrecognized account", () => {
    const r = rows[9];
    expect(r.flagged).toBe(true);
    expect(r.accountMatched).toBe(false);
    expect(r.accountName).toBe("Vault");
  });
});

describe("summarizeImport", () => {
  it("counts totals, flags, and the date range", () => {
    const rows = parsePocketExpenseCsv(FIXTURE, KNOWN_ACCOUNTS);
    const summary = summarizeImport(rows);
    expect(summary.total).toBe(10);
    expect(summary.flagged).toBe(5);
    expect(summary.dateRange).toEqual({ start: "2026-01-01", end: "2026-01-09" });
  });
});
