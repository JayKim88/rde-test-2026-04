import type { EntityStats, Issue, PreviewResult } from "@/lib/import/types"

const ISSUE_LABELS: Record<Issue["kind"], string> = {
  duplicate_email: "Duplicate email",
  invalid_email: "Invalid email",
  missing_phone: "Missing phone",
  invalid_date: "Unparseable date",
  negative_value: "Negative value",
  null_preserved: "Null preserved",
  orphan_fk: "Orphan reference",
  end_before_start: "End before start",
  overlapping_active_lease: "Overlapping active leases",
  zero_amount: "Zero-amount payment",
  split_payment: "Split payment",
  open_no_close: "Closed but no close date",
  property_name_merged: "Property name merged",
}

type Severity = "drop" | "flag" | "merge"
const SEVERITY: Record<Issue["kind"], Severity> = {
  duplicate_email: "flag",
  invalid_email: "flag",
  missing_phone: "flag",
  invalid_date: "flag",
  negative_value: "flag",
  null_preserved: "flag",
  orphan_fk: "flag",
  end_before_start: "drop",
  overlapping_active_lease: "flag",
  zero_amount: "flag",
  split_payment: "flag",
  open_no_close: "flag",
  property_name_merged: "merge",
}

const SEV_STYLE: Record<Severity, { badge: string; row: string; dot: string }> = {
  drop:  { badge: "bg-red-100 text-red-700 border-red-200",  row: "border-red-100",    dot: "bg-red-400" },
  flag:  { badge: "bg-amber-100 text-amber-700 border-amber-200", row: "border-amber-100", dot: "bg-amber-400" },
  merge: { badge: "bg-blue-100 text-blue-700 border-blue-200", row: "border-blue-100",  dot: "bg-blue-400" },
}

const SEV_LABEL: Record<Severity, string> = {
  drop: "dropped",
  flag: "imported, flagged",
  merge: "merged",
}

function EntityRow({ label, s }: { label: string; s: EntityStats }) {
  const pct = s.parsed === 0 ? 100 : Math.round((s.kept / s.parsed) * 100)
  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="pl-5 py-2.5 pr-4 font-medium text-gray-900 text-sm">{label}</td>
      <td className="py-2.5 pr-4 text-right tabular-nums text-sm text-gray-500">{s.parsed}</td>
      <td className="py-2.5 pr-4 text-right tabular-nums text-sm">
        <span className="font-medium text-gray-900">{s.kept}</span>
        <span className="text-gray-400 text-xs ml-1">({pct}%)</span>
      </td>
      <td className="py-2.5 pr-4 text-right tabular-nums text-sm text-gray-500">{s.duplicates || "—"}</td>
      <td className="pr-5 py-2.5 text-right tabular-nums text-sm">
        {s.issues > 0
          ? <span className="text-amber-700 font-medium">{s.issues}</span>
          : <span className="text-gray-300">—</span>}
      </td>
    </tr>
  )
}

export function PreviewPanel({ preview }: { preview: PreviewResult }) {
  const total = preview.tenants.kept + preview.units.kept + preview.leases.kept +
    preview.charges.kept + preview.payments.kept + preview.workOrders.kept

  // Flatten and group issues by severity × kind
  const drops = preview.issues.filter(i => SEVERITY[i.kind] === "drop")
  const merges = preview.issues.filter(i => SEVERITY[i.kind] === "merge")
  const flags = preview.issues.filter(i => SEVERITY[i.kind] === "flag")

  return (
    <div className="space-y-4">
      {/* Summary counts */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-5 pt-4 pb-2 flex items-baseline justify-between">
          <h3 className="font-semibold text-gray-900">What will be imported</h3>
          <span className="text-xs text-gray-400">Source: Buildium</span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-5 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Entity</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wide">In file</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wide">Will import</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wide">Dupes</th>
              <th className="px-5 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wide">Flagged</th>
            </tr>
          </thead>
          <tbody className="px-5">
            <EntityRow label="Tenants"     s={preview.tenants} />
            <EntityRow label="Units"       s={preview.units} />
            <EntityRow label="Leases"      s={preview.leases} />
            <EntityRow label="Charges"     s={preview.charges} />
            <EntityRow label="Payments"    s={preview.payments} />
            <EntityRow label="Work orders" s={preview.workOrders} />
          </tbody>
        </table>
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-sm">
          <div className="text-gray-500">
            <span className="font-medium text-gray-900">{preview.properties.detected}</span> properties
            {preview.properties.mergedFromVariants > 0 && (
              <span className="ml-2 text-blue-600">
                · {preview.properties.mergedFromVariants} merged from name variants
              </span>
            )}
          </div>
          <div className="font-semibold text-gray-900">
            {total.toLocaleString()} records ready
          </div>
        </div>
      </div>

      {/* Issues */}
      {preview.issues.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-5 pt-4 pb-3 border-b border-gray-100 flex items-center gap-3">
            <h3 className="font-semibold text-gray-900">Issues surfaced</h3>
            <div className="flex gap-2 text-xs">
              {drops.length > 0   && <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">{drops.length} dropped</span>}
              {merges.length > 0  && <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">{merges.length} merged</span>}
              {flags.length > 0   && <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">{flags.length} flagged</span>}
            </div>
          </div>
          <IssueList issues={drops}  emptyOk />
          <IssueList issues={merges} emptyOk />
          <IssueList issues={flags}  emptyOk />
        </div>
      )}
    </div>
  )
}

function IssueList({ issues, emptyOk }: { issues: Issue[]; emptyOk?: boolean }) {
  if (issues.length === 0 && emptyOk) return null

  // Group by kind
  const byKind = new Map<Issue["kind"], Issue[]>()
  for (const i of issues) {
    const arr = byKind.get(i.kind) ?? []
    arr.push(i)
    byKind.set(i.kind, arr)
  }

  return (
    <div className="divide-y divide-gray-100">
      {[...byKind.entries()].map(([kind, list]) => {
        const sev = SEVERITY[kind]
        const s = SEV_STYLE[sev]
        return (
          <details key={kind} className="group">
            <summary className={`flex items-center gap-3 px-5 py-3 cursor-pointer list-none hover:bg-gray-50 border-l-2 ${s.row}`}>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
              <span className="text-sm font-medium text-gray-900 flex-1">{ISSUE_LABELS[kind]}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${s.badge}`}>
                {list.length} · {SEV_LABEL[sev]}
              </span>
              <span className="text-gray-300 text-xs group-open:rotate-90 transition-transform">▶</span>
            </summary>
            <ul className="px-5 pb-3 pt-1 space-y-1">
              {list.slice(0, 6).map((issue, i) => (
                <li key={i} className="flex gap-2 text-xs text-gray-600 py-0.5">
                  <span className="font-mono text-gray-400 shrink-0">{issue.externalId}</span>
                  <span className="text-gray-400">—</span>
                  <span>{issue.detail}</span>
                </li>
              ))}
              {list.length > 6 && (
                <li className="text-xs text-gray-400 italic pl-0">…and {list.length - 6} more</li>
              )}
            </ul>
          </details>
        )
      })}
    </div>
  )
}
