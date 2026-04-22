"use server"

import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { revalidatePath } from "next/cache"
import { commitBuildium } from "@/lib/import/commit"
import { parseBuildiumZip } from "@/lib/import/parse"
import { computePreview } from "@/lib/import/preview"
import type { CommitResult, PreviewResult } from "@/lib/import/types"

const SAMPLE_ZIP = join(process.cwd(), "data", "buildium_export.zip")

async function bufferFromForm(formData: FormData): Promise<ArrayBuffer> {
  const useSample = formData.get("sample") === "1"
  if (useSample) {
    const buf = await readFile(SAMPLE_ZIP)
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
  }
  const file = formData.get("file") as File | null
  if (!file) throw new Error("No file uploaded")
  return await file.arrayBuffer()
}

export async function previewAction(formData: FormData): Promise<PreviewResult> {
  const buf = await bufferFromForm(formData)
  const parsed = await parseBuildiumZip(buf)
  return computePreview(parsed)
}

export async function commitAction(formData: FormData): Promise<CommitResult> {
  const buf = await bufferFromForm(formData)
  const parsed = await parseBuildiumZip(buf)
  const result = await commitBuildium(parsed)
  revalidatePath("/tenants")
  revalidatePath("/leases")
  revalidatePath("/dashboard")
  return result
}
