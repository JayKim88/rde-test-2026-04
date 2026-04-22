import type { Metadata } from "next"
import { ImportClient } from "./ImportClient"

export const metadata: Metadata = {
  title: "Import",
  description:
    "One-button migration from Buildium, Appfolio, or Yardi. Preview every row before you commit.",
}

export default function ImportPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
          Leaving Buildium?
        </h1>
        <p className="mt-2 text-gray-600 max-w-2xl">
          Drop your export zip, see exactly what we&apos;ll import, commit when you&apos;re ready.
          We never silently drop rows — every edge case surfaces below.
        </p>
      </div>
      <ImportClient />
    </div>
  )
}
