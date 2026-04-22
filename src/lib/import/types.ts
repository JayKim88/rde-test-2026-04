export type RawTenant = {
  tenant_id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  date_of_birth: string
  status: string
  notes: string
}

export type RawUnit = {
  unit_id: string
  property_name: string
  unit_number: string
  bedrooms: string
  bathrooms: string
  square_feet: string
  monthly_rent_target: string
  status: string
}

export type RawLease = {
  lease_id: string
  tenant_id: string
  unit_id: string
  start_date: string
  end_date: string
  monthly_rent: string
  security_deposit: string
  status: string
}

export type RawCharge = {
  charge_id: string
  lease_id: string
  charge_date: string
  amount: string
  type: string
  description: string
}

export type RawPayment = {
  payment_id: string
  lease_id: string
  payment_date: string
  amount: string
  method: string
  notes: string
}

export type RawWorkOrder = {
  work_order_id: string
  unit_id: string
  opened_date: string
  closed_date: string
  status: string
  category: string
  description: string
  vendor_name: string
  cost: string
}

export type Issue = {
  entity: "tenant" | "unit" | "lease" | "charge" | "payment" | "work_order"
  externalId: string
  kind: IssueKind
  detail: string
}

export type IssueKind =
  | "duplicate_email"
  | "invalid_email"
  | "missing_phone"
  | "invalid_date"
  | "negative_value"
  | "null_preserved"
  | "orphan_fk"
  | "end_before_start"
  | "overlapping_active_lease"
  | "zero_amount"
  | "split_payment"
  | "open_no_close"
  | "property_name_merged"

export type EntityStats = {
  parsed: number
  kept: number
  duplicates: number // same externalId seen twice in source
  issues: number
}

export type PreviewResult = {
  source: "buildium"
  tenants: EntityStats
  units: EntityStats
  leases: EntityStats
  charges: EntityStats
  payments: EntityStats
  workOrders: EntityStats
  properties: {
    detected: number
    mergedFromVariants: number
  }
  issues: Issue[]
  samples: {
    tenants: Array<{ externalId: string; name: string; email: string | null; status: string }>
    leases: Array<{ externalId: string; unit: string; rent: number; status: string }>
  }
}

export type CommitResult = {
  importRunId: string
  counts: {
    properties: number
    units: number
    tenants: number
    leases: number
    charges: number
    payments: number
    workOrders: number
  }
}
