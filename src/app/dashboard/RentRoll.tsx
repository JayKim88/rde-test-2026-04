"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

export type RentRollRow = {
  leaseId: string
  tenantId: string | null
  tenant: string
  unit: string
  monthlyRent: number
  startDate: string
  endDate: string
  balance: number
  status: "current" | "late" | "notice"
}

type SortKey = keyof Pick<RentRollRow, "tenant" | "unit" | "monthlyRent" | "startDate" | "endDate" | "balance" | "status">

const COLUMNS: Array<{ key: SortKey; label: string; align?: "right" }> = [
  { key: "tenant", label: "Tenant" },
  { key: "unit", label: "Unit" },
  { key: "monthlyRent", label: "Monthly rent", align: "right" },
  { key: "startDate", label: "Start" },
  { key: "endDate", label: "End" },
  { key: "balance", label: "Balance", align: "right" },
  { key: "status", label: "Status" },
]

export function RentRoll({ rows }: { rows: RentRollRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("tenant")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  const sorted = useMemo(() => {
    const copy = [...rows]
    copy.sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av
      }
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av))
    })
    return copy
  }, [rows, sortKey, sortDir])

  function toggle(k: SortKey) {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else {
      setSortKey(k)
      setSortDir(k === "monthlyRent" || k === "balance" ? "desc" : "asc")
    }
  }

  function exportCsv() {
    const headers = ["tenant", "unit", "monthlyRent", "startDate", "endDate", "balance", "status"]
    const esc = (v: string | number) => {
      const s = String(v)
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const body = sorted
      .map((r) => [r.tenant, r.unit, r.monthlyRent, r.startDate, r.endDate, r.balance, r.status].map(esc).join(","))
      .join("\n")
    const csv = headers.join(",") + "\n" + body
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `rent-roll-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  if (rows.length === 0) {
    return (
      <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center text-sm text-gray-500">
        No active leases.
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50/50">
        <span className="text-xs text-gray-500">{sorted.length} active leases</span>
        <button
          onClick={exportCsv}
          className="text-xs font-medium px-3 py-1.5 bg-white border border-gray-200 rounded hover:bg-gray-100"
        >
          Export CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  className={`px-4 py-2.5 font-medium cursor-pointer select-none ${
                    c.align === "right" ? "text-right" : "text-left"
                  } hover:text-gray-900`}
                  onClick={() => toggle(c.key)}
                >
                  {c.label}
                  {sortKey === c.key && <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.leaseId} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-2.5 font-medium text-gray-900">
                  {r.tenantId ? (
                    <Link href={`/tenants/${r.tenantId}`} className="hover:text-blue-700">
                      {r.tenant}
                    </Link>
                  ) : (
                    <span className="text-gray-400 italic">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-gray-600">{r.unit}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">${r.monthlyRent.toLocaleString()}</td>
                <td className="px-4 py-2.5 text-gray-600 tabular-nums">{r.startDate}</td>
                <td className="px-4 py-2.5 text-gray-600 tabular-nums">{r.endDate}</td>
                <td className={`px-4 py-2.5 text-right tabular-nums ${r.balance > 0 ? "text-amber-700 font-medium" : "text-gray-500"}`}>
                  {r.balance > 0 ? `$${r.balance.toLocaleString()}` : "—"}
                </td>
                <td className="px-4 py-2.5">
                  <StatusBadge status={r.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: RentRollRow["status"] }) {
  const style =
    status === "current"
      ? "bg-green-100 text-green-800"
      : status === "late"
      ? "bg-amber-100 text-amber-800"
      : "bg-blue-100 text-blue-800"
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${style}`}>
      {status}
    </span>
  )
}
