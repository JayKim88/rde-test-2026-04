import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const t = await prisma.tenant.findUnique({
    where: { id },
    select: { firstName: true, lastName: true },
  })
  if (!t) return { title: "Tenant not found" }
  return { title: `${t.firstName} ${t.lastName}` }
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}
function fmtMoney(n: number): string {
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
}

export default async function TenantDetailPage({ params }: Props) {
  const { id } = await params
  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      leases: {
        orderBy: { startDate: "desc" },
        include: {
          unit: { select: { unitNumber: true, property: { select: { name: true } } } },
          charges: { orderBy: { chargeDate: "desc" } },
          payments: { orderBy: { paymentDate: "desc" } },
        },
      },
    },
  })
  if (!tenant) notFound()

  const allCharges = tenant.leases.flatMap((l) => l.charges)
  const allPayments = tenant.leases.flatMap((l) => l.payments)
  const totalCharges = allCharges.reduce((a, c) => a + c.amount, 0)
  const totalPayments = allPayments.reduce((a, p) => a + p.amount, 0)
  const balance = totalCharges - totalPayments

  // Payment history: interleave charges + payments sorted desc by date.
  const ledger: Array<{
    kind: "charge" | "payment"
    date: Date
    amount: number
    label: string
    leaseExternalId: string
  }> = []
  for (const l of tenant.leases) {
    for (const c of l.charges) {
      ledger.push({
        kind: "charge",
        date: c.chargeDate,
        amount: c.amount,
        label: c.type + (c.description ? ` — ${c.description}` : ""),
        leaseExternalId: l.externalId,
      })
    }
    for (const p of l.payments) {
      ledger.push({
        kind: "payment",
        date: p.paymentDate,
        amount: p.amount,
        label: `Payment · ${p.method}${p.notes ? ` — ${p.notes}` : ""}`,
        leaseExternalId: l.externalId,
      })
    }
  }
  ledger.sort((a, b) => b.date.getTime() - a.date.getTime())

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 space-y-8">
      {/* Header */}
      <div>
        <Link href="/tenants" className="text-sm text-gray-500 hover:text-gray-900">
          ← Tenants
        </Link>
        <div className="mt-3 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
              {tenant.firstName} {tenant.lastName}
            </h1>
            <div className="mt-1 text-sm text-gray-500 flex gap-4">
              <span>{tenant.email ?? <em className="text-gray-400">no email</em>}</span>
              <span>{tenant.phone ?? <em className="text-gray-400">no phone</em>}</span>
              <span className="font-mono text-xs text-gray-400">{tenant.externalId}</span>
            </div>
          </div>
          <StatusBadge status={tenant.status} />
        </div>
      </div>

      {/* KPIs */}
      <section className="grid grid-cols-3 gap-4">
        <KPI label="Total charged" value={fmtMoney(totalCharges)} />
        <KPI label="Total paid" value={fmtMoney(totalPayments)} />
        <KPI
          label="Balance"
          value={fmtMoney(balance)}
          tone={balance > 50 ? "warn" : balance < -50 ? "ok" : "neutral"}
        />
      </section>

      {/* Leases */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Leases ({tenant.leases.length})</h2>
        {tenant.leases.length === 0 ? (
          <p className="text-sm text-gray-500">No leases on record.</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Lease</th>
                  <th className="px-4 py-2 text-left font-medium">Unit</th>
                  <th className="px-4 py-2 text-right font-medium">Monthly rent</th>
                  <th className="px-4 py-2 text-left font-medium">Term</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {tenant.leases.map((l) => (
                  <tr key={l.id} className="border-t border-gray-100">
                    <td className="px-4 py-2 font-mono text-xs text-gray-500">{l.externalId}</td>
                    <td className="px-4 py-2 text-gray-700">
                      {l.unit ? `${l.unit.property.name} · ${l.unit.unitNumber}` : <em className="text-gray-400">orphan</em>}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmtMoney(l.monthlyRent)}</td>
                    <td className="px-4 py-2 text-gray-600 tabular-nums">
                      {fmtDate(l.startDate)} → {fmtDate(l.endDate)}
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge status={l.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Ledger / payment history */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Payment history ({ledger.length})</h2>
        {ledger.length === 0 ? (
          <p className="text-sm text-gray-500">No ledger activity.</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Date</th>
                  <th className="px-4 py-2 text-left font-medium">Kind</th>
                  <th className="px-4 py-2 text-left font-medium">Description</th>
                  <th className="px-4 py-2 text-left font-medium">Lease</th>
                  <th className="px-4 py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {ledger.slice(0, 200).map((e, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="px-4 py-2 text-gray-600 tabular-nums">{fmtDate(e.date)}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          e.kind === "payment" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {e.kind}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-700">{e.label}</td>
                    <td className="px-4 py-2 font-mono text-xs text-gray-400">{e.leaseExternalId}</td>
                    <td
                      className={`px-4 py-2 text-right tabular-nums font-medium ${
                        e.kind === "payment" ? "text-green-700" : "text-gray-900"
                      }`}
                    >
                      {e.kind === "payment" ? "−" : "+"}
                      {fmtMoney(e.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {ledger.length > 200 && (
              <div className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100">
                Showing most recent 200 entries.
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

function KPI({
  label,
  value,
  tone = "neutral",
}: {
  label: string
  value: string
  tone?: "ok" | "warn" | "neutral"
}) {
  const color =
    tone === "warn" ? "text-amber-700" : tone === "ok" ? "text-green-700" : "text-gray-900"
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className={`mt-1 text-xl font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const style =
    status === "active"
      ? "bg-green-100 text-green-800"
      : status === "former" || status === "terminated" || status === "expired"
      ? "bg-gray-100 text-gray-700"
      : status === "renewed"
      ? "bg-blue-100 text-blue-800"
      : "bg-amber-100 text-amber-800"
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${style}`}>
      {status}
    </span>
  )
}
