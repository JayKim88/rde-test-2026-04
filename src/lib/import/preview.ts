import type { ParsedBuildium } from "./parse"
import {
  isValidEmail,
  parseDate,
  parseFloatSafe,
  parseIntSafe,
  propertyNameHash,
} from "./normalize"
import type { Issue, PreviewResult } from "./types"

// Pure function: takes raw parsed CSVs → structured preview.
// No DB access, no side effects. Safe to re-run on commit for idempotency.
export function computePreview(raw: ParsedBuildium): PreviewResult {
  const issues: Issue[] = []

  // ---------- Tenants ----------
  const tenantIds = new Set<string>()
  const tenantDupIds = new Set<string>()
  const tenantSeenEmail = new Map<string, string>() // email → first externalId
  const keptTenants: string[] = []
  for (const t of raw.tenants) {
    if (!t.tenant_id) continue
    if (tenantIds.has(t.tenant_id)) {
      tenantDupIds.add(t.tenant_id)
      continue
    }
    tenantIds.add(t.tenant_id)
    keptTenants.push(t.tenant_id)

    if (t.email) {
      if (!isValidEmail(t.email)) {
        issues.push({
          entity: "tenant",
          externalId: t.tenant_id,
          kind: "invalid_email",
          detail: `"${t.email}" does not look like an email — imported without email`,
        })
      } else {
        const prior = tenantSeenEmail.get(t.email.toLowerCase())
        if (prior) {
          issues.push({
            entity: "tenant",
            externalId: t.tenant_id,
            kind: "duplicate_email",
            detail: `Email "${t.email}" also used by ${prior}`,
          })
        } else {
          tenantSeenEmail.set(t.email.toLowerCase(), t.tenant_id)
        }
      }
    }
    if (!t.phone || !t.phone.trim()) {
      issues.push({
        entity: "tenant",
        externalId: t.tenant_id,
        kind: "missing_phone",
        detail: "Phone number missing",
      })
    }
    if (t.date_of_birth && parseDate(t.date_of_birth) === null) {
      issues.push({
        entity: "tenant",
        externalId: t.tenant_id,
        kind: "invalid_date",
        detail: `DOB "${t.date_of_birth}" could not be parsed — imported as null`,
      })
    }
  }

  // ---------- Units + Property dedup ----------
  const unitIds = new Set<string>()
  const unitDupIds = new Set<string>()
  const keptUnits: string[] = []
  const propertyVariants = new Map<string, Set<string>>() // hash → raw-name set
  for (const u of raw.units) {
    if (!u.unit_id) continue
    if (unitIds.has(u.unit_id)) {
      unitDupIds.add(u.unit_id)
      continue
    }
    unitIds.add(u.unit_id)
    keptUnits.push(u.unit_id)

    const hash = propertyNameHash(u.property_name)
    let variants = propertyVariants.get(hash)
    if (!variants) {
      variants = new Set()
      propertyVariants.set(hash, variants)
    }
    variants.add(u.property_name)

    const sf = parseIntSafe(u.square_feet)
    if (sf !== null && sf < 0) {
      issues.push({
        entity: "unit",
        externalId: u.unit_id,
        kind: "negative_value",
        detail: `square_feet=${u.square_feet} — imported as null`,
      })
    }
    const rent = parseFloatSafe(u.monthly_rent_target)
    if (rent === null && u.monthly_rent_target) {
      issues.push({
        entity: "unit",
        externalId: u.unit_id,
        kind: "null_preserved",
        detail: `monthly_rent_target="${u.monthly_rent_target}" preserved as null`,
      })
    }
  }

  let mergedPropertyCount = 0
  for (const variants of propertyVariants.values()) {
    if (variants.size > 1) {
      mergedPropertyCount++
      const list = [...variants].map((v) => `"${v}"`).join(" / ")
      issues.push({
        entity: "unit",
        externalId: "—",
        kind: "property_name_merged",
        detail: `Merged ${variants.size} name variants into 1 property: ${list}`,
      })
    }
  }

  // ---------- Leases ----------
  const leaseIds = new Set<string>()
  const leaseDupIds = new Set<string>()
  const keptLeases: string[] = []
  const activeLeaseByUnit = new Map<string, string[]>() // unit_id → active lease ids
  for (const l of raw.leases) {
    if (!l.lease_id) continue
    if (leaseIds.has(l.lease_id)) {
      leaseDupIds.add(l.lease_id)
      continue
    }
    leaseIds.add(l.lease_id)
    keptLeases.push(l.lease_id)

    if (l.tenant_id && !tenantIds.has(l.tenant_id)) {
      issues.push({
        entity: "lease",
        externalId: l.lease_id,
        kind: "orphan_fk",
        detail: `References missing tenant ${l.tenant_id} — imported with null tenant`,
      })
    }
    if (l.unit_id && !unitIds.has(l.unit_id)) {
      issues.push({
        entity: "lease",
        externalId: l.lease_id,
        kind: "orphan_fk",
        detail: `References missing unit ${l.unit_id} — imported with null unit`,
      })
    }
    const start = parseDate(l.start_date)
    const end = parseDate(l.end_date)
    if (start && end && end < start) {
      issues.push({
        entity: "lease",
        externalId: l.lease_id,
        kind: "end_before_start",
        detail: `end_date ${l.end_date} < start_date ${l.start_date} — flagged, not imported`,
      })
      continue
    }
    if (l.status === "active" && l.unit_id && unitIds.has(l.unit_id)) {
      let arr = activeLeaseByUnit.get(l.unit_id)
      if (!arr) {
        arr = []
        activeLeaseByUnit.set(l.unit_id, arr)
      }
      arr.push(l.lease_id)
    }
  }
  for (const [unit, ids] of activeLeaseByUnit) {
    if (ids.length > 1) {
      issues.push({
        entity: "lease",
        externalId: ids.join(", "),
        kind: "overlapping_active_lease",
        detail: `Unit ${unit} has ${ids.length} active leases — flagged, both imported`,
      })
    }
  }

  // ---------- Charges ----------
  const chargeIds = new Set<string>()
  const chargeDupIds = new Set<string>()
  const keptCharges: string[] = []
  for (const c of raw.charges) {
    if (!c.charge_id) continue
    if (chargeIds.has(c.charge_id)) {
      chargeDupIds.add(c.charge_id)
      continue
    }
    chargeIds.add(c.charge_id)
    keptCharges.push(c.charge_id)

    if (c.lease_id && !leaseIds.has(c.lease_id)) {
      issues.push({
        entity: "charge",
        externalId: c.charge_id,
        kind: "orphan_fk",
        detail: `References missing lease ${c.lease_id} — imported with null lease`,
      })
    }
    const amt = parseFloatSafe(c.amount)
    if (amt !== null && amt < 0) {
      issues.push({
        entity: "charge",
        externalId: c.charge_id,
        kind: "negative_value",
        detail: `amount=${c.amount} — credit/adjustment preserved as negative`,
      })
    }
  }

  // ---------- Payments ----------
  const paymentIds = new Set<string>()
  const paymentDupIds = new Set<string>()
  const keptPayments: string[] = []
  const paymentKey = new Map<string, string[]>() // `${lease}|${date}` → paymentIds
  for (const p of raw.payments) {
    if (!p.payment_id) continue
    if (paymentIds.has(p.payment_id)) {
      paymentDupIds.add(p.payment_id)
      continue
    }
    paymentIds.add(p.payment_id)
    keptPayments.push(p.payment_id)

    if (p.lease_id && !leaseIds.has(p.lease_id)) {
      issues.push({
        entity: "payment",
        externalId: p.payment_id,
        kind: "orphan_fk",
        detail: `References missing lease ${p.lease_id} — imported with null lease`,
      })
    }
    const amt = parseFloatSafe(p.amount)
    if (amt === 0) {
      issues.push({
        entity: "payment",
        externalId: p.payment_id,
        kind: "zero_amount",
        detail: "Zero-amount payment — imported but flagged for review",
      })
    }
    if (p.lease_id && p.payment_date) {
      const key = `${p.lease_id}|${p.payment_date}`
      let arr = paymentKey.get(key)
      if (!arr) {
        arr = []
        paymentKey.set(key, arr)
      }
      arr.push(p.payment_id)
    }
  }
  for (const [key, ids] of paymentKey) {
    if (ids.length > 1) {
      issues.push({
        entity: "payment",
        externalId: ids.join(", "),
        kind: "split_payment",
        detail: `${ids.length} payments on same lease+date (${key}) — imported as separate rows`,
      })
    }
  }

  // ---------- Work orders ----------
  const woIds = new Set<string>()
  const woDupIds = new Set<string>()
  const keptWO: string[] = []
  for (const w of raw.workOrders) {
    if (!w.work_order_id) continue
    if (woIds.has(w.work_order_id)) {
      woDupIds.add(w.work_order_id)
      continue
    }
    woIds.add(w.work_order_id)
    keptWO.push(w.work_order_id)

    if (w.unit_id && !unitIds.has(w.unit_id)) {
      issues.push({
        entity: "work_order",
        externalId: w.work_order_id,
        kind: "orphan_fk",
        detail: `References missing unit ${w.unit_id} — imported with null unit`,
      })
    }
    if (w.status !== "closed" && !w.closed_date) {
      // expected — not an issue
    }
    if (w.status === "closed" && !w.closed_date) {
      issues.push({
        entity: "work_order",
        externalId: w.work_order_id,
        kind: "open_no_close",
        detail: `status=closed but closed_date empty — imported as open`,
      })
    }
    const cost = parseFloatSafe(w.cost)
    if (cost !== null && cost < 0) {
      issues.push({
        entity: "work_order",
        externalId: w.work_order_id,
        kind: "negative_value",
        detail: `cost=${w.cost} — imported as null, review manually`,
      })
    }
  }

  // ---------- Samples for UI ----------
  const tenantSamples = raw.tenants
    .filter((t) => tenantIds.has(t.tenant_id))
    .slice(0, 5)
    .map((t) => ({
      externalId: t.tenant_id,
      name: `${t.first_name} ${t.last_name}`.trim(),
      email: isValidEmail(t.email) ? t.email : null,
      status: t.status,
    }))
  const leaseSamples = raw.leases
    .filter((l) => leaseIds.has(l.lease_id))
    .slice(0, 5)
    .map((l) => ({
      externalId: l.lease_id,
      unit: l.unit_id,
      rent: parseFloatSafe(l.monthly_rent) ?? 0,
      status: l.status,
    }))

  return {
    source: "buildium",
    tenants: {
      parsed: raw.tenants.length,
      kept: keptTenants.length,
      duplicates: tenantDupIds.size,
      issues: issues.filter((i) => i.entity === "tenant").length,
    },
    units: {
      parsed: raw.units.length,
      kept: keptUnits.length,
      duplicates: unitDupIds.size,
      issues: issues.filter((i) => i.entity === "unit").length,
    },
    leases: {
      parsed: raw.leases.length,
      kept: keptLeases.length,
      duplicates: leaseDupIds.size,
      issues: issues.filter((i) => i.entity === "lease").length,
    },
    charges: {
      parsed: raw.charges.length,
      kept: keptCharges.length,
      duplicates: chargeDupIds.size,
      issues: issues.filter((i) => i.entity === "charge").length,
    },
    payments: {
      parsed: raw.payments.length,
      kept: keptPayments.length,
      duplicates: paymentDupIds.size,
      issues: issues.filter((i) => i.entity === "payment").length,
    },
    workOrders: {
      parsed: raw.workOrders.length,
      kept: keptWO.length,
      duplicates: woDupIds.size,
      issues: issues.filter((i) => i.entity === "work_order").length,
    },
    properties: {
      detected: propertyVariants.size,
      mergedFromVariants: mergedPropertyCount,
    },
    issues,
    samples: { tenants: tenantSamples, leases: leaseSamples },
  }
}
