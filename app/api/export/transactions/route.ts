import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { categoryLabel } from "@/lib/core/categories";

export const dynamic = "force-dynamic";

function csvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export async function GET() {
  const rows = await prisma.transaction.findMany({
    include: { account: true, toAccount: true, payee: true },
    orderBy: { date: "asc" },
  });

  const header = ["Date", "Type", "Reimbursement", "Account", "To Account", "Payee", "Category", "Amount", "Memo"];
  const lines = [header, ...rows.map((t) => [
    t.date,
    t.type,
    t.reimbursement ? "yes" : "no",
    t.account.name,
    t.toAccount?.name ?? "",
    t.payee?.name ?? "",
    categoryLabel(t.category) ?? "",
    (t.amountCents / 100).toFixed(2),
    t.memo ?? "",
  ])].map((row) => row.map(csvField).join(",")).join("\r\n");

  return new NextResponse(lines, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="money-motion-transactions.csv"',
    },
  });
}
