import Anthropic from "@anthropic-ai/sdk"
import { z } from "zod"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export const MODELS = {
  HAIKU: "claude-haiku-4-5",
  SONNET: "claude-sonnet-4-6",
} as const

type ClaudeUsage = {
  inputTokens: number
  outputTokens: number
  durationMs: number
}

/**
 * Single-shot structured extraction.
 * - Strict JSON output contract in system prompt
 * - Parses with tolerance for ```json wrappers
 * - Validates against Zod schema
 * - Retries on 429 / 5xx with exponential backoff
 * - 30s hard timeout
 */
export async function extractStructured<T>(
  systemPrompt: string,
  userPrompt: string,
  schema: z.ZodSchema<T>,
  opts: { maxTokens?: number; model?: string } = {}
): Promise<{ data: T; usage: ClaudeUsage }> {
  const start = Date.now()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30_000)

  try {
    const response = await retryWithBackoff(() =>
      client.messages.create(
        {
          model: opts.model ?? MODELS.HAIKU,
          max_tokens: opts.maxTokens ?? 1024,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        },
        { signal: controller.signal }
      )
    )

    const textBlock = response.content.find((b) => b.type === "text")
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text content in Claude response")
    }

    const jsonMatch = textBlock.text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
    const rawJson = (jsonMatch?.[1] ?? textBlock.text).trim()

    let parsed: unknown
    try {
      parsed = JSON.parse(rawJson)
    } catch {
      throw new Error(`Failed to parse JSON from Claude: ${rawJson.slice(0, 200)}`)
    }

    const validated = schema.safeParse(parsed)
    if (!validated.success) {
      throw new Error(`Schema mismatch: ${validated.error.message}`)
    }

    const usage: ClaudeUsage = {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      durationMs: Date.now() - start,
    }

    console.log("[claude] structured", { model: opts.model ?? MODELS.HAIKU, ...usage })

    return { data: validated.data, usage }
  } finally {
    clearTimeout(timeoutId)
  }
}

async function retryWithBackoff<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      const isRateLimit = err instanceof Anthropic.APIError && err.status === 429
      const isServer =
        err instanceof Anthropic.APIError && err.status !== undefined && err.status >= 500
      if (!isRateLimit && !isServer) throw err
      if (i === attempts - 1) break
      await new Promise((r) => setTimeout(r, Math.min(1000 * 2 ** i, 4000)))
    }
  }
  throw lastErr
}
