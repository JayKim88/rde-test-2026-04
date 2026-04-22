import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { findListings, parseSearchQuery, SearchFilterSchema } from "@/lib/search"
import { SearchBox } from "../SearchBox"
import { ResultsSkeleton } from "./ResultsSkeleton"

export const dynamic = "force-dynamic"

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
    <section>
      <div className="mx-auto max-w-5xl px-6 py-10">
        {!query ? (
          <div className="rounded-2xl border border-dashed p-12 text-center text-gray-500">
            <p className="text-lg">What are you looking for?</p>
            <p className="text-sm mt-1">Go back and describe your space.</p>
          </div>
        ) : (
          <Suspense key={query} fallback={<ResultsSkeleton />}>
            <SearchResults query={query} />
          </Suspense>
        )}

        {/* Refine search — bottom, chat-style */}
        <div className="mt-12 border-t border-gray-200 pt-8">
          <p className="text-sm text-gray-500 mb-3">Refine your search…</p>
          <SearchBox chips={CHIPS} defaultValue="" />
        </div>
      </div>
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

    // Degraded: filter specified but matched zero → show all with explanation.
    const hadFilter =
      parsed.filter.submarket || parsed.filter.sfMin || parsed.filter.sfMax
    if (listings.length === 0 && hadFilter) {
      listings = await findListings(
        SearchFilterSchema.parse({
          submarket: null,
          sfMin: null,
          sfMax: null,
          features: [],
          subleaseOrDirect: "any",
        })
      )
      aiResponse = `${aiResponse} I didn't find exact matches — here are all available listings so you can refine from here.`
      degraded = true
    }
  } catch (err) {
    console.error("[search] parse failed", err)
    listings = await findListings(
      SearchFilterSchema.parse({
        submarket: null,
        sfMin: null,
        sfMax: null,
        features: [],
        subleaseOrDirect: "any",
      })
    )
    aiResponse =
      'I couldn\'t understand that precisely — showing all listings. Try something like "10,000 SF in Hudson Yards" or "sublease near Penn Station."'
    degraded = true
  }

  return (
    <>
      {/* AI bubble */}
      <div className="rounded-2xl bg-gray-50 border border-gray-200 p-5 mb-6">
        <div className="flex items-start gap-3">
          <div className="mt-1 h-8 w-8 rounded-full bg-gray-900 text-white text-xs font-semibold grid place-items-center shrink-0">
            AI
          </div>
          <div className="flex-1">
            <p className="text-gray-900 leading-relaxed">{aiResponse}</p>
            <p className="mt-2 text-sm text-gray-500">
              Your query: <span className="italic">&ldquo;{query}&rdquo;</span>
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-baseline justify-between mb-4">
        <p className="text-sm text-gray-600">
          {listings.length} {listings.length === 1 ? "listing" : "listings"}
          {degraded ? " (showing all)" : ""}
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {listings.map((l) => (
          <ListingCard key={l.id} listing={l} />
        ))}
      </div>
    </>
  )
}

function ListingCard({ listing }: { listing: { id: string; slug: string; address: string; unit: string; submarket: string; sf: number; pricePerSf: number; type: string; heroImage: string; features: string } }) {
  const features: string[] = JSON.parse(listing.features)
  return (
    <Link
      href={`/listings/${listing.slug}`}
      className="group block overflow-hidden rounded-2xl border border-gray-200 bg-white transition hover:shadow-lg"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={listing.heroImage}
        alt={`${listing.address} ${listing.unit}`}
        className="w-full aspect-[4/3] object-cover bg-gray-100"
      />
      <div className="p-4">
        <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wide mb-1">
          <span>{listing.submarket}</span>
          <span>·</span>
          <span className={listing.type === "sublease" ? "text-amber-700" : ""}>{listing.type}</span>
        </div>
        <h3 className="font-semibold text-gray-900 mb-1">{listing.address}</h3>
        <p className="text-sm text-gray-600 mb-3">{listing.unit}</p>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-900 font-medium">{listing.sf.toLocaleString()} SF</span>
          <span className="text-gray-600">${listing.pricePerSf}/SF</span>
        </div>
        {features.slice(0, 2).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {features.slice(0, 2).map((f) => (
              <span key={f} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{f}</span>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}
