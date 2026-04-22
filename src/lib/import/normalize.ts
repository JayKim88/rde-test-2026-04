export function parseDate(raw: string): Date | null {
  if (!raw || !raw.trim()) return null
  const s = raw.trim()
  // ISO YYYY-MM-DD
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (iso) {
    const d = new Date(Date.UTC(+iso[1], +iso[2] - 1, +iso[3]))
    return isNaN(d.getTime()) ? null : d
  }
  // US MM/DD/YYYY
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s)
  if (us) {
    const d = new Date(Date.UTC(+us[3], +us[1] - 1, +us[2]))
    return isNaN(d.getTime()) ? null : d
  }
  return null
}

export function parseFloatSafe(raw: string): number | null {
  if (raw === undefined || raw === null) return null
  const s = String(raw).trim()
  if (s === "" || s.toUpperCase() === "NULL") return null
  const n = Number(s)
  return isNaN(n) ? null : n
}

export function parseIntSafe(raw: string): number | null {
  const n = parseFloatSafe(raw)
  if (n === null) return null
  return Math.trunc(n)
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(raw: string): boolean {
  if (!raw || !raw.trim()) return false
  return EMAIL_RE.test(raw.trim())
}

// Canonical hash for property names.
// "1234 Elm St" / "1234 Elm Street" / "1234 Elm St." all collapse to the same key.
// We normalize common street-type abbreviations, lowercase, and strip punctuation.
export function propertyNameHash(raw: string): string {
  let s = (raw ?? "").toLowerCase().trim()
  s = s.replace(/[.,']/g, "")
  s = s.replace(/\s+/g, " ")
  // Collapse street-type variants
  const subs: Array<[RegExp, string]> = [
    [/\bstreet\b/g, "st"],
    [/\bavenue\b/g, "ave"],
    [/\bboulevard\b/g, "blvd"],
    [/\broad\b/g, "rd"],
    [/\bdrive\b/g, "dr"],
    [/\blane\b/g, "ln"],
    [/\bcourt\b/g, "ct"],
    [/\bplace\b/g, "pl"],
  ]
  for (const [re, to] of subs) s = s.replace(re, to)
  return s
}

// Canonical display name — pick the longest variant as human-friendly.
export function pickDisplayName(variants: Iterable<string>): string {
  let best = ""
  for (const v of variants) {
    if (v.length > best.length) best = v
  }
  return best.trim()
}
