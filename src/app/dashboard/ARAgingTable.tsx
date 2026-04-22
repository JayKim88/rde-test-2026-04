import Link from "next/link"

export type ARRow = {
  tenantId: string
  tenant: string
  unit: string
  balance: number
  bucket: "0-30" | "31-60" | "61-90" | "90+"
  ageDays: number
}

type Totals = Record<ARRow["bucket"], number>

const BUCKET_ORDER = ["0-30", "31-60", "61-90", "90+"] as const

export function ARAgingTable({ rows, totals }: { rows: ARRow[]; totals: Totals }) {
  const grandTotal = rows.reduce((a, r) => a + r.balance, 0)

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Bucket summary */}
      <div className="grid grid-cols-4 border-b border-gray-100">
        {BUCKET_ORDER.map((b) => {
          const v = totals[b] ?? 0
          const pct = grandTotal > 0 ? (v / grandTotal) * 100 : 0
          return (
            <div key={b} className="px-3 py-3 border-r last:border-r-0 border-gray-100">
              <div className="text-[10px] uppercase tracking-wide text-gray-500">{b} days</div>
              <div className={`mt-0.5 text-sm font-semibold tabular-nums ${bucketText(b)}`}>
                ${Math.round(v).toLocaleString()}
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div className={`h-full ${bucketBar(b)}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      {rows.length === 0 ? (
        <div className="p-6 text-center text-sm text-gray-500">
          No outstanding balances. 🎉
        </div>
      ) : (
        <div className="max-h-[340px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Tenant</th>
                <th className="px-4 py-2 text-left font-medium">Bucket</th>
                <th className="px-4 py-2 text-right font-medium">Balance</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.tenantId} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-900">
                    <Link href={`/tenants/${r.tenantId}`} className="hover:text-blue-700 font-medium">
                      {r.tenant}
                    </Link>
                    <div className="text-xs text-gray-500">{r.unit}</div>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${bucketBadge(r.bucket)}`}>
                      {r.bucket}
                    </span>
                    <div className="mt-0.5 text-[11px] text-gray-400">{r.ageDays}d</div>
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums font-medium text-gray-900">
                    ${Math.round(r.balance).toLocaleString()}
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

function bucketText(b: ARRow["bucket"]): string {
  return b === "0-30"
    ? "text-green-700"
    : b === "31-60"
    ? "text-amber-700"
    : b === "61-90"
    ? "text-orange-700"
    : "text-red-700"
}
function bucketBar(b: ARRow["bucket"]): string {
  return b === "0-30"
    ? "bg-green-500"
    : b === "31-60"
    ? "bg-amber-500"
    : b === "61-90"
    ? "bg-orange-500"
    : "bg-red-500"
}
function bucketBadge(b: ARRow["bucket"]): string {
  return b === "0-30"
    ? "bg-green-100 text-green-800"
    : b === "31-60"
    ? "bg-amber-100 text-amber-800"
    : b === "61-90"
    ? "bg-orange-100 text-orange-800"
    : "bg-red-100 text-red-800"
}
