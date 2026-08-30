<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Agent Handoff — MoneyMotion

Private, single-user budgeting app for Marc. Replaces a macOS Numbers budget
spreadsheet. Sibling apps (`net-worth-app`, `option-pilot-app`) set the house
pattern this repo follows — check them before inventing a new convention.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · lucide-react ·
Prisma 6 + SQLite · Vitest · npm.

No auth (single user). No monorepo — one Next app, with a `/api` JSON layer to be
added later when the Expo/iOS app lands.

## Layout

```
app/          pages + actions.ts (all server actions, zod-validated)
components/   UI; client components are marked "use client"
lib/core/     PURE budget math — no Prisma, no React. Unit-tested.
lib/data.ts   Prisma queries composing DB rows -> core inputs
lib/prisma.ts client singleton
prisma/       schema.prisma (db push, no migration files)
data/         money-motion.sqlite (gitignored)
scripts/      seed.ts
deploy/       Dockerfile, compose.yml, deploy.sh, env.example
```

**The rule that matters: budget math lives in `lib/core/`, never inside React
components.** That keeps it shared with the future iOS app and unit-testable.

## Brand

Colors are the brand sheet's exact values, defined once as CSS variables in
`app/globals.css` (Deep Navy `#0B1220`, Navy Blue `#111A2E`, Slate `#1E2A3B`,
Forest `#1E7A3C`, Lime `#7ED957`, Accent Lime `#C6FF5E`, Off White `#F4F6F8`,
Cool Gray `#AAB6C2`, Steel Blue `#8FA3B8`). Use the tokens, not raw hex. Dark
theme only — there is no light mode.

**The logo is a real asset, not a drawing.** `public/brand/moneymotion-logo.png`
(full lockup) and `moneymotion-mark.png` (arc + coin) come from Marc's brand art
with the navy background keyed out to transparency and un-premultiplied, so they
composite cleanly on any surface. `app/icon.png` / `app/apple-icon.png` are
generated from the mark. **Do not hand-roll an SVG replacement** — if a new size
or variant is needed, derive it from these files.

## Domain model (decoded from the spreadsheet)

- **Occurrences are the unit of everything.** `BillOccurrence` holds one row per
  actual charge, keyed by `(billId, date)` — a monthly bill has one per month, a
  weekly bill four or five. `billDueDatesInMonth()` in `lib/core/month.ts` is the
  single source of truth for which dates a bill is charged on; occurrence counts,
  monthly costs and Hit/Paid rows all derive from it. Rows are created lazily on
  first tick, so absent means "not yet".
- **hit** — that charge has landed on the credit card, so it is already inside
  the CC balance. Only un-hit charges are subtracted from available money; hit
  ones are not, or they'd be double-counted. This is the whole reason the
  checkbox exists.
- **paid** — the other party has reimbursed a *shared* charge. Between hit and
  paid, the expected payback counts as pending-reimbursement income.
- **Frequency** is `WEEKLY | MONTHLY | YEARLY`. Weekly bills store `dueWeekday`
  (0=Sun) instead of a day of month, and their cost in a month is amount ×
  occurrences — computed from the calendar, never approximated as 52/12, because
  a 5-week month genuinely costs more.
- **Piggy buckets** amortize money at a signed daily rate:
  `current = principal + ratePerDay × daysSinceStart`, clamped at `target`.
  - positive value = money granted back to the budget (spreads a purchase forward)
  - negative value = money siphoned aside each day into a fund (clothes, gifts)
  - `targetCents: null` = perpetual, never completes
  - `principalCents` is the sheet's *Offset*; `originalCents` is its *Start*
    (kept only to draw the progress bar).
- **Daily budget** = `available / daysLeftInMonth`, where today counts as a
  remaining day. `available` is assembled in `lib/core/month.ts` — that file is
  the single place to calibrate formulas against the spreadsheet.

All money is stored and computed as **integer cents**. Dates are plain ISO
strings (`YYYY-MM-DD`, `YYYY-MM`) so the math is timezone-proof.

## Commands

```
npm run dev        # localhost:3000
npm test           # vitest — core math vs. real spreadsheet fixtures
npm run typecheck
npm run lint
npm run db:push    # apply schema.prisma to the SQLite file
                   # ^ RESTART `npm run dev` after this: the running server
                   #   holds the old generated Prisma client and will 500
npm run db:seed    # wipe + reseed with data from Marc's screenshots
npm run db:studio
```

Tests in `lib/core/core.test.ts` assert against **real values from Marc's
sheet** (Ring 1890 − 14×54d = 1134, etc.) dated 2026-08-16. If a formula changes,
those fixtures are the source of truth for whether it still matches the sheet.

## Data refresh

Every mutation is a server action followed by "show me the new numbers", and
there is exactly one way to do the second half: `await` the action from the
click handler, then call `scheduleRefresh()` from `useScheduleRefresh()`
(`lib/refresh-context.tsx`, ported from option-pilot-app).

Do **not** use `refresh()` from `next/cache` inside the action, and do **not**
wrap the action call in `startTransition`. Both put the re-render on a
deferrable React lane, where it can sit uncommitted until an unrelated click
sweeps it up -- the checkbox you ticked repaints (it is optimistic) while the
daily budget it feeds stays stale. A client `router.refresh()` is a router
update React always commits. `RefreshProvider` also serializes them, so
tapping five chips fast can't apply RSC payloads out of order.

`revalidatePath` is equally wrong here: nothing is cached (every route is
force-dynamic over SQLite), so there is no cache entry to invalidate, and it
dirties every previously visited page for no gain.

## Auth

A single password gate, ported from option-pilot-app minus the passkeys.
`proxy.ts` (Next 16's renamed middleware) redirects anything without a valid
session cookie to `/login`; `/api/*` gets a 401 instead. The session cookie is
an HMAC of its own expiry signed with `AUTH_SESSION_SECRET` — no session store,
nothing in the DB. The password is checked against a salted scrypt hash in
`AUTH_PASSWORD_HASH`, with a 5-attempt/15-minute in-memory lockout per IP.

Both values are generated by `npm run auth:hash` and pasted into
`~/apps/money-motion-app/env` on the server. **The gate is skipped entirely
when `NODE_ENV=development`**, so `npm run dev` never asks for a password.

The cookie's `Secure` flag follows the request's `x-forwarded-proto`: set over
the HTTPS tunnel, cleared on plain-HTTP LAN access, since a Secure cookie is
silently dropped over http.

## Deploy

`deploy/deploy.sh <init|deploy|db-push|db-pull|logs|status|restart|stop>` rsyncs
committed HEAD to the `gmktec` home server and runs docker compose there. Port
**3003** (3000 = net-worth-app, 3002 = option-pilot-app). SQLite lives outside the
deployed tree at `~/apps/money-motion-app/data/`. Marc runs deploys himself.

## Not built yet

- Transaction logging (merging in his separate Expense iOS app: per-account
  transactions, running balances, day-by-day calendar totals) — this is the next
  milestone.
- `/api` JSON layer + Expo/React Native iOS app.
- Reports / goals pages.
