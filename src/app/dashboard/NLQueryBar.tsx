"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import type { NLResult } from "@/lib/nl-query"
import { nlQueryAction } from "./actions"

const EXAMPLES = [
  "tenants past due over $5,000",
  "vendors we paid over $10k this year",
  "leases expiring in 6 months",
  "expense breakdown",
  "total monthly rent",
]

export function NLQueryBar() {
  const [query, setQuery] = useState("")
  const [result, setResult] = useState<NLResult | null>(null)
  const [isPending, startTransition] = useTransition()

  function submit(q: string) {
    const text = q.trim()
    if (!text) return
    setQuery(text)
    startTransition(async () => {
      const r = await nlQueryAction(text)
      setResult(r)
    })
  }

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit(query)
        }}
      >
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask about tenants, leases, vendors, or expenses…"
            className="flex-1 px-4 py-2.5 rounded-lg bg-white/10 text-white placeholder:text-gray-400 border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/40"
          />
          <button
            type="submit"
            disabled={isPending || !query.trim()}
            className="px-4 py-2.5 rounded-lg bg-white text-gray-900 text-sm font-medium hover:bg-gray-100 disabled:opacity-50"
          >
            {isPending ? "Thinking…" : "Ask"}
          </button>
        </div>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((e) => (
          <button
            key={e}
            onClick={() => submit(e)}
            className="text-xs px-2.5 py-1 rounded-full bg-white/10 text-gray-200 hover:bg-white/20 border border-white/10"
          >
            {e}
          </button>
        ))}
      </div>

      {result && (
        <div className="mt-5 bg-white rounded-xl p-4 text-gray-900">
          <div className="flex items-start gap-3 mb-3">
            <div className="mt-0.5 h-6 w-6 rounded-full bg-gray-900 text-white text-[10px] font-semibold grid place-items-center shrink-0">
              AI
            </div>
            <div>
              <p className="text-sm text-gray-800">{result.explanation}</p>
              {result.meta?.caption && (
                <p className="mt-0.5 text-xs text-gray-500">{result.meta.caption}</p>
              )}
              <p className="mt-1 text-[10px] uppercase tracking-wide text-gray-400">
                Intent: {result.intent}
              </p>
            </div>
          </div>

          {result.intent === "unsupported" ? null : result.rows.length === 0 ? (
            <div className="text-sm text-gray-500 italic border-t border-gray-100 pt-3">
              No matching records.
            </div>
          ) : (
            <ResultTable result={result} />
          )}
        </div>
      )}
    </div>
  )
}

function ResultTable({ result }: { result: NLResult }) {
  const cols = result.columns
  return (
    <div className="overflow-x-auto border-t border-gray-100 pt-3">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
            {cols.map((c) => (
              <th key={c} className={`pb-2 pr-4 font-medium ${isNumeric(c) ? "text-right" : ""}`}>
                {humanize(c)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.slice(0, 20).map((row, i) => {
            const href = typeof row._href === "string" ? row._href : null
            return (
              <tr key={i} className="border-t border-gray-100">
                {cols.map((c, ci) => {
                  const val = row[c]
                  const content =
                    typeof val === "number" && c !== "jobs" && c !== "activeLeases"
                      ? `$${val.toLocaleString()}`
                      : typeof val === "number"
                      ? val.toLocaleString()
                      : String(val ?? "")
                  const align = isNumeric(c) ? "text-right tabular-nums" : ""
                  if (ci === 0 && href) {
                    return (
                      <td key={c} className={`py-1.5 pr-4 ${align}`}>
                        <Link href={href} className="text-blue-700 hover:underline font-medium">
                          {content}
                        </Link>
                      </td>
                    )
                  }
                  return (
                    <td key={c} className={`py-1.5 pr-4 text-gray-700 ${align}`}>
                      {content}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
      {result.rows.length > 20 && (
        <p className="mt-2 text-xs text-gray-400">Showing first 20 of {result.rows.length} rows.</p>
      )}
    </div>
  )
}

function isNumeric(col: string): boolean {
  return /amount|total|balance|rent|monthly|annual|jobs|cost|days|active/i.test(col)
}

function humanize(col: string): string {
  return col
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim()
}
