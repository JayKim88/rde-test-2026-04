import Link from "next/link"
import type { Metadata } from "next"
import { prisma } from "@/lib/prisma"

export const metadata: Metadata = { title: "Leases" }
export const dynamic = "force-dynamic"

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}
function fmtMoney(n: number): string {
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
}

export default async function LeasesPage() {
  const leases = await prisma.lease.findMany({
    orderBy: [{ status: "asc" }, { startDate: "desc" }],
    include: {
      tenant: { select: { id: true, firstName: true, lastName: true, externalId: true } },
      unit: { select: { unitNumber: true, property: { select: { name: true } } } },
    },
    take: 500,
  })

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leases</h1>
          <p className="text-sm text-gray-500 mt-0.5">{leases.length} imported</p>
        </div>
        <Link href="/import" className="text-sm text-gray-600 hover:text-gray-900">
          ← Import
        </Link>
      </div>
      {leases.length === 0 ? (
        <div className="border border-dashed border-gray-300 rounded-lg p-12 text-center">
          <p className="text-gray-500 mb-3">No leases yet.</p>
          <Link href="/import" className="text-blue-600 hover:underline text-sm">
            Run an import →
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">ID</th>
                <th className="px-4 py-2.5 text-left font-medium">Tenant</th>
                <th className="px-4 py-2.5 text-left font-medium">Unit</th>
                <th className="px-4 py-2.5 text-right font-medium">Rent</th>
                <th className="px-4 py-2.5 text-left font-medium">Start</th>
                <th className="px-4 py-2.5 text-left font-medium">End</th>
                <th className="px-4 py-2.5 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {leases.map((l) => (
                <tr key={l.id} className="border-t border-gray-100">
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{l.externalId}</td>
                  <td className="px-4 py-2.5 text-gray-900">
                    {l.tenant
                      ? <Link href={`/tenants/${l.tenant.id}`} className="hover:text-blue-600">{l.tenant.firstName} {l.tenant.lastName}</Link>
                      : <span className="text-gray-400 italic">orphan</span>}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">
                    {l.unit ? `${l.unit.property.name} · ${l.unit.unitNumber}` : <span className="text-gray-400 italic">orphan</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{fmtMoney(l.monthlyRent)}</td>
                  <td className="px-4 py-2.5 text-gray-600 tabular-nums">{fmtDate(l.startDate)}</td>
                  <td className="px-4 py-2.5 text-gray-600 tabular-nums">{fmtDate(l.endDate)}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      l.status === "active" ? "bg-green-100 text-green-800" :
                      l.status === "renewed" ? "bg-blue-100 text-blue-800" :
                      l.status === "terminated" ? "bg-red-100 text-red-800" :
                      "bg-gray-100 text-gray-700"
                    }`}>{l.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
