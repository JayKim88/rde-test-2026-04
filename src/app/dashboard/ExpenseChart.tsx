"use client"

import { useState } from "react"

export type MonthlySlice = {
  month: string // "YYYY-MM"
  total: number
  byCategory: Record<string, number>
}

const PALETTE = [
  "#0f766e",
  "#6366f1",
  "#f59e0b",
  "#ef4444",
  "#14b8a6",
  "#a855f7",
  "#84cc16",
  "#f97316",
]

type TooltipState = {
  x: number
  y: number
  label: string
  value: number
  color: string
} | null

export function ExpenseChart({
  data,
  categories,
}: {
  data: MonthlySlice[]
  categories: string[]
}) {
  const [tooltip, setTooltip] = useState<TooltipState>(null)

  if (data.length === 0 || data.every((d) => d.total === 0)) {
    return (
      <div className="bg-white border border-dashed border-gray-300 rounded-xl p-10 text-center text-sm text-gray-500">
        No expense data yet — work-order costs will stack here once imported.
      </div>
    )
  }

  const max = Math.max(...data.map((d) => d.total), 1)
  const chartH = 220
  const chartW = 720
  const padL = 48
  const padR = 12
  const padT = 12
  const padB = 36
  const innerW = chartW - padL - padR
  const innerH = chartH - padT - padB
  const barGap = 6
  const barW = (innerW - barGap * (data.length - 1)) / data.length
  const yTicks = 4
  const tickStep = max / yTicks
  const niceMax = Math.ceil(max / 1000) * 1000

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="relative" onMouseLeave={() => setTooltip(null)}>
        <svg
          viewBox={`0 0 ${chartW} ${chartH}`}
          width="100%"
          height={chartH}
          className="block"
        >
          {/* Y-axis gridlines + labels */}
          {Array.from({ length: yTicks + 1 }).map((_, i) => {
            const y = padT + innerH - (i / yTicks) * innerH
            const v = tickStep * i
            return (
              <g key={i}>
                <line x1={padL} x2={chartW - padR} y1={y} y2={y} stroke="#f3f4f6" />
                <text x={padL - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#9ca3af">
                  ${Math.round(v).toLocaleString()}
                </text>
              </g>
            )
          })}

          {/* Bars */}
          {data.map((slice, i) => {
            const x = padL + i * (barW + barGap)
            let yCursor = padT + innerH
            return (
              <g key={slice.month}>
                {categories.map((c, ci) => {
                  const v = slice.byCategory[c] ?? 0
                  if (v === 0) return null
                  const h = (v / max) * innerH
                  const y = yCursor - h
                  yCursor = y
                  const color = PALETTE[ci % PALETTE.length]
                  return (
                    <rect
                      key={c}
                      x={x}
                      y={y}
                      width={barW}
                      height={h}
                      fill={color}
                      className="cursor-pointer transition-opacity hover:opacity-80"
                      onMouseEnter={(e) => {
                        const svgEl = (e.target as SVGRectElement).closest("svg")!
                        const svgRect = svgEl.getBoundingClientRect()
                        const scaleX = svgRect.width / chartW
                        const scaleY = svgRect.height / chartH
                        setTooltip({
                          x: (x + barW / 2) * scaleX,
                          y: y * scaleY,
                          label: `${c} · ${slice.month}`,
                          value: v,
                          color,
                        })
                      }}
                    />
                  )
                })}
                <text
                  x={x + barW / 2}
                  y={chartH - padB + 16}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#6b7280"
                >
                  {slice.month.slice(5)}
                </text>
              </g>
            )
          })}

          {/* X-axis baseline */}
          <line
            x1={padL}
            x2={chartW - padR}
            y1={padT + innerH}
            y2={padT + innerH}
            stroke="#e5e7eb"
          />
        </svg>

        {/* Floating tooltip */}
        {tooltip && (
          <div
            className="pointer-events-none absolute z-10 rounded-lg bg-gray-900 px-3 py-2 text-xs text-white shadow-lg -translate-x-1/2 -translate-y-full"
            style={{ left: tooltip.x, top: tooltip.y - 6 }}
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              <span
                className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: tooltip.color }}
              />
              <span className="font-medium">{tooltip.label}</span>
            </div>
            <div className="tabular-nums font-semibold">
              ${Math.round(tooltip.value).toLocaleString()}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        {categories.map((c, i) => (
          <div key={c} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
            />
            {c}
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-gray-400">
        Peak month: ${Math.round(max).toLocaleString()} · Scale ceiling ${niceMax.toLocaleString()}
      </p>
    </div>
  )
}
