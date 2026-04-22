import Link from "next/link"
import type { Metadata } from "next"
import { prisma } from "@/lib/prisma"

export const metadata: Metadata = { title: "Tenants" }
export const dynamic = "force-dynamic"

export default async function TenantsPage() {
  const tenants = await prisma.tenant.findMany({
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    include: { leases: { select: { id: true, status: true } } },
    take: 500,
  })

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tenants</h1>
          <p className="text-sm text-gray-500 mt-0.5">{tenants.length} imported</p>
        </div>
        <Link href="/import" className="text-sm text-gray-600 hover:text-gray-900">
          ← Import
        </Link>
      </div>
      {tenants.length === 0 ? (
        <div className="border border-dashed border-gray-300 rounded-lg p-12 text-center">
          <p className="text-gray-500 mb-3">No tenants yet.</p>
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
                <th className="px-4 py-2.5 text-left font-medium">Name</th>
                <th className="px-4 py-2.5 text-left font-medium">Email</th>
                <th className="px-4 py-2.5 text-left font-medium">Phone</th>
                <th className="px-4 py-2.5 text-left font-medium">Status</th>
                <th className="px-4 py-2.5 text-right font-medium">Leases</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id} className="border-t border-gray-100">
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{t.externalId}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-900">
                    <Link href={`/tenants/${t.id}`} className="hover:text-blue-600">
                      {t.firstName} {t.lastName}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{t.email ?? <span className="text-gray-400 italic">missing</span>}</td>
                  <td className="px-4 py-2.5 text-gray-600">{t.phone ?? <span className="text-gray-400 italic">missing</span>}</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-gray-500">{t.leases.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "active" ? "bg-green-100 text-green-800" :
    status === "former" ? "bg-gray-100 text-gray-700" :
    status === "prospect" ? "bg-blue-100 text-blue-800" :
    "bg-amber-100 text-amber-800"
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {status}
    </span>
  )
}
