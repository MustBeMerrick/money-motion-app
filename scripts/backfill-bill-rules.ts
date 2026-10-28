// One-off: give bills that have no Auto-checkboxing rules the default ones for
// their name (lib/core/bill-match.ts). Safe to re-run -- bills that already
// have any rule are left alone, so edits made in the app are never clobbered.
import { PrismaClient, type CategoryKey } from "@prisma/client";
import { DEFAULT_RULES_BY_BILL } from "../lib/core/bill-match";

const prisma = new PrismaClient();

async function main() {
  const bills = await prisma.bill.findMany({ include: { _count: { select: { matchRules: true } } } });
  for (const bill of bills) {
    const rules = DEFAULT_RULES_BY_BILL[bill.name.trim().toLowerCase()];
    if (!rules || bill._count.matchRules > 0) continue;
    await prisma.billMatchRule.createMany({
      data: rules.map((r, sortOrder) => ({
        billId: bill.id,
        payee: r.payee ?? null,
        category: (r.category as CategoryKey | undefined) ?? null,
        amountCents: r.amountCents ?? null,
        matchAll: r.matchAll,
        sortOrder,
      })),
    });
    console.log(`rules added: ${bill.name}`);
  }
}

main().finally(() => prisma.$disconnect());
