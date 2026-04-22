import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { findListings, parseSearchQuery, SearchFilterSchema } from "@/lib/search"
import { SearchBox } from "../SearchBox"
import { ResultsSkeleton } from "./ResultsSkeleton"

export const dynamic = "force-dynamic"
export const maxDuration = 30

type Props = { searchParams: Promise<{ q?: string }> }

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams
  const q = (params.q ?? "").trim()
  if (!q) return { title: "Search", description: "Find NYC office space." }
  const truncated = q.length > 60 ? q.slice(0, 60) + "…" : q
  return {
    title: truncated,
    description: `NYC office listings matching: ${q}`,
    openGraph: {
      title: `${truncated} — Beyond the Space`,
      description: `NYC office listings matching: ${q}`,
      type: "website",
    },
  }
}

const CHIPS = [
  "Tech startup in Hudson Yards",
  "25 people in Midtown",
  "10,000 SF in FiDi",
  "Sublease near Penn Station",
]

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams
  const query = (params.q ?? "").trim()

  return (
    <section className="mx-auto max-w-5xl px-6 py-10">
      {!query ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="mb-4 text-4xl">🔍</div>
          <p className="text-lg font-semibold text-[var(--color-ink)] mb-2">What are you looking for?</p>
          <p className="text-sm text-[var(--color-ink-muted)] mb-8">Describe your ideal NYC office space below.</p>
          <div className="w-full max-w-xl">
            <SearchBox chips={CHIPS} autoFocus />
          </div>
        </div>
      ) : (
        <Suspense key={query} fallback={<ResultsSkeleton />}>
          <SearchResults query={query} />
        </Suspense>
      )}

      {query && (
        <div className="mt-14 border-t border-[var(--color-edge)] pt-8">
          <p className="text-xs font-medium text-[var(--color-ink-muted)] uppercase tracking-wide mb-3">
            Refine your search
          </p>
          <SearchBox chips={CHIPS} defaultValue={query} />
        </div>
      )}
    </section>
  )
}

async function SearchResults({ query }: { query: string }) {
  let aiResponse = ""
  let listings: Awaited<ReturnType<typeof findListings>> = []
  let degraded = false

  try {
    const parsed = await parseSearchQuery(query)
    aiResponse = parsed.response
    listings = await findListings(parsed.filter)

    const hadFilter = parsed.filter.submarket || parsed.filter.sfMin || parsed.filter.sfMax
    if (listings.length === 0 && hadFilter) {
      listings = await findListings(
        SearchFilterSchema.parse({ submarket: null, sfMin: null, sfMax: null, features: [], subleaseOrDirect: "any" })
      )
      aiResponse = `${aiResponse} I didn't find exact matches — here are all available listings so you can refine from here.`
      degraded = true
    }
  } catch (err) {
    console.error("[search] parse failed", err)
    listings = await findListings(
      SearchFilterSchema.parse({ submarket: null, sfMin: null, sfMax: null, features: [], subleaseOrDirect: "any" })
    )
    aiResponse = 'I couldn\'t understand that precisely — showing all listings. Try something like "10,000 SF in Hudson Yards" or "sublease near Penn Station."'
    degraded = true
  }

  return (
    <>
      {/* AI bubble */}
      <div className="mb-6 rounded-2xl border border-[var(--color-edge)] bg-[var(--color-surface-raised)] p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0 h-8 w-8 rounded-full bg-[var(--color-accent)] text-white text-xs font-bold grid place-items-center">
            AI
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[var(--color-ink)] text-sm leading-relaxed">{aiResponse}</p>
            <p className="mt-1.5 text-xs text-[var(--color-ink-faint)]">
              Query: <span className="italic">&ldquo;{query}&rdquo;</span>
            </p>
          </div>
        </div>
      </div>

      {/* Result count */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm font-medium text-[var(--color-ink-muted)]">
          {listings.length} {listings.length === 1 ? "listing" : "listings"}
          {degraded && <span className="ml-1.5 text-xs text-[var(--color-warning)]">(showing all)</span>}
        </p>
      </div>

      {listings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--color-edge)] p-16 text-center text-[var(--color-ink-muted)]">
          No listings found. Try a different query.
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}
    </>
  )
}

function ListingCard({ listing }: {
  listing: { id: string; slug: string; address: string; unit: string; submarket: string; sf: number; pricePerSf: number; type: string; heroImage: string; features: string }
}) {
  const features: string[] = JSON.parse(listing.features)
  const isSublease = listing.type === "sublease"

  return (
    <Link
      href={`/listings/${listing.slug}`}
      className="group block overflow-hidden rounded-2xl border border-[var(--color-edge)] bg-[var(--color-surface-raised)] transition-all hover:shadow-md hover:border-[var(--color-edge-strong)]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={listing.heroImage}
        alt={`${listing.address} ${listing.unit}`}
        loading="lazy"
        className="w-full aspect-[4/3] object-cover bg-[var(--color-surface-overlay)]"
      />
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-medium text-[var(--color-ink-muted)] uppercase tracking-wide">
            {listing.submarket}
          </span>
          <span className="text-[var(--color-edge-strong)]">·</span>
          <span className={`text-[11px] font-semibold uppercase tracking-wide ${isSublease ? "text-amber-600" : "text-[var(--color-accent)]"}`}>
            {listing.type}
          </span>
        </div>
        <h3 className="font-semibold text-[var(--color-ink)] text-sm mb-0.5 truncate">{listing.address}</h3>
        <p className="text-xs text-[var(--color-ink-muted)] mb-3">{listing.unit}</p>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-[var(--color-ink)]">{listing.sf.toLocaleString()} SF</span>
          <span className="text-sm text-[var(--color-ink-muted)]">${listing.pricePerSf}<span className="text-xs">/SF</span></span>
        </div>
        {features.slice(0, 2).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {features.slice(0, 2).map((f) => (
              <span key={f} className="rounded-full bg-[var(--color-surface)] border border-[var(--color-edge)] px-2.5 py-0.5 text-[11px] text-[var(--color-ink-dim)]">
                {f}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}
