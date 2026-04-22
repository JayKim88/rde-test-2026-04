/**
 * Natural-language query for the PM dashboard.
 *
 * SAFETY MODEL (guardrail by construction, not regex):
 * Claude never produces SQL. It chooses one of a small whitelist of intents and
 * fills a typed param envelope. We validate with Zod, then dispatch to a hand-
 * written Prisma executor. DROP / DELETE / UPDATE / ALTER cannot be expressed
 * because the executor only issues read queries via the Prisma client API — no
 * `$queryRawUnsafe`, no string interpolation, no user-supplied table names.
 *
 * If the user asks something outside the catalog, Claude returns
 * `intent: "unsupported"` with an explanation and a list of example queries.
 */
import { z } from "zod"
import { extractStructured, MODELS } from "./claude"
import { prisma } from "./prisma"

export const INTENTS = [
  "tenants_past_due",
  "vendors_by_spend",
  "leases_expiring",
  "expense_summary_by_category",
  "rent_roll_total",
  "unsupported",
] as const

export type Intent = (typeof INTENTS)[number]

export const NLIntentSchema = z.object({
  intent: z.enum(INTENTS),
  params: z.object({
    minAmount: z.number().nullable().default(null),
    months: z.number().int().nullable().default(null),
    year: z.number().int().nullable().default(null),
  }),
  explanation: z.string(),
})

export type NLIntent = z.infer<typeof NLIntentSchema>

export type NLResult = {
  intent: Intent
  explanation: string
  columns: string[]
  rows: Array<Record<string, string | number>>
  meta?: { caption?: string }
}

const SYSTEM_PROMPT = `You translate a property manager's English question into a structured query intent.

Return ONLY JSON matching this schema:
{
  "intent": one of [
    "tenants_past_due",              // tenants with outstanding balance (charges - payments)
    "vendors_by_spend",              // work-order vendors ranked by total cost
    "leases_expiring",               // active leases ending within N months
    "expense_summary_by_category",   // work-order spend grouped by category, last N months
    "rent_roll_total",               // total active monthly rent
    "unsupported"                    // question is outside the catalog
  ],
  "params": {
    "minAmount": number | null,   // e.g. "$5000" -> 5000
    "months":    number | null,   // e.g. "next 3 months" -> 3; "last 12 months" -> 12
    "year":      number | null    // e.g. "this year" / "2025" -> 2025
  },
  "explanation": string   // one short sentence restating how you interpreted the question
}

Rules:
- Pick the SINGLE closest intent. If nothing fits, use "unsupported" and explain briefly what kinds of questions you can answer.
- Do NOT invent new intents. Do NOT output SQL. Do NOT wrap in prose.
- If a param is not mentioned, use null. Never fabricate thresholds.
- "past due" / "late" / "behind" / "owes" → tenants_past_due
- "vendor" / "contractor" / "paid for repairs" → vendors_by_spend
- "expiring" / "renewal" / "rolls" / "ending" → leases_expiring
- "expense" / "spend" / "operating" / "cost" / "breakdown" → expense_summary_by_category
- "total rent" / "monthly rent" / "rent roll" → rent_roll_total`

export async function parseNLQuery(query: string): Promise<NLIntent> {
  const { data } = await extractStructured(SYSTEM_PROMPT, query, NLIntentSchema, {
    maxTokens: 400,
    model: MODELS.HAIKU,
  })
  return data
}

// ---------- Executors (Prisma-only, no raw SQL) ----------

async function execTenantsPastDue(minAmount: number | null): Promise<NLResult> {
  const threshold = minAmount ?? 0
  const tenants = await prisma.tenant.findMany({
    include: {
      leases: {
        include: {
          charges: { select: { amount: true } },
          payments: { select: { amount: true } },
        },
      },
    },
  })
  const rows = tenants
    .map((t) => {
      const charges = t.leases.flatMap((l) => l.charges).reduce((a, c) => a + c.amount, 0)
      const payments = t.leases.flatMap((l) => l.payments).reduce((a, p) => a + p.amount, 0)
      const balance = charges - payments
      return {
        name: `${t.firstName} ${t.lastName}`,
        email: t.email ?? "",
        charges: round2(charges),
        payments: round2(payments),
        balance: round2(balance),
        _href: `/tenants/${t.id}`,
      }
    })
    .filter((r) => r.balance > threshold)
    .sort((a, b) => b.balance - a.balance)
  return {
    intent: "tenants_past_due",
    explanation: `Tenants with outstanding balance over ${fmtUSD(threshold)} (charges minus payments).`,
    columns: ["name", "email", "charges", "payments", "balance"],
    rows,
  }
}

async function execVendorsBySpend(params: {
  minAmount: number | null
  year: number | null
}): Promise<NLResult> {
  const where: {
    vendorName: { not: null }
    cost: { not: null; gte?: number }
    openedDate?: { gte: Date; lt: Date }
  } = {
    vendorName: { not: null },
    cost: { not: null },
  }
  if (params.year) {
    where.openedDate = { gte: new Date(params.year, 0, 1), lt: new Date(params.year + 1, 0, 1) }
  }
  const workOrders = await prisma.workOrder.findMany({
    where,
    select: { vendorName: true, cost: true, category: true, openedDate: true },
  })
  const byVendor = new Map<string, { total: number; jobs: number }>()
  for (const w of workOrders) {
    if (!w.vendorName || w.cost == null) continue
    const v = byVendor.get(w.vendorName) ?? { total: 0, jobs: 0 }
    v.total += w.cost
    v.jobs += 1
    byVendor.set(w.vendorName, v)
  }
  const threshold = params.minAmount ?? 0
  const rows = Array.from(byVendor.entries())
    .map(([vendor, s]) => ({ vendor, jobs: s.jobs, total: round2(s.total) }))
    .filter((r) => r.total > threshold)
    .sort((a, b) => b.total - a.total)
  const yearNote = params.year ? ` in ${params.year}` : ""
  const minNote = threshold > 0 ? ` over ${fmtUSD(threshold)}` : ""
  return {
    intent: "vendors_by_spend",
    explanation: `Vendors ranked by total work-order spend${yearNote}${minNote}.`,
    columns: ["vendor", "jobs", "total"],
    rows,
  }
}

async function execLeasesExpiring(months: number | null): Promise<NLResult> {
  const windowMonths = months ?? 3
  const now = new Date()
  const cutoff = new Date(now)
  cutoff.setMonth(cutoff.getMonth() + windowMonths)
  const leases = await prisma.lease.findMany({
    where: {
      status: "active",
      endDate: { gte: now, lte: cutoff },
    },
    include: {
      tenant: { select: { id: true, firstName: true, lastName: true } },
      unit: { select: { unitNumber: true, property: { select: { name: true } } } },
    },
    orderBy: { endDate: "asc" },
  })
  const rows = leases.map((l) => ({
    tenant: l.tenant ? `${l.tenant.firstName} ${l.tenant.lastName}` : "—",
    unit: l.unit ? `${l.unit.property.name} · ${l.unit.unitNumber}` : "—",
    monthlyRent: round2(l.monthlyRent),
    endDate: l.endDate.toISOString().slice(0, 10),
    _href: l.tenant ? `/tenants/${l.tenant.id}` : "",
  }))
  return {
    intent: "leases_expiring",
    explanation: `Active leases expiring in the next ${windowMonths} months.`,
    columns: ["tenant", "unit", "monthlyRent", "endDate"],
    rows,
    meta: { caption: `Window: ${now.toISOString().slice(0, 10)} → ${cutoff.toISOString().slice(0, 10)}` },
  }
}

async function execExpenseSummary(months: number | null): Promise<NLResult> {
  const windowMonths = months ?? 12
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - windowMonths)
  const wos = await prisma.workOrder.findMany({
    where: { openedDate: { gte: cutoff }, cost: { not: null } },
    select: { category: true, cost: true },
  })
  const byCat = new Map<string, number>()
  for (const w of wos) {
    if (w.cost == null) continue
    byCat.set(w.category, (byCat.get(w.category) ?? 0) + w.cost)
  }
  const rows = Array.from(byCat.entries())
    .map(([category, total]) => ({ category, total: round2(total) }))
    .sort((a, b) => b.total - a.total)
  return {
    intent: "expense_summary_by_category",
    explanation: `Work-order spend grouped by category over the last ${windowMonths} months.`,
    columns: ["category", "total"],
    rows,
  }
}

async function execRentRollTotal(): Promise<NLResult> {
  const leases = await prisma.lease.findMany({
    where: { status: "active" },
    select: { monthlyRent: true },
  })
  const total = leases.reduce((a, l) => a + l.monthlyRent, 0)
  return {
    intent: "rent_roll_total",
    explanation: `Sum of monthly rent across active leases.`,
    columns: ["activeLeases", "monthlyRent", "annualizedRent"],
    rows: [
      {
        activeLeases: leases.length,
        monthlyRent: round2(total),
        annualizedRent: round2(total * 12),
      },
    ],
  }
}

export async function runNLQuery(userQuery: string): Promise<NLResult> {
  const intent = await parseNLQuery(userQuery)

  switch (intent.intent) {
    case "tenants_past_due":
      return execTenantsPastDue(intent.params.minAmount)
    case "vendors_by_spend":
      return execVendorsBySpend({ minAmount: intent.params.minAmount, year: intent.params.year })
    case "leases_expiring":
      return execLeasesExpiring(intent.params.months)
    case "expense_summary_by_category":
      return execExpenseSummary(intent.params.months)
    case "rent_roll_total":
      return execRentRollTotal()
    case "unsupported":
      return {
        intent: "unsupported",
        explanation:
          intent.explanation ||
          "I can't answer that yet. Try: tenants past due over $X, vendors paid over $Y, leases expiring in N months, expense breakdown, total rent.",
        columns: [],
        rows: [],
      }
  }
}

// ---------- helpers ----------

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function fmtUSD(n: number): string {
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
}
