# Ayakara — personal income tax for Sri Lanka

A web application for individuals in Sri Lanka to record income and expenses, estimate income
tax on the rules of the correct year of assessment, see exactly how the figure is reached,
track withholding and payments, keep tax documents, follow deadlines and prepare for filing.

It estimates and organises. **It does not file returns or make payments, and it has no
connection to the Inland Revenue Department.**

The tax rules, their sources and the open uncertainties are in [TAX_RULES.md](TAX_RULES.md).
Read that first.

## Run it

Requirements: Node.js 20.9+, Docker (for PostgreSQL).

```bash
cp .env.example .env          # then set ENCRYPTION_KEY (command is in the file)
npm install
npm run db:up                 # PostgreSQL 17 on localhost:5433
npx prisma migrate deploy
npm run db:seed               # tax years, rules, sources, deadlines, demo account
npm run dev
```

Open http://localhost:3000.

| Account | Sign-in | Notes |
|---|---|---|
| Demo user "Kasun Perera" (fictional) | `kasun.demo@example.lk` / `demo-kasun-2026` | Created by the seed outside production. Also reachable from "Explore the demo account" on the sign-in page. |
| Administrator | each address in `ADMIN_EMAILS` | Set `SEED_ADMIN_PASSWORD` before seeding to create it, or register normally and re-run the seed to promote it. |

E-mail is not delivered anywhere yet: verification and reset links are printed in the server
log (see "Not built").

## Checks

```bash
npm test                 # unit + integration (integration uses a separate <db>_test database)
npm run test:coverage
npm run test:e2e         # Playwright; starts the dev server if one is not running
npm run lint
npm run typecheck
npm run build
```

- **Unit** (`tests/unit`): the tax engine, including the six worked examples from IRD's own
  Guide to the individual return for 2025/2026, reproduced to the rupee; the CSV statement
  reader; and the translation catalogs.
- **Integration** (`tests/integration`): the real services against PostgreSQL — authentication,
  2FA, CRUD, ownership isolation between two users, documents, exports, rule versioning,
  monthly totals and statement import.
- **End-to-end** (`tests/e2e`): register → onboard → income and APIT → calculation and "Why?" →
  payment → expense → document upload → report export → sign out → delete account.

## How it is put together

```
app/            routes only: pages, layouts, Server Actions (app/actions), Route Handlers (app/api)
components/     UI. No business rules and no tax figures.
services/       use-cases: every function takes the signed-in user's id and scopes each query by it
lib/tax/        the tax engine — pure functions, no database, no framework
lib/tax/data/   seed definitions of rules, sources and deadlines (the database is the runtime source)
lib/import/     reading a CSV statement into dated amounts — pure functions that run in the browser
lib/auth/       sessions, password hashing, TOTP, rate limiting
lib/validation/ Zod schemas shared by browser and server
lib/integrations/ interfaces for things not built yet (OCR, AI assistant); see its README
prisma/         schema, migrations, seed
```

**Calculation.** `computeTax(inputs, ruleSet)` in [lib/tax/engine.ts](lib/tax/engine.ts) is a
pure function. `services/tax/tax-service.ts` builds the inputs from a user's records, loads
the rule versions for the tax year and calls it — always on the server. The browser never
computes tax.

**Rule versioning.** A `TaxRule` belongs to one tax year; each `TaxRuleVersion` has an
effective date range, a verification status and a source. Versions are immutable once active.
An administrator drafts a new version, runs it against fixed scenarios to see old and new
results side by side, then activates it. A version that starts mid-year leaves the earlier
one in force for the earlier period — this is how 2026/2027 holds a 10% capital gains rate to
2 June 2026 and 15% from 3 June. Every `TaxCalculation` stores a snapshot of its inputs,
result and the rule versions used, so earlier calculations never change.

**Many transactions.** Someone with dozens of sales and payments a day does not type each one.
Business income and expenses can be entered as a **monthly total** (`period = MONTHLY`, dated the
first of the month), and `/import` reads a bank, card or sales statement saved as CSV. The file
is parsed in the browser; the user matches the columns, reviews every row and its guessed
category, and saves either one record per transaction or monthly totals.
`services/records/import-service.ts` writes the rows in one transaction with one
recalculation, and skips rows identical to a record that already exists. The limit on single
cash payments (TAX_RULES.md §7) is not applied to a monthly total, and the reason shown on the
record says so.

**"Why?"** Each line of a calculation carries a plain-language reason and the id of the rule
version behind it. The UI shows the reason, the rule, its tax year, its source and when it was
last verified.

## Security

- Passwords hashed with Argon2id. Sessions are random 256-bit tokens; only their SHA-256 is
  stored. Cookies are `HttpOnly`, `SameSite=Lax`, and `Secure` in production.
- Every Server Action and Route Handler authenticates against the database, validates input
  with Zod, and passes the session's user id to a service that includes it in every query.
  The integration tests check that a second user cannot read, change, delete or attach to the
  first user's records.
- CSRF: Server Actions are origin-checked by Next.js; mutating Route Handlers check `Origin`
  themselves. `proxy.ts` is only an optimistic redirect and grants nothing.
- Rate limits on sign-in, registration, password reset, 2FA, uploads and the public calculator,
  as atomic counters in PostgreSQL. Accounts lock for 15 minutes after repeated failures.
- Sign-in and password reset do not reveal whether an address is registered.
- TOTP secrets and NIC numbers are encrypted at rest (AES-256-GCM); the NIC is only ever
  returned masked.
- Uploads: type detected from file content, 10 MB limit, stored outside the web root under an
  opaque key, served only to the owner with `nosniff` and a restrictive CSP.
- Security headers (CSP, frame-ancestors, HSTS, referrer and permissions policies) in
  `next.config.ts`. CSV exports neutralise formula cells.
- Audit log of sign-ins, record changes, exports and every tax-rule change, with secrets
  redacted.

Known gaps to close before a public launch: the CSP still allows inline scripts (move to
nonces), there is no virus scanning of uploads, rate limits are per-database rather than at
the edge, and the code has not had an independent security review.

## Not built

Stated plainly so nothing is mistaken for working:

- **E-mail delivery.** `lib/email.ts` has a console provider only. Reminders and links are
  logged, not sent.
- **Receipt OCR, AI assistant, bank feeds, SMS/WhatsApp, payment gateway, IRD integration.**
  Interfaces or notes exist in `lib/integrations/`; no provider is implemented and nothing is
  simulated.
- **Statement import beyond CSV.** PDF and Excel statements are not read, and money in is
  imported only as business income.
- **OAuth sign-in.**
- **Scheduled jobs.** Reminders are raised when a user opens the app. A cron calling
  `syncDeadlineReminders` for each user is needed for reminders to reach people who do not.
- **Tax features left out of the engine:** capital allowances, loss carry-forward, penalties
  and interest, senior-citizen provisions, film-industry qualifying payments, partnership and
  trust income. Each is listed in TAX_RULES.md with what the app does instead.
- **Languages.** English only; no Sinhala or Tamil.

## Stack notes

- Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS 4, shadcn/ui on Radix,
  Recharts, React Hook Form, Zod 4.
- **Prisma** with PostgreSQL. The brief named "Type ORM" in one place and Prisma in four
  (including `prisma/schema.prisma`); Prisma was used.
- TanStack Query is not used: data is read in Server Components and changed through Server
  Actions, so there is no client cache to manage.

## Disclaimer

This application provides estimates and organizational tools based on available Sri Lankan tax
rules. It is not a substitute for professional tax, legal, or accounting advice. Tax laws may
change. Always verify important matters with the Inland Revenue Department or a qualified tax
professional.
