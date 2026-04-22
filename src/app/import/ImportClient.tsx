"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import type { CommitResult, PreviewResult } from "@/lib/import/types"
import { commitAction, previewAction } from "./actions"
import { PreviewPanel } from "./PreviewPanel"

type Stage = "idle" | "analyzing" | "preview" | "committing" | "success" | "error"

export function ImportClient() {
  const [stage, setStage] = useState<Stage>("idle")
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [commitResult, setCommitResult] = useState<CommitResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [useSample, setUseSample] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Not using startTransition for stage changes — we need setStage("analyzing") to
  // render the spinner immediately before the async server action blocks.
  async function runPreview(sample: boolean) {
    setStage("analyzing")
    setError(null)
    const fd = new FormData()
    if (sample) {
      fd.set("sample", "1")
    } else {
      if (!file) {
        setError("Select a zip file first")
        setStage("error")
        return
      }
      fd.set("file", file)
    }
    try {
      const result = await previewAction(fd)
      setPreview(result)
      setUseSample(sample)
      setStage("preview")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Preview failed")
      setStage("error")
    }
  }

  async function runCommit() {
    setStage("committing")
    setError(null)
    const fd = new FormData()
    if (useSample) {
      fd.set("sample", "1")
    } else {
      if (!file) {
        setError("File missing — please re-upload")
        setStage("error")
        return
      }
      fd.set("file", file)
    }
    try {
      const result = await commitAction(fd)
      setCommitResult(result)
      setStage("success")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Commit failed")
      setStage("error")
    }
  }

  function reset() {
    setStage("idle")
    setPreview(null)
    setCommitResult(null)
    setError(null)
    setFile(null)
    setUseSample(false)
  }

  if (stage === "success" && commitResult) {
    return (
      <div className="max-w-3xl">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold">
              ✓
            </div>
            <h2 className="text-lg font-semibold text-green-900">Import committed</h2>
          </div>
          <p className="text-sm text-green-800 mb-4">
            Your Buildium data is now in the platform. You can re-run this import safely — it won&apos;t create duplicates.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <CountCard label="Properties" n={commitResult.counts.properties} />
            <CountCard label="Units" n={commitResult.counts.units} />
            <CountCard label="Tenants" n={commitResult.counts.tenants} />
            <CountCard label="Leases" n={commitResult.counts.leases} />
            <CountCard label="Charges" n={commitResult.counts.charges} />
            <CountCard label="Payments" n={commitResult.counts.payments} />
            <CountCard label="Work orders" n={commitResult.counts.workOrders} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/tenants"
              className="inline-flex items-center px-4 py-2 bg-green-700 text-white rounded-md text-sm font-medium hover:bg-green-800"
            >
              View tenants →
            </Link>
            <Link
              href="/leases"
              className="inline-flex items-center px-4 py-2 bg-white border border-green-700 text-green-700 rounded-md text-sm font-medium hover:bg-green-50"
            >
              View leases →
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center px-4 py-2 bg-white border border-green-700 text-green-700 rounded-md text-sm font-medium hover:bg-green-50"
            >
              Open dashboard →
            </Link>
            <button
              onClick={reset}
              className="inline-flex items-center px-4 py-2 text-gray-600 text-sm hover:text-gray-900"
            >
              Run another import
            </button>
          </div>
          <p className="text-xs text-green-700 mt-4 font-mono">
            Import run: {commitResult.importRunId}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Upload card */}
      {(stage === "idle" || stage === "error") && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Import from Buildium</h2>
          <p className="text-sm text-gray-600 mb-5">
            Drop your Buildium export zip, or try with the provided sample. We&apos;ll analyze it first — nothing is written until you approve.
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            <label className="block border-2 border-dashed border-gray-300 rounded-lg p-5 cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition">
              <div className="text-center">
                <div className="text-sm font-medium text-gray-900 mb-1">
                  {file ? file.name : "Click to select zip"}
                </div>
                <div className="text-xs text-gray-500">
                  {file
                    ? `${(file.size / 1024).toFixed(1)} KB`
                    : "tenants.csv, units.csv, leases.csv, ..."}
                </div>
              </div>
              <input
                type="file"
                accept=".zip,application/zip"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null
                  setFile(f)
                }}
              />
            </label>
            <div className="border border-gray-200 rounded-lg p-5 flex flex-col justify-between">
              <div>
                <div className="text-sm font-medium text-gray-900 mb-1">
                  Try with sample data
                </div>
                <div className="text-xs text-gray-500">
                  Uses the bundled Buildium export fixture — includes intentional quirks.
                </div>
              </div>
              <button
                onClick={() => runPreview(true)}
                className="mt-3 w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-md text-sm font-medium"
              >
                Analyze sample
              </button>
            </div>
          </div>

          {file && (
            <button
              onClick={() => runPreview(false)}
              className="mt-4 w-full px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-md text-sm font-medium"
            >
              Analyze {file.name}
            </button>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
              {error}
            </div>
          )}
        </div>
      )}

      {/* Progress */}
      {stage === "analyzing" && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <Spinner />
            <div>
              <div className="font-medium text-gray-900">Analyzing your export…</div>
              <div className="text-xs text-gray-500">Extracting zip, parsing CSVs, detecting issues.</div>
            </div>
          </div>
        </div>
      )}

      {/* Preview */}
      {stage === "preview" && preview && (
        <>
          <PreviewPanel preview={preview} />
          <div className="sticky bottom-0 bg-white border-t border-gray-200 -mx-6 px-6 py-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Review the numbers and flagged items above. Nothing has been written yet.
            </div>
            <div className="flex gap-2">
              <button
                onClick={reset}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={runCommit}
                className="px-5 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-md text-sm font-medium"
              >
                Commit import →
              </button>
            </div>
          </div>
        </>
      )}

      {stage === "committing" && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <Spinner />
            <div>
              <div className="font-medium text-gray-900">Writing to database…</div>
              <div className="text-xs text-gray-500">Upsert by external ID — safe to re-run.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CountCard({ label, n }: { label: string; n: number }) {
  return (
    <div className="bg-white border border-green-200 rounded-md p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-xl font-semibold text-gray-900 tabular-nums">{n}</div>
    </div>
  )
}

function Spinner() {
  return (
    <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
  )
}
