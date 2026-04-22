import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { ScrubbableHero } from "./ScrubbableHero"
import { ContactModal } from "./ContactModal"

type Props = { params: Promise<{ slug: string }> }

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const listing = await prisma.listing.findUnique({ where: { slug } })
  if (!listing) return { title: "Listing not found" }
  const title = `${listing.sf.toLocaleString()} SF at ${listing.address} ${listing.unit} — ${listing.submarket}`
  return {
    title,
    description: listing.description.slice(0, 160),
    openGraph: {
      title,
      description: listing.description.slice(0, 160),
      type: "website",
      url: `https://beyondthespace.example/listings/${listing.slug}`,
      images: [{ url: listing.heroImage.startsWith("/") ? `https://beyondthespace.example${listing.heroImage}` : listing.heroImage, width: 1200, height: 630 }],
    },
  }
}

export default async function ListingDetail({ params }: Props) {
  const { slug } = await params
  const listing = await prisma.listing.findUnique({ where: { slug } })
  if (!listing) notFound()

  const features: string[] = JSON.parse(listing.features)
  const photos: string[] = JSON.parse(listing.photos)
  const media: { src: string; kind: "photo" | "floorplan" }[] = [
    { src: listing.heroImage, kind: "photo" },
    ...photos.map((p) => ({ src: p, kind: "photo" as const })),
    { src: listing.floorplan, kind: "floorplan" as const },
  ]

  return (
    <article className="mx-auto max-w-5xl px-6 py-8">
      <Link
        href="/search"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to search
      </Link>

      <div className="mb-4 text-sm text-gray-500 uppercase tracking-wide">
        {listing.submarket} · {listing.type}
      </div>
      <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-1">{listing.address}</h1>
      <p className="text-lg text-gray-600 mb-6">{listing.unit}</p>

      <ScrubbableHero media={media} />

      <div className="grid md:grid-cols-3 gap-8 mt-10">
        <div className="md:col-span-2 space-y-8">
          <Section title="Space & Building">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Dt>Size</Dt><Dd>{listing.sf.toLocaleString()} SF</Dd>
              <Dt>Price</Dt><Dd>${listing.pricePerSf}/SF</Dd>
              <Dt>Condition</Dt><Dd className="capitalize">{listing.condition.replace("-", " ")}</Dd>
              <Dt>Availability</Dt><Dd className="capitalize">{listing.availability.replace("-", " ")}</Dd>
              <Dt>Building class</Dt><Dd>{listing.buildingClass}</Dd>
              <Dt>Year built</Dt><Dd>{listing.yearBuilt}</Dd>
            </dl>
            <p className="mt-6 text-gray-700 leading-relaxed">{listing.description}</p>
            {features.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {features.map((f) => (
                  <span key={f} className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">{f}</span>
                ))}
              </div>
            )}
          </Section>

          <Section title="Floor Plan &amp; Space Layout">
            <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={listing.floorplan}
                alt={`Floor plan — ${listing.address} ${listing.unit}`}
                className="w-full object-contain max-h-[480px]"
              />
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Approximate layout. Dimensions subject to survey.
            </p>
          </Section>

          <Section title="Transit & Commute">
            <p className="text-gray-700">6 min walk to nearest subway · 10 min to Penn Station · 20 min to Grand Central</p>
            <p className="text-sm text-gray-500 mt-2">* Demo data; real routing integration pending.</p>
          </Section>
        </div>

        <aside className="md:col-span-1">
          <div className="sticky top-4 rounded-2xl border border-gray-200 bg-white p-6">
            <div className="mb-2 text-sm text-gray-500">Asking</div>
            <div className="text-2xl font-semibold mb-1">${listing.pricePerSf}/SF</div>
            <div className="text-sm text-gray-500 mb-6">
              ≈ ${Math.round(listing.sf * listing.pricePerSf / 12).toLocaleString()}/mo total
            </div>
            <ContactModal address={listing.address} unit={listing.unit} />
            <button className="w-full rounded-xl border border-gray-300 py-2.5 text-gray-700 hover:bg-gray-50">
              Save to favorites
            </button>
          </div>
        </aside>
      </div>
    </article>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-semibold mb-4">{title}</h2>
      <div>{children}</div>
    </section>
  )
}
function Dt({ children }: { children: React.ReactNode }) { return <dt className="text-gray-500">{children}</dt> }
function Dd({ children, className }: { children: React.ReactNode; className?: string }) { return <dd className={`font-medium text-gray-900 ${className ?? ""}`}>{children}</dd> }
