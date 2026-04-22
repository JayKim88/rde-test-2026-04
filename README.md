# Beyond the Space + PM Platform — Jay Kim

Full implementation of both products from the RDE Advisors engineering test:

- **Beyond the Space (BTS)** — AI-powered NYC office search at `/`, `/search`, `/listings/[slug]`
- **PM Platform** — one-button Buildium import at `/import`, dashboard at `/dashboard`, tenant/lease views

**Stack:** Next.js 16 · React 19 · Prisma 7 · Tailwind 4 · Neon Postgres · Anthropic Claude (Haiku 4.5)

---

## Running locally

### Prerequisites

- Node.js ≥ 20
- A [Neon](https://neon.tech) Postgres database (free tier, takes ~3 minutes to set up)
- An [Anthropic API key](https://console.anthropic.com/) for AI search and NL query features

### Step 1 — Environment variables

Create a `.env` file in the project root:

```
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
ANTHROPIC_API_KEY="sk-ant-..."
```

- `DATABASE_URL`: your Neon **direct (unpooled)** connection string. Do NOT use the pooled/pgbouncer URL — Prisma migrations require direct connections.
- `ANTHROPIC_API_KEY`: used by BTS search (`/search`) and the dashboard NL query bar. Without this key the app boots fine, but AI features return an error.

> **Prisma 7 note:** `DATABASE_URL` is read from `prisma.config.ts` → `process.env`, not from `schema.prisma`. Do not add `url = env("DATABASE_URL")` to `schema.prisma`.

### Step 2 — Install and migrate

```bash
npm install
npx prisma migrate dev --name init
```

### Step 3 — Seed listings

```bash
npx tsx --env-file=.env scripts/seed-listings.ts
```

This seeds the 25 NYC office listings from `data/listings.json` into the database. It is idempotent — safe to run multiple times.

### Step 4 — Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

- **BTS search**: type a query on the homepage (e.g., "25 people in Midtown") and press Enter
- **PM import**: go to `/import`, click "Try with sample data", preview, then commit
- **Dashboard**: go to `/dashboard` after importing to see rent roll, AR aging, and expense chart

---

## Deploying to Vercel

The schema is already on Postgres (committed in `prisma/schema.prisma`). No SQLite → Postgres migration needed.

**Step 1.** Push this repo to GitHub.

**Step 2.** Import the repo in Vercel. During setup, add these environment variables (Settings → Environment Variables, all three scopes: Production, Preview, Development):

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Your Neon **direct (unpooled)** connection string |
| `ANTHROPIC_API_KEY` | Your Anthropic API key |

**Step 3.** `prisma migrate deploy` runs automatically during build (via the `build` script in `package.json`) — no manual migration step needed.

**Step 4.** After first deploy, seed listings by running locally with `DATABASE_URL` pointed at Neon:

```bash
npx tsx --env-file=.env scripts/seed-listings.ts
```

**Step 5.** Disable Deployment Protection (Settings → Deployment Protection → None) so the URL is publicly accessible.

> **Stack note:** This implementation uses **Next.js 16, React 19, Prisma 7, and Tailwind 4**. Prisma's generated client lives at `src/generated/prisma` (not `@prisma/client`).

---

## Scope at a glance

See [`TEST_SPEC.md`](./TEST_SPEC.md) for full detail.

| Part | What | Suggested time |
|------|------|------|
| 1 | BTS chat-first search at `/`, `/search`, `/listings/[slug]` | 55 min |
| 2 | PM Buildium import at `/import` | 45 min |
| 3 | PM dashboard at `/dashboard` with rent roll / AR aging / expense chart / NL query | 55 min |
| 4 | Written answers W1–W5 in `SUBMISSION.md` | 40 min |
| 5 | Loom walkthrough | 10 min |

Times are **suggestions** — 205 min of active work inside the 3.5-hour (210 min) clock leaves ~5 min of slack. How you allocate is part of what we grade. See the "Clock & process rules" section in `TEST_SPEC.md` for hard rules (commit cadence, AI tool policy, etc.).

---

## Required deliverables

1. This repo pushed to **your GitHub** — invite `@rdeadvisors` if private.
2. **Live deploy URL** on Vercel or Netlify.
3. **`SUBMISSION.md`** in the repo root containing:
   - All five written answers (W1–W5)
   - A 200-word plain-English architecture overview written for a non-technical founder
   - A one-page cost projection table
   - A **Decisions & Tradeoffs** section with 5+ specific choices tied to files (see `TEST_SPEC.md` for detail)
4. **`README.md`** updated with "how to run this locally" for your specific implementation.
5. **Loom walkthrough** (5–10 min) including:
   - A 60-second "explain this to a non-technical founder" segment
   - A 2-minute walkthrough of 3 specific code decisions (what / rejected alternatives / why)
   - AI tool disclosure

---

## Rules

See `TEST_SPEC.md` → "Clock & process rules" for the authoritative list. Short version:

- **3.5-hour hard wall-clock.** Git commit timestamps are audited; do not rebase after the clock starts.
- **Commit at least every 30 minutes** with meaningful messages.
- **AI tools allowed** — disclose which ones in your Loom.
- **No subcontracting.** The code must be yours.
- **RDE claims no IP.** Everything you write belongs to you.
- **$100 paid** on any submission regardless of outcome.

---

## Known quirks in the starter data

> Candidates: read this section carefully — these are **intentional** gotchas your code must handle.

- **`data/listings.json`** contains **2 entries** with `submarket = "Grand Central"` and **1 entry** with `submarket = "Grand Central Area"`. Your search and normalization logic must handle both spellings gracefully.

- **`data/buildium_export.zip`** contains deliberate messiness that mirrors real production exports. Do **not** silently drop bad rows — surface them in the import preview step:
  - `tenants.csv`: duplicate email rows, missing phone numbers, malformed email addresses, em-dash in a last name, mixed date formats (MM/DD/YYYY and YYYY-MM-DD)
  - `units.csv`: property-name variations that refer to the same building (`"1234 Elm St"`, `"1234 Elm Street"`, `"1234 Elm St."`), rows with negative square footage, NULL monthly rent target
  - `leases.csv`: orphan `tenant_id` references not present in `tenants.csv`, leases where `end_date` is before `start_date`, overlapping active leases on the same unit
  - `charges.csv`: orphan `lease_id` references, rows with negative amounts
  - `payments.csv`: orphan `lease_id` references, zero-amount payments, split payments (same lease + same date across two rows)
  - `work_orders.csv`: open orders with no `closed_date`, descriptions in Spanish (UTF-8 encoding test), vendor names with apostrophes (`O'Malley & Sons`), rows with negative cost
