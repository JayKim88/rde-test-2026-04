"use client"

import { useRouter } from "next/navigation"
import { useRef, useState } from "react"

export function SearchBox({ chips, defaultValue, autoFocus }: { chips: string[]; defaultValue?: string; autoFocus?: boolean }) {
  const router = useRouter()
  const [value, setValue] = useState(defaultValue ?? "")
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const submit = (q: string) => {
    const trimmed = q.trim()
    if (!trimmed) return
    router.push(`/search?q=${encodeURIComponent(trimmed)}`)
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit(value)
        }}
        className="group relative"
      >
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              submit(value)
            }
          }}
          rows={3}
          placeholder="Describe your space…"
          autoFocus={autoFocus}
          className="w-full resize-none rounded-2xl border border-gray-300 bg-white px-5 py-4 text-lg shadow-sm transition focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
        />
        <button
          type="submit"
          className="absolute bottom-3 right-3 rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-40"
          disabled={!value.trim()}
        >
          Search
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => {
              setValue(chip)
              inputRef.current?.focus()
            }}
            className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 transition hover:border-gray-900 hover:text-gray-900"
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  )
}
