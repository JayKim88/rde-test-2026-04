"use server"

import { runNLQuery, type NLResult } from "@/lib/nl-query"

export async function nlQueryAction(query: string): Promise<NLResult> {
  const q = (query ?? "").toString().trim()
  if (!q) {
    return {
      intent: "unsupported",
      explanation: "Type a question to get started.",
      columns: [],
      rows: [],
    }
  }
  if (q.length > 500) {
    return {
      intent: "unsupported",
      explanation: "Question is too long — keep it under 500 characters.",
      columns: [],
      rows: [],
    }
  }
  try {
    return await runNLQuery(q)
  } catch (err) {
    console.error("[nl-query] failed", err)
    return {
      intent: "unsupported",
      explanation:
        "I couldn't interpret that. Try: \"tenants past due over $5,000\" · \"vendors we paid over $10k this year\" · \"leases expiring in 6 months\" · \"expense breakdown\".",
      columns: [],
      rows: [],
    }
  }
}
