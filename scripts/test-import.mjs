// One-shot smoke test: parse sample zip → preview → commit → re-commit (idempotency check).
// Run with: node scripts/test-import.mjs
import "dotenv/config"
import { readFile } from "node:fs/promises"
import { join } from "node:path"

const { parseBuildiumZip } = await import("../src/lib/import/parse.ts").catch(async () => {
  // tsx/ts-node fallback — use a minimal transform via esbuild
  throw new Error(
    "Run via: npx tsx scripts/test-import.mjs (or: npm i -D tsx && npx tsx ...)"
  )
})
const { computePreview } = await import("../src/lib/import/preview.ts")
const { commitBuildium } = await import("../src/lib/import/commit.ts")
const { prisma } = await import("../src/lib/prisma.ts")

const zipPath = join(process.cwd(), "data", "buildium_export.zip")
const buf = await readFile(zipPath)
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)

console.log("Parsing zip…")
const parsed = await parseBuildiumZip(ab)
console.log("Row counts:", {
  tenants: parsed.tenants.length,
  units: parsed.units.length,
  leases: parsed.leases.length,
  charges: parsed.charges.length,
  payments: parsed.payments.length,
  workOrders: parsed.workOrders.length,
})

console.log("\nComputing preview…")
const preview = computePreview(parsed)
console.log(JSON.stringify({
  tenants: preview.tenants,
  units: preview.units,
  leases: preview.leases,
  charges: preview.charges,
  payments: preview.payments,
  workOrders: preview.workOrders,
  properties: preview.properties,
  issueCount: preview.issues.length,
}, null, 2))

console.log("\nIssue kind breakdown:")
const byKind = {}
for (const i of preview.issues) byKind[i.kind] = (byKind[i.kind] ?? 0) + 1
console.log(byKind)

console.log("\nCommit #1…")
const r1 = await commitBuildium(parsed)
console.log("Committed:", r1.counts)

console.log("\nCommit #2 (idempotency)…")
const r2 = await commitBuildium(parsed)
console.log("Re-committed:", r2.counts)

console.log("\nDB totals after 2 runs (should equal single-run counts):")
const totals = {
  properties: await prisma.property.count(),
  units: await prisma.unit.count(),
  tenants: await prisma.tenant.count(),
  leases: await prisma.lease.count(),
  charges: await prisma.charge.count(),
  payments: await prisma.payment.count(),
  workOrders: await prisma.workOrder.count(),
  importRuns: await prisma.importRun.count(),
}
console.log(totals)

const idempotent =
  totals.properties === r1.counts.properties &&
  totals.units === r1.counts.units &&
  totals.tenants === r1.counts.tenants &&
  totals.leases === r1.counts.leases &&
  totals.charges === r1.counts.charges &&
  totals.payments === r1.counts.payments &&
  totals.workOrders === r1.counts.workOrders

console.log(idempotent ? "\n✓ IDEMPOTENT" : "\n✗ NOT IDEMPOTENT")
process.exit(idempotent ? 0 : 1)
