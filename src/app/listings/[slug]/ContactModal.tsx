"use client"

import { useState } from "react"

export function ContactModal({ address, unit }: { address: string; unit: string }) {
  const [open, setOpen] = useState(false)
  const [sent, setSent] = useState(false)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl bg-[var(--color-accent)] py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-accent-bold)] transition-colors mb-3"
      >
        Contact broker
      </button>
    )
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-[var(--color-surface-raised)] border border-[var(--color-edge)] p-6 shadow-xl">
          {sent ? (
            <div className="text-center py-6">
              <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-2xl">✓</div>
              <p className="font-semibold text-[var(--color-ink)] mb-1">Request sent</p>
              <p className="text-sm text-[var(--color-ink-muted)]">A broker will reach out within one business day.</p>
              <button
                onClick={() => { setSent(false); setOpen(false) }}
                className="mt-6 w-full rounded-xl border border-[var(--color-edge)] py-2.5 text-sm font-medium text-[var(--color-ink-dim)] hover:bg-[var(--color-surface-overlay)] transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h3 className="font-semibold text-[var(--color-ink)]">Contact broker</h3>
                  <p className="text-sm text-[var(--color-ink-muted)] mt-0.5">{address} · {unit}</p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-overlay)] transition-colors"
                  aria-label="Close"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); setSent(true) }} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--color-ink-dim)] mb-1.5">Your name</label>
                  <input
                    type="text"
                    required
                    placeholder="Jane Smith"
                    className="w-full rounded-xl border border-[var(--color-edge)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-muted)] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--color-ink-dim)] mb-1.5">Email</label>
                  <input
                    type="email"
                    required
                    placeholder="you@company.com"
                    className="w-full rounded-xl border border-[var(--color-edge)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-muted)] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--color-ink-dim)] mb-1.5">Message <span className="text-[var(--color-ink-faint)]">(optional)</span></label>
                  <textarea
                    rows={3}
                    placeholder="We're a 25-person team looking to move in Q3…"
                    className="w-full resize-none rounded-xl border border-[var(--color-edge)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-muted)] transition-all"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-[var(--color-accent)] py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-accent-bold)] transition-colors"
                >
                  Send request
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  )
}
