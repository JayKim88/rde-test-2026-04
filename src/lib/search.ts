/**
 * BTS search: single Claude call → { response, filter } → DB query.
 * Degrades gracefully: if filter is empty/unparseable, we still show all listings
 * with the AI's explanation.
 */
import { z } from "zod"
import { callWithTool, MODELS } from "./claude"
import { prisma } from "./prisma"

export const SearchFilterSchema = z.object({
  submarket: z.string().nullable(),
  sfMin: z.number().nullable(),
  sfMax: z.number().nullable(),
  features: z.array(z.string()).default([]),
  subleaseOrDirect: z.enum(["sublease", "direct", "any"]).default("any"),
})

export type SearchFilter = z.infer<typeof SearchFilterSchema>

export const SearchResponseSchema = z.object({
  response: z.string(),
  filter: SearchFilterSchema,
})

export type SearchResponse = z.infer<typeof SearchResponseSchema>

// Known submarkets for better normalization hints to Claude.
const KNOWN_SUBMARKETS = [
  "hudson yards",
  "midtown east",
  "midtown west",
  "penn station",
  "grand central",
  "chelsea",
  "fidi",
  "flatiron",
  "soho",
  "tribeca",
]

const SYSTEM_PROMPT = `You help users find NYC office space. Call the parse_office_query tool to return a short conversational reply and structured filters for the user's request.

Submarket rules:
- Normalize to lowercase, match one of: ${KNOWN_SUBMARKETS.join(", ")} — else null.
- Aliases: "financial district" or "fidi" or "downtown" → "fidi"; "times square" → "midtown west"; "park avenue" or "lexington" or "east side" → "midtown east"; "west side" or "hell's kitchen" → "midtown west".
- "midtown" alone (no qualifier) → null. Ask east or west in your response.
- Never guess. If submarket is ambiguous, set null and explain.

Size rules:
- Team size (e.g., "25 people", "team of 30") → sfMin = people × 100, sfMax = people × 250.
- Exact SF (e.g., "10,000 SF") → sfMin = sfMax = that number.
- Approximate SF (e.g., "around 10k SF", "roughly 8,000 SF") → sfMin = value × 0.8, sfMax = value × 1.2.
- No size mentioned → sfMin = sfMax = null.

Type rules:
- "sublease" or "sublet" → "sublease". "direct" or "permanent" → "direct". Otherwise → "any".

Other rules:
- If query is unclear, set filter fields to null and ask one specific clarifying question in the response.
- Keep response max 2 sentences, conversational. Do not enumerate the filters back to the user.`

const TOOL_INPUT_SCHEMA = {
  type: "object",
  properties: {
    response: {
      type: "string",
      description: "Short conversational reply (max 2 sentences, friendly but direct)",
    },
    filter: {
      type: "object",
      properties: {
        submarket: { type: ["string", "null"], description: `Normalized lowercase submarket: ${KNOWN_SUBMARKETS.join(", ")}` },
        sfMin: { type: ["number", "null"], description: "Minimum square feet" },
        sfMax: { type: ["number", "null"], description: "Maximum square feet" },
        features: { type: "array", items: { type: "string" }, description: "Keywords like outdoor, column-free, LEED" },
        subleaseOrDirect: { type: "string", enum: ["sublease", "direct", "any"] },
      },
      required: ["submarket", "sfMin", "sfMax", "features", "subleaseOrDirect"],
    },
  },
  required: ["response", "filter"],
} as const

export async function parseSearchQuery(query: string): Promise<SearchResponse> {
  const { data } = await callWithTool(
    query,
    "parse_office_query",
    "Parse a natural language NYC office space query into a conversational reply and structured filters.",
    TOOL_INPUT_SCHEMA,
    SearchResponseSchema,
    { maxTokens: 512, model: MODELS.HAIKU, systemPrompt: SYSTEM_PROMPT }
  )
  return data
}

export async function findListings(filter: SearchFilter) {
  const AND: Record<string, unknown>[] = []

  if (filter.submarket) {
    AND.push({ submarketNorm: filter.submarket.toLowerCase() })
  }
  if (filter.sfMin != null && filter.sfMax != null) {
    AND.push({ sf: { gte: filter.sfMin, lte: filter.sfMax } })
  } else if (filter.sfMin != null) {
    AND.push({ sf: { gte: filter.sfMin } })
  } else if (filter.sfMax != null) {
    AND.push({ sf: { lte: filter.sfMax } })
  }
  if (filter.subleaseOrDirect === "sublease" || filter.subleaseOrDirect === "direct") {
    AND.push({ type: filter.subleaseOrDirect })
  }
  // features is stored as JSON string — substring match per feature keyword
  for (const f of filter.features) {
    AND.push({ features: { contains: f } })
  }

  return prisma.listing.findMany({
    where: AND.length > 0 ? { AND } : {},
    orderBy: [{ submarketNorm: "asc" }, { sf: "asc" }],
    take: 60,
  })
}
