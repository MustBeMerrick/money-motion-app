# MoneyMotion

**Simple. Smart. In Motion.** — a private budgeting app that replaces a Numbers
spreadsheet: accounts, recurring bills with hit/paid tracking, extra income,
virtual piggy-bank buckets, a bill calendar, and a "how much can I spend today"
daily budget.

## Quick start

```bash
npm install
cp .env.example .env  # DATABASE_URL for the local SQLite file
npm run db:push     # create data/money-motion.sqlite from prisma/schema.prisma
npm run db:seed     # optional: load sample data
npm run dev         # http://localhost:3000
```

## Pages

| Page | What it does |
|---|---|
| `/` | Dashboard — daily budget, days left, income/expenses, bill checkboxes, buckets |
| `/bills/weekly` `/bills/monthly` `/bills/annual` | Manage shared & non-shared recurring bills, one tab per frequency |
| `/piggy` | Piggy bank buckets and their daily drip |
| `/calendar` | Month grid of bills on their due dates |
| `/accounts` | Cash, checking and credit card balances |
| `/settings` | Salary and monthly savings target for the current month |

## How the daily budget works

```
available = cash + checking                 (liquid accounts)
          + credit card balances            (negative)
          + salary not yet received
          + extra income still outstanding
          + reimbursements owed to you      (shared bills: hit but not paid)
          - recurring bills not yet hit      (hit ones are already on the card)
          - monthly savings target
          + piggy bucket net effect

daily budget = available / days left in month   (today counts)
```

The formulas live in `lib/core/month.ts` and are unit-tested against real
spreadsheet values. See [AGENTS.md](AGENTS.md) for architecture and conventions.

## Deploy

```bash
deploy/deploy.sh init      # one time: create dirs + env on the server
deploy/deploy.sh deploy    # rsync committed HEAD, build, migrate, restart
deploy/deploy.sh logs
```

Runs on the `gmktec` home server at port 3003 via docker compose, with the SQLite
file mounted from outside the deployed tree.
