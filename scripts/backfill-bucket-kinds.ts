// One-off: give existing piggy buckets a kind (target < 0 or none = SAVE,
// otherwise SPREAD), a real startedOn (their old startDate), and a purchase
// total for spreads that never recorded one. Safe to re-run.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const buckets = await prisma.piggyBucket.findMany();
  for (const b of buckets) {
    const kind = b.targetCents === null || b.targetCents < 0 ? "SAVE" : "SPREAD";
    await prisma.piggyBucket.update({
      where: { id: b.id },
      data: {
        kind,
        startedOn: b.startedOn ?? b.startDate,
        totalCents: kind === "SPREAD" ? (b.totalCents ?? b.principalCents) : null,
      },
    });
    console.log(`${b.name}: ${kind}`);
  }
}

main().finally(() => prisma.$disconnect());
