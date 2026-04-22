"use client"

import { useRouter } from "next/navigation"
import { useRef, useState } from "react"

export function SearchBox({
  chips,
  defaultValue,
  autoFocus,
}: {
  chips: string[]
  defaultValue?: string
  autoFocus?: boolean
}) {
  const router = useRouter()
  const [value, setValue] = useState(defaultValue ?? "")
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const submit = (q: string) => {
    const trimmed = q.trim()
    if (!trimmed) return
    router.push(`/search?q=${encodeURIComponent(trimmed)}`)
  }

  return (
    <div className="space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit(value)
        }}
        className="relative"
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
          className="w-full resize-none rounded-2xl border border-[var(--color-edge)] bg-[var(--color-surface-raised)] px-5 py-4 pr-24 text-[15px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] shadow-sm transition-all focus:border-[var(--color-accent)] focus:outline-none focus:ring-3 focus:ring-[var(--color-accent-muted)]"
        />
        <button
          type="submit"
          disabled={!value.trim()}
          className="absolute bottom-3 right-3 rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-bold)] disabled:opacity-40 disabled:cursor-not-allowed"
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
            className="rounded-full border border-[var(--color-edge)] bg-[var(--color-surface-raised)] px-3 py-1.5 text-sm text-[var(--color-ink-dim)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-muted)]"
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  )
}
