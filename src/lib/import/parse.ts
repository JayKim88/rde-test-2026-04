import JSZip from "jszip"
import Papa from "papaparse"
import type {
  RawCharge,
  RawLease,
  RawPayment,
  RawTenant,
  RawUnit,
  RawWorkOrder,
} from "./types"

export type ParsedBuildium = {
  tenants: RawTenant[]
  units: RawUnit[]
  leases: RawLease[]
  charges: RawCharge[]
  payments: RawPayment[]
  workOrders: RawWorkOrder[]
}

async function readCsv<T>(zip: JSZip, name: string): Promise<T[]> {
  const entry = zip.file(name)
  if (!entry) throw new Error(`Missing ${name} in zip`)
  const text = await entry.async("string")
  const parsed = Papa.parse<T>(text, {
    header: true,
    skipEmptyLines: true,
    transform: (v) => (typeof v === "string" ? v : v),
  })
  if (parsed.errors.length > 0) {
    // Non-fatal — row-level issues surface in preview stage
    console.warn(`[import] ${name} parse warnings:`, parsed.errors.slice(0, 3))
  }
  return parsed.data
}

export async function parseBuildiumZip(buffer: ArrayBuffer): Promise<ParsedBuildium> {
  const zip = await JSZip.loadAsync(buffer)
  const [tenants, units, leases, charges, payments, workOrders] = await Promise.all([
    readCsv<RawTenant>(zip, "tenants.csv"),
    readCsv<RawUnit>(zip, "units.csv"),
    readCsv<RawLease>(zip, "leases.csv"),
    readCsv<RawCharge>(zip, "charges.csv"),
    readCsv<RawPayment>(zip, "payments.csv"),
    readCsv<RawWorkOrder>(zip, "work_orders.csv"),
  ])
  return { tenants, units, leases, charges, payments, workOrders }
}
