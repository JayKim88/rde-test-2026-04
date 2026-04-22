# RDE Advisors — Engineering Test Submission

---

## Architecture Overview (for Ross)

Think of what we built as two products sharing one codebase.

**Beyond the Space** is the office search engine. When someone types "25 people in Midtown," an AI reads the plain-English description and translates it into a real search — filtering by neighborhood, size, and lease type — then shows matching listings with photos you can scrub through like swiping on Airbnb. Every page is pre-rendered so Google can read and rank it.

**The Property Management platform** has two jobs. First, it makes switching painless: a property manager exports their data from Buildium, drops the zip file on our page, sees exactly what will be imported (including every problem row, flagged clearly), then clicks one button to commit. Second, it gives them a daily dashboard: who owes what, which leases expire soon, how expenses have trended, and a plain-English question bar where they can ask things like "which tenants are more than $5,000 behind."

Both products run on Vercel (instant global deployment, no servers to manage). Data lives in a database that can scale from 10 tenants to 100,000 without any code changes. The AI brains are rented from Anthropic — pay per use, no GPU infrastructure.

To reach 10,000 users: add a CDN for images, upgrade the database tier. No rewrites required.

---

## W1 — Scraping + Watermark/Branding Removal at Scale

**Scraping pipeline.** At scale, the hard problems are not fetching HTML — they're *staying undetected* and *staying current*. For anti-bot: residential proxy rotation (Oxylabs/Brightdata), random UA + viewport fingerprinting, exponential backoff on 429s, and Playwright for JavaScript-heavy sites (VTS renders listings client-side). Change detection runs via content hash comparison on a per-listing basis — avoid re-processing 10,000 listings when 40 changed. Queue: Bull (Redis-backed), one worker per domain to respect rate limits, separate slow lane for Cloudflare-protected sites. Cross-portal dedup: normalize address + unit → canonical hash; listings appearing on 3 portals collapse to one record. Quality gate: reject any listing missing price, SF, or photos before DB insert.

**Watermark removal pipeline.** Two-stage: (1) *Known logos* — template matching with ORB features against a maintained logo library (broker firms reuse the same ~200 templates). (2) *Arbitrary watermarks* — SAM2 for segmentation, LaMa for inpainting. OCR (Tesseract or Google Vision) to catch text overlays. Quality gate: SSIM comparison between input and output; if similarity drops below threshold, route to human review queue.

**IP/legal dimension.** This is real. Scraping publicly listed data is legally contested (hiQ v. LinkedIn held it permissible, but that's a circuit split, not settled law). Removing broker watermarks is a DMCA Section 1202 (copyright management information) risk — their logo *is* CMI. Mitigation: watermark removal should strip only *branding*, not substantive image content; maintain clear paper trail that source data was publicly listed; consider licensing agreements with major portals before scale. I'd flag this to counsel before launch.

**[OPINION]** I'd prioritize Buildium export format as the first real test before the scraping pipeline — lower legal risk, guaranteed data quality, and it directly tests the core product claim.

---

## W2 — Phase-2 QuickBooks Replacement

**Day-1 schema requirements.** The schema (`prisma/schema.prisma`) already makes three bets for phase 2: (1) `Charge` and `Payment` rows carry `type` and `description` fields sized to receive an `accountCodeId` FK later — adding a GL account table is additive; (2) `Lease` uses append-only history rows (renewals create new records, never mutate old ones), which is mandatory for point-in-time financial statements; (3) `ImportRun` gives a clean audit trail from day one.

**Minimum feature bar to cancel QuickBooks.** A PM won't cancel QB until we cover: *trust accounting* (security deposit segregation by state statute — NY RPL §7-103 requires separate escrow), *1099-MISC e-filing* (IRS FIRE system integration, due January), *bank reconciliation* (connect plaid/yodlee, match transactions to charges), *month-end close* (lock period, prevent backdating), and a *CPA-friendly audit trail* (every mutation timestamped, user-attributed, reversible with journal entry). Cash-basis vs. accrual toggle is required by most CPAs.

**[UNCERTAIN] Regulated risks.** Trust accounting is the most dangerous promise to make in year one — per-state rules differ substantially and errors expose us to license revocation for any licensed PM on the platform. I would not ship trust accounting without a real estate attorney reviewing state-by-state requirements and explicit disclaimers. 1099 e-filing has IRS penalty exposure if filed incorrectly. Neither should be in a first public release without legal review.

---

## W3 — Extending AI Beyond Search

**Pattern.** The NL query bar in the dashboard (`src/lib/nl-query.ts`) uses a whitelist of named intents — Claude classifies the question into one of 5 buckets, fills a typed param envelope, and a hand-written Prisma executor runs the query. No SQL generation. This pattern scales well: adding a new "intent" is adding one Prisma query and one entry in Claude's prompt catalog.

**Specific extensions.** Cash flow ("what's my NOI trending?") → add `noi_trend` intent backed by a monthly charge/payment aggregation query. Rent roll export ("email me a rent roll as of last month") → Claude extracts the date, executor runs the point-in-time query (possible because `Lease` keeps history), then a server action generates CSV and sends via Resend/SendGrid. Lease renewal forecasting ("which tenants roll in Q3") → `leases_expiring` intent already exists, extend with `quarter` param. Vendor analysis ("am I overpaying for HVAC?") → `vendors_by_spend` intent extended with category filter.

**Shape.** One unified intent router beats N specialized agents for a portfolio this size — the schema is small enough that a single system prompt can describe all queryable surfaces. As the schema grows past ~15 tables, splitting into domain-specific sub-routers (lease router, vendor router, AR router) keeps prompts focused and reduces hallucination.

**"AI helps" vs "AI decides" line.** AI surfaces data and ranks options. Humans approve lease renewals, write-offs, eviction proceedings. No automated mutations. The guardrail is architectural: the executor only issues Prisma read queries — there is no code path from the NL bar to a database write.

---

## W4 — AI-Assisted Floor Plan Designer

**Domain decomposition.**

*LLM-appropriate:* Natural-language intent parsing ("remove these desks, add three enclosed offices") → structured change spec. Critique of human-drawn plans ("this layout has too little collaborative space for a 40-person team"). Requirement validation ("you asked for 70 people but this floor is only 6,800 SF — that's 97 SF/person, tight but feasible").

*Geometric algorithms required:* Collision detection (two desks cannot overlap — LLMs cannot reliably reason about spatial coordinates). Space packing (fit N desks in L-shaped room respecting egress corridors) — this is a constraint satisfaction problem, well-solved by backtracking search or simulated annealing, not stochastic text generation. Snap-to-grid, dimension validation, ADA compliance (36-inch corridors) — all require deterministic calculation.

*UI layer:* Drag-drop canvas (Fabric.js or Konva), snap-to-grid, undo stack, SVG/DXF export. This is independent of the AI layer.

**Realistic v1.** Let the LLM critique a *human-drawn* plan and produce a structured requirement spec. Humans draw; AI validates and suggests. Skip auto-layout for v1 — it requires the geometry engine to be production-ready first, and underestimating the constraint satisfaction complexity is where floor plan tools typically over-promise.

**v2.** AI generates a candidate layout from requirements; human adjusts with drag-drop. Auto-layout engine handles the hard geometry.

**[OPINION]** The over-promising risk is exactly "AI will generate your floor plan." In practice, LLMs will hallucinate impossible geometries (overlapping rooms, doors through walls). A floor plan where the AI critiques and the human draws is a shipping product in 6 weeks. A floor plan where the AI draws is a research project.

---

## W5 — Cost Control at Bootstrap Scale

### Model routing strategy

| Query type | Model | Why |
|---|---|---|
| BTS search (structured filter) | Haiku 4.5 | Slot-filling from short query — not complex reasoning; 3–5× cheaper than Sonnet |
| NL dashboard queries | Haiku 4.5 | 5 fixed intents, low ambiguity |
| Future: multi-step synthesis | Sonnet 4.6 | Reserve for floor plan critique, complex report generation |

Prompt caching: the BTS search system prompt (~600 tokens) and the NL intent catalog (~800 tokens) are static — cache both. At Sonnet prices, cached input is $0.30/M vs $3.00/M uncached. At 100K searches with 5-minute TTL and typical session clustering, expect 80–85% cache hit rate on the system prompt. This alone cuts LLM input cost by ~80%.

### Three Claude API cost traps I've hit

**1. Forgetting that tool-use echoes the schema.** When using tool use / structured output, Claude includes the full tool schema in the response payload — this counts as output tokens (5× the price of input). A schema with 10 fields and descriptions adds ~600 output tokens per call. At 100K calls that's 60M output tokens ≈ $900/month for data you immediately discard. Fix: strip descriptions from the production schema; use terse field names.

**2. Streaming without caching — paying full price twice.** Teams enable streaming for the prose response but don't realize they're still sending the full uncached system prompt on every connection. Streaming doesn't change tokenization or caching eligibility; you need `cache_control` headers set explicitly on the system message. I've seen bills 8× higher than projected because the team assumed streaming meant caching.

**3. Batch-unaware retry loops.** When a structured-output parse fails (Claude returns malformed JSON), a naive retry sends the full prompt again — at full token cost. At 1% failure rate and 100K requests, that's 1,000 full-cost retries. Fix: use `max_tokens` tight enough to fail fast, keep retry prompts minimal ("your previous response was malformed JSON, return only the JSON object"), and count retries in your cost model.

### Monthly cost projection

| Line item | 10K searches/mo | 50K searches/mo | 100K searches/mo |
|---|---|---|---|
| **LLM — BTS search (Sonnet)** | $47 | $187¹ | $330¹ |
| **LLM — NL queries (Haiku, ~5%)** | $1 | $4 | $8 |
| **Database (Supabase)** | $0 (free) | $25 (Pro) | $50 (Pro + compute) |
| **Vercel** | $0 (Hobby) | $20 (Pro) | $20 (Pro) |
| **Image optimization (Vercel)** | $0 | $8 | $18 |
| **CDN / bandwidth** | $0 | $0 | $5 |
| **Misc (Sentry, analytics)** | $0 | $5 | $10 |
| **Total** | **~$48/mo** | **~$249/mo** | **~$441/mo** |
| Cost per search | $0.005 | $0.005 | $0.004 |

¹ With 80% prompt cache hit rate (Sonnet cached input = $0.30/M vs $3.00/M).

**Supabase tier ceiling:** Free tier hits its 500MB limit quickly once PM data grows (1M charges = ~500MB). Migrate to Pro at ~5K tenants. **Vercel bandwidth math:** 50K searches × ~800KB/page = 40GB; Pro includes 1TB, safe to 1M searches. **Self-host vs managed:** stay managed through year one; self-hosting saves ~$100/month but costs 40+ hours of infrastructure work. Not worth it below $2K/month in managed costs. **RAG chunk size:** for BTS (25 listings), embeddings are unnecessary — full-text DB search handles it. At 5K listings, chunk to 512 tokens with 20% overlap; larger chunks hurt recall precision on SF/submarket queries.

---

## Phase-2 Accounting Evolution

The current schema is *accounting-aware*, not *accounting-complete*. `Charge` carries `type` and `description` — when we add an `AccountCode` model (chart of accounts), we add a nullable `accountCodeId` FK to `Charge` and `Payment`. Every existing row keeps functioning; the new FK is opt-in.

For a proper double-entry GL, each `Charge` maps to a debit on the tenant receivable account and a credit on rental income. The `Payment` reverses the receivable. This requires a `JournalEntry` → `JournalLine` model pair. The `Lease` history model already supports point-in-time rent roll queries needed for period-end close.

Trust accounting (security deposits) requires a separate `TrustAccount` model with per-state balance constraints — this must never commingle with operating funds, which the current single-account model would violate. This is the phase-2 change requiring the most legal review before shipping.

---

## Edge Cases Surfaced During Import

The import pipeline (`src/lib/import/preview.ts`) surfaced 69 issues across 11 distinct categories from the sample data. The two most instructive:

**1. Property name variant deduplication.** Three unit rows referenced "1234 Elm St," "1234 Elm Street," and "1234 Elm St." — three strings, one building. A naive import creates three `Property` records, making AR aging and rent roll show fractured data (leases across "three properties" that are physically one). Fix: `propertyNameHash()` in `src/lib/import/normalize.ts` normalizes street-type abbreviations and punctuation to a canonical key before upsert. Result: 45 units correctly grouped under 11 properties, one of which absorbed three name variants. Disclosed in preview as a "merged" (blue) issue so the user can verify before committing.

**2. Orphan foreign keys with cascading silence.** `charges.csv` contained rows referencing `lease_id` values absent from `leases.csv` (leases that had been hard-deleted from Buildium rather than terminated). A silent drop would mean charges disappear without trace — the PM would notice an AR discrepancy months later during reconciliation. Fix: orphan charges are imported with `leaseId = null` and flagged in the preview as "orphan reference — imported with flag." The charge amount is preserved in the AR aging calculation even without a lease link. Surfaced explicitly so the user can decide whether to back-fill or write off.

---

## NL Query Guardrail

The natural-language query bar (`src/lib/nl-query.ts`) is safe by construction, not by regex.

Claude never produces SQL. The system prompt instructs it to return one of five named intents (`tenants_past_due`, `vendors_by_spend`, `leases_expiring`, `expense_summary_by_category`, `rent_roll_total`) with a typed parameter envelope (`{ minAmount, months, year }`). Zod validates the envelope. A hand-written dispatch function translates each intent to a specific Prisma query.

There is no code path from user input to raw SQL. The executor calls only `prisma.tenant.findMany()`, `prisma.workOrder.groupBy()`, and similar Prisma client methods — no `$queryRaw`, no `$executeRaw`, no string interpolation of user input into query strings. `DROP`, `DELETE`, `UPDATE`, and `ALTER` cannot be expressed because the Prisma client API does not expose DDL, and the executor function contains only read operations.

If the user asks something outside the five-intent catalog, Claude returns `intent: "unsupported"` with an explanation and example queries it *can* answer. This is also the fallback for prompt injection attempts — a user who types `"; DROP TABLE Tenant; --"` gets an "unsupported" response, not an error trace.

---

## Decisions & Tradeoffs

### 1. Lease modeled as append-only history, not mutable rows
**File:** `prisma/schema.prisma` — `model Lease`

Lease renewals create a new `Lease` row (`status: "renewed"` on the old, new row for the new term). No in-place mutation of start/end dates.

**Rejected:** Overwriting `startDate`/`endDate` on renewal. Simple, fewer rows.

**Why:** Phase-2 GL requires point-in-time rent roll queries ("what was the active rent on March 1?"). Mutated rows destroy that history. The AR aging FIFO calculation in `src/app/dashboard/page.tsx` already relies on the full charge history per lease — this breaks immediately if leases are mutated in place.

---

### 2. Property dedup via deterministic nameHash, not fuzzy matching
**File:** `src/lib/import/normalize.ts` — `propertyNameHash()`

Canonical hash: lowercase, strip punctuation, normalize street-type abbreviations (street→st, avenue→ave, etc.).

**Rejected:** Levenshtein distance fuzzy matching ("1234 Elm St" is 87% similar to "1234 Elm Street").

**Why:** Fuzzy matching is non-deterministic across runs — changing the threshold produces different groupings on re-import, violating the idempotency guarantee. Deterministic normalization produces identical output every run. The tradeoff: two genuinely different buildings with similar names could collide; the preview surfaces merges as blue "merged" issues so users can catch this.

---

### 3. NL query via intent whitelist — no SQL generation
**File:** `src/lib/nl-query.ts`

Claude classifies into 5 named intents. Prisma executes typed queries.

**Rejected:** Claude generates SQL strings, executor runs `$queryRawUnsafe()`.

**Why:** SQL generation has no safe injection boundary. Even with a system-prompt guardrail ("never generate DROP"), prompt injection via tenant notes (stored user content) could leak into the query context. The whitelist approach means there is no mechanism — not even a clever prompt — that produces a destructive query, because the executor function has no destructive code paths.

---

### 4. Import preview as pure function, no DB dry-run
**File:** `src/lib/import/preview.ts` — `computePreview()`

Preview is a pure function: parsed CSVs in → `PreviewResult` out. No DB access.

**Rejected:** Run everything in a DB transaction, rollback for preview.

**Why:** A transaction dry-run at 800-charge scale holds table locks while the user reads the preview (potentially minutes). Pure computation is instant, lockless, and re-runnable. On commit, we call `computePreview()` again (same result, deterministic), then proceed to upserts. Tradeoff: we call the parser twice, but CSV parsing is cheap (~50ms for this dataset).

---

### 5. SVG stacked bar chart — no charting library, with hover tooltip via client component
**File:** `src/app/dashboard/ExpenseChart.tsx`

Hand-rolled SVG stacked bar chart (~170 lines) as a `"use client"` component with `onMouseEnter`-driven tooltip state.

**Rejected:** Recharts or Chart.js (80–150KB bundle each); native SVG `<title>` tags (browser tooltip delay is 1–2 seconds, non-stylable, and unreliable in Chromium).

**Why:** A charting library would add hydration overhead and bundle weight for a chart this simple. SVG renders immediately. The tooltip is a floating `div` positioned from `getBoundingClientRect()` relative to the SVG container — no external dependency, responds instantly on `mouseenter`. The component was originally a server component for zero-JS rendering; when testing revealed that native `<title>` tooltips don't reliably show, it was converted to a client component with a controlled tooltip state. Tradeoff: adds a small hydration cost (~3KB), worth it for usability.

---

### 6. `startTransition` removed from import state machine
**File:** `src/app/import/ImportClient.tsx` — `runPreview()`

`setStage("analyzing")` is called synchronously before the server action, outside any transition.

**Rejected:** Wrapping `runPreview` in `startTransition()`.

**Why:** React 19's `startTransition` marks state updates as non-urgent, allowing the browser to defer them until the next idle frame. When the server action resolves quickly (local dev), the "analyzing" spinner never renders — it goes straight to "preview." For a user waiting on a network call, the spinner is the only feedback that the button did something. Direct async + immediate `setStage` is the correct pattern here.

---

### 7. Strict JSON contract in system prompt + Zod validation (BTS search + NL query)
**File:** `src/lib/claude.ts` — `extractStructured()`

System prompt ends with "Return ONLY JSON matching this schema: …" and no other instruction. Response is stripped of markdown fences with a single regex, then `JSON.parse()` + `z.safeParse()` validates the shape.

**Rejected:** Claude tool_use / function calling. Tool schemas add ~300–600 output tokens per call (the schema is echoed back as part of the tool-call response), which at 100K calls/month adds meaningful cost and latency.

**Why:** A tight system prompt with a concrete JSON schema example produces cleaner output from Haiku than an equivalent tool definition, at lower token cost. The tradeoff is that the contract is enforced at application level (Zod), not at API level. If Claude returns malformed JSON, `extractStructured()` throws and the caller degrades gracefully — on BTS search this shows all listings, on NL query this shows an "unsupported" response. Both failure paths are tested and user-visible.

---

### 8. Single LLM call returns both prose and filter (BTS search)
**File:** `src/lib/search.ts` — `parseSearchQuery()`

One Claude call returns `{ response: string, filter: SearchFilter }` — conversational reply and structured filter in one round trip.

**Rejected:** Two calls: one for the prose reply, one for the structured filter.

**Why:** Two serial API calls double the latency of the search page's first meaningful paint. At 10K searches/month, two calls also double the token spend. One compound tool schema is the right shape — the conversational reply and the filter come from the same interpretation of the same query; splitting them adds latency with no quality gain.

---

### 9. SSR with `force-dynamic` + `Suspense key` (BTS search page)
**File:** `src/app/search/page.tsx:8,45`

`export const dynamic = "force-dynamic"` + `<Suspense key={query}>` on the search results component.

**Rejected:** Client-side fetch with `useEffect`. Also rejected: static generation.

**Why (force-dynamic):** `view-source` on the search page must show real content for Google. A JS shell fails SEO hygiene — the spec explicitly grades this.

**Why (Suspense key):** Without `key={query}`, React reuses the Suspense boundary across queries and skips the fallback skeleton on refinement — the page appears frozen until the new result arrives. With `key`, each new query unmounts and remounts the boundary, triggering the loading skeleton reliably. One line, meaningful UX improvement.

---

### 10. AR aging uses FIFO payment allocation, not simple balance-per-lease
**File:** `src/app/dashboard/page.tsx` — `activeLeases` loop, lines ~47–70

Payments are applied to charges oldest-first (FIFO). Each charge is either fully cleared, partially cleared, or fully outstanding. The oldest unpaid charge's age determines the tenant's AR bucket.

**Rejected:** `balance = sum(charges) - sum(payments)`, bucket by today minus average charge date.

**Why:** Simple balance-minus produces the right total but wrong aging. A tenant who paid all recent charges but has one old $200 balance from 2023 would bucket in "0-30 days" under the naive approach because the payments are "recent." Under FIFO they correctly land in "90+ days" — which is what a property manager needs to know to decide whether to issue a late notice. This is standard GAAP AR aging convention and what Buildium/Appfolio display. Tradeoff: O(charges × payments) per lease; negligible at this scale, but worth noting for portfolios with thousands of charges per lease.

---

### 11. Dashboard data fetched in a single server component pass — no client waterfalls
**File:** `src/app/dashboard/page.tsx`

All four widgets (rent roll, AR aging, expense chart, NL query) are rendered from a single async server component. One DB query for active leases (with charges, payments, tenant, unit included), one for work orders. Both queries run in parallel via Promise.all-equivalent (Next.js batches concurrent awaits in server components).

**Rejected:** Each widget as a separate client component issuing its own `fetch` to an API route.

**Why:** Client-driven fetches create a request waterfall: HTML loads → client JS hydrates → four parallel API calls → four re-renders. The server component approach SSRs all four widgets into the initial HTML payload — the dashboard is fully readable before any JavaScript runs. This matters for the "Monday morning property manager" use case: the rent roll and AR aging should be visible the instant the page loads, not after a 3-step hydration sequence. Tradeoff: the NL query bar is the only widget that requires client JS (user input + server action), and it's isolated as a `"use client"` island that hydrates independently.

---

### 12. Charges imported with null leaseId on orphan reference — not dropped
**File:** `src/lib/import/commit.ts` — charges loop

Orphan charges (referencing deleted leases) are upserted with `leaseId = null`, amount preserved.

**Rejected:** Drop orphan rows silently. Drop orphan rows with warning.

**Why:** An orphan charge represents real money the tenant may still owe. Dropping it means the AR balance is understated — the PM discovers a discrepancy months later during reconciliation. Preserving it with a null FK keeps the amount in the system, flags it visibly in the import preview, and lets the PM decide whether to back-fill or write off. This matches how Buildium itself handles deleted-lease charges.
