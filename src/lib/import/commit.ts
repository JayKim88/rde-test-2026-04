import { prisma } from "@/lib/prisma"
import type { ParsedBuildium } from "./parse"
import {
  isValidEmail,
  parseDate,
  parseFloatSafe,
  parseIntSafe,
  pickDisplayName,
  propertyNameHash,
} from "./normalize"
import { computePreview } from "./preview"
import type { CommitResult } from "./types"

// Idempotent commit — safe to re-run the same import.
// Every entity uses externalId @unique via upsert; Property uses nameHash.
// Rows that fail validation (end<start, bad dates on required fields) are skipped
// and counted in the preview; they do not get written.
export async function commitBuildium(raw: ParsedBuildium): Promise<CommitResult> {
  const preview = computePreview(raw)

  const run = await prisma.importRun.create({
    data: {
      source: "buildium",
      status: "preview",
      stats: JSON.stringify(preview),
    },
  })

  const counts = {
    properties: 0,
    units: 0,
    tenants: 0,
    leases: 0,
    charges: 0,
    payments: 0,
    workOrders: 0,
  }

  // ---------- Properties (dedup via nameHash) ----------
  const propByHash = new Map<string, Set<string>>()
  for (const u of raw.units) {
    const h = propertyNameHash(u.property_name)
    let v = propByHash.get(h)
    if (!v) {
      v = new Set()
      propByHash.set(h, v)
    }
    v.add(u.property_name)
  }
  const propertyIdByHash = new Map<string, string>()
  for (const [hash, variants] of propByHash) {
    const display = pickDisplayName(variants)
    const p = await prisma.property.upsert({
      where: { nameHash: hash },
      create: { name: display, nameHash: hash },
      update: { name: display },
    })
    propertyIdByHash.set(hash, p.id)
    counts.properties++
  }

  // ---------- Units ----------
  const seenUnit = new Set<string>()
  for (const u of raw.units) {
    if (!u.unit_id || seenUnit.has(u.unit_id)) continue
    seenUnit.add(u.unit_id)
    const pid = propertyIdByHash.get(propertyNameHash(u.property_name))
    if (!pid) continue
    const sf = parseIntSafe(u.square_feet)
    await prisma.unit.upsert({
      where: { externalId: u.unit_id },
      create: {
        externalId: u.unit_id,
        propertyId: pid,
        unitNumber: u.unit_number,
        bedrooms: parseIntSafe(u.bedrooms) ?? 0,
        bathrooms: parseFloatSafe(u.bathrooms) ?? 0,
        squareFeet: sf !== null && sf >= 0 ? sf : null,
        monthlyRentTarget: parseFloatSafe(u.monthly_rent_target),
        status: u.status || "unknown",
      },
      update: {
        propertyId: pid,
        unitNumber: u.unit_number,
        bedrooms: parseIntSafe(u.bedrooms) ?? 0,
        bathrooms: parseFloatSafe(u.bathrooms) ?? 0,
        squareFeet: sf !== null && sf >= 0 ? sf : null,
        monthlyRentTarget: parseFloatSafe(u.monthly_rent_target),
        status: u.status || "unknown",
      },
    })
    counts.units++
  }

  // ---------- Tenants ----------
  const seenTenant = new Set<string>()
  for (const t of raw.tenants) {
    if (!t.tenant_id || seenTenant.has(t.tenant_id)) continue
    seenTenant.add(t.tenant_id)
    const email = isValidEmail(t.email) ? t.email.trim() : null
    const phone = t.phone?.trim() || null
    const dob = parseDate(t.date_of_birth)
    await prisma.tenant.upsert({
      where: { externalId: t.tenant_id },
      create: {
        externalId: t.tenant_id,
        firstName: t.first_name,
        lastName: t.last_name,
        email,
        phone,
        dateOfBirth: dob,
        status: t.status || "unknown",
        notes: t.notes || null,
      },
      update: {
        firstName: t.first_name,
        lastName: t.last_name,
        email,
        phone,
        dateOfBirth: dob,
        status: t.status || "unknown",
        notes: t.notes || null,
      },
    })
    counts.tenants++
  }

  // ---------- Leases ----------
  const seenLease = new Set<string>()
  for (const l of raw.leases) {
    if (!l.lease_id || seenLease.has(l.lease_id)) continue
    const start = parseDate(l.start_date)
    const end = parseDate(l.end_date)
    if (!start || !end) continue // required fields — skipped and flagged in preview
    if (end < start) continue // flagged in preview, not imported
    seenLease.add(l.lease_id)

    let tenantId: string | null = null
    if (l.tenant_id) {
      const t = await prisma.tenant.findUnique({ where: { externalId: l.tenant_id } })
      tenantId = t?.id ?? null
    }
    let unitId: string | null = null
    if (l.unit_id) {
      const u = await prisma.unit.findUnique({ where: { externalId: l.unit_id } })
      unitId = u?.id ?? null
    }

    await prisma.lease.upsert({
      where: { externalId: l.lease_id },
      create: {
        externalId: l.lease_id,
        tenantId,
        unitId,
        startDate: start,
        endDate: end,
        monthlyRent: parseFloatSafe(l.monthly_rent) ?? 0,
        securityDeposit: parseFloatSafe(l.security_deposit),
        status: l.status || "unknown",
      },
      update: {
        tenantId,
        unitId,
        startDate: start,
        endDate: end,
        monthlyRent: parseFloatSafe(l.monthly_rent) ?? 0,
        securityDeposit: parseFloatSafe(l.security_deposit),
        status: l.status || "unknown",
      },
    })
    counts.leases++
  }

  // ---------- Charges ----------
  const seenCharge = new Set<string>()
  for (const c of raw.charges) {
    if (!c.charge_id || seenCharge.has(c.charge_id)) continue
    const date = parseDate(c.charge_date)
    if (!date) continue
    seenCharge.add(c.charge_id)

    let leaseId: string | null = null
    if (c.lease_id) {
      const l = await prisma.lease.findUnique({ where: { externalId: c.lease_id } })
      leaseId = l?.id ?? null
    }
    await prisma.charge.upsert({
      where: { externalId: c.charge_id },
      create: {
        externalId: c.charge_id,
        leaseId,
        chargeDate: date,
        amount: parseFloatSafe(c.amount) ?? 0,
        type: c.type || "unknown",
        description: c.description || null,
      },
      update: {
        leaseId,
        chargeDate: date,
        amount: parseFloatSafe(c.amount) ?? 0,
        type: c.type || "unknown",
        description: c.description || null,
      },
    })
    counts.charges++
  }

  // ---------- Payments ----------
  const seenPayment = new Set<string>()
  for (const p of raw.payments) {
    if (!p.payment_id || seenPayment.has(p.payment_id)) continue
    const date = parseDate(p.payment_date)
    if (!date) continue
    seenPayment.add(p.payment_id)

    let leaseId: string | null = null
    if (p.lease_id) {
      const l = await prisma.lease.findUnique({ where: { externalId: p.lease_id } })
      leaseId = l?.id ?? null
    }
    await prisma.payment.upsert({
      where: { externalId: p.payment_id },
      create: {
        externalId: p.payment_id,
        leaseId,
        paymentDate: date,
        amount: parseFloatSafe(p.amount) ?? 0,
        method: p.method || "unknown",
        notes: p.notes || null,
      },
      update: {
        leaseId,
        paymentDate: date,
        amount: parseFloatSafe(p.amount) ?? 0,
        method: p.method || "unknown",
        notes: p.notes || null,
      },
    })
    counts.payments++
  }

  // ---------- Work orders ----------
  const seenWO = new Set<string>()
  for (const w of raw.workOrders) {
    if (!w.work_order_id || seenWO.has(w.work_order_id)) continue
    const opened = parseDate(w.opened_date)
    if (!opened) continue
    seenWO.add(w.work_order_id)

    let unitId: string | null = null
    if (w.unit_id) {
      const u = await prisma.unit.findUnique({ where: { externalId: w.unit_id } })
      unitId = u?.id ?? null
    }
    const cost = parseFloatSafe(w.cost)
    await prisma.workOrder.upsert({
      where: { externalId: w.work_order_id },
      create: {
        externalId: w.work_order_id,
        unitId,
        openedDate: opened,
        closedDate: parseDate(w.closed_date),
        status: w.status || "unknown",
        category: w.category || "general",
        description: w.description || "",
        vendorName: w.vendor_name || null,
        cost: cost !== null && cost < 0 ? null : cost,
      },
      update: {
        unitId,
        openedDate: opened,
        closedDate: parseDate(w.closed_date),
        status: w.status || "unknown",
        category: w.category || "general",
        description: w.description || "",
        vendorName: w.vendor_name || null,
        cost: cost !== null && cost < 0 ? null : cost,
      },
    })
    counts.workOrders++
  }

  await prisma.importRun.update({
    where: { id: run.id },
    data: { status: "committed", committedAt: new Date() },
  })

  return { importRunId: run.id, counts }
}
