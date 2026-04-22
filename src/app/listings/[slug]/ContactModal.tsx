"use client"

import { useState } from "react"

export function ContactModal({ address, unit }: { address: string; unit: string }) {
  const [open, setOpen] = useState(false)
  const [sent, setSent] = useState(false)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl bg-gray-900 py-2.5 text-white font-medium hover:bg-gray-700 mb-2"
      >
        Contact broker
      </button>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
          {sent ? (
            <div className="text-center py-6">
              <div className="text-3xl mb-3">✓</div>
              <p className="font-semibold text-gray-900 mb-1">Request sent</p>
              <p className="text-sm text-gray-500">A broker will reach out within one business day.</p>
              <button
                onClick={() => { setSent(false); setOpen(false) }}
                className="mt-6 w-full rounded-xl border border-gray-300 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">Contact broker</h3>
                  <p className="text-sm text-gray-500 mt-0.5">{address} · {unit}</p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="text-gray-400 hover:text-gray-700 text-xl leading-none"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              <form
                onSubmit={(e) => { e.preventDefault(); setSent(true) }}
                className="space-y-3"
              >
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Your name</label>
                  <input
                    type="text"
                    required
                    placeholder="Jane Smith"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    placeholder="you@company.com"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Message (optional)</label>
                  <textarea
                    rows={3}
                    placeholder="We're a 25-person team looking to move in Q3…"
                    className="w-full resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-gray-900 py-2.5 text-white text-sm font-medium hover:bg-gray-700"
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
