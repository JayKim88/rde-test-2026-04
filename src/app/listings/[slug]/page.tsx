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
  const monthlyTotal = Math.round(listing.sf * listing.pricePerSf / 12)

  return (
    <article className="mx-auto max-w-5xl px-6 py-8">
      {/* Back */}
      <Link
        href="/search"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] mb-6 transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to search
      </Link>

      {/* Header */}
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">{listing.submarket}</span>
        <span className="text-[var(--color-edge-strong)]">·</span>
        <span className={`text-xs font-semibold uppercase tracking-wider ${listing.type === "sublease" ? "text-amber-600" : "text-[var(--color-accent)]"}`}>
          {listing.type}
        </span>
      </div>
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[var(--color-ink)] mb-1">{listing.address}</h1>
      <p className="text-lg text-[var(--color-ink-muted)] mb-6">{listing.unit}</p>

      <ScrubbableHero media={media} />

      <div className="grid md:grid-cols-3 gap-8 mt-10">
        <div className="md:col-span-2 space-y-8">

          <Section title="Space & Building">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Dt>Size</Dt><Dd>{listing.sf.toLocaleString()} SF</Dd>
              <Dt>Asking rent</Dt><Dd>${listing.pricePerSf}/SF/yr</Dd>
              <Dt>Condition</Dt><Dd className="capitalize">{listing.condition.replace("-", " ")}</Dd>
              <Dt>Availability</Dt><Dd className="capitalize">{listing.availability.replace("-", " ")}</Dd>
              <Dt>Building class</Dt><Dd>{listing.buildingClass}</Dd>
              <Dt>Year built</Dt><Dd>{listing.yearBuilt}</Dd>
            </dl>
            <p className="mt-5 text-sm text-[var(--color-ink-dim)] leading-relaxed">{listing.description}</p>
            {features.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {features.map((f) => (
                  <span key={f} className="rounded-full border border-[var(--color-edge)] bg-[var(--color-surface)] px-3 py-1 text-xs font-medium text-[var(--color-ink-dim)]">
                    {f}
                  </span>
                ))}
              </div>
            )}
          </Section>

          <Section title="Floor Plan & Space Layout">
            <div className="rounded-xl overflow-hidden border border-[var(--color-edge)] bg-[var(--color-surface)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={listing.floorplan}
                alt={`Floor plan — ${listing.address} ${listing.unit}`}
                className="w-full object-contain max-h-[480px]"
              />
            </div>
            <p className="text-xs text-[var(--color-ink-faint)] mt-2">
              Approximate layout. Dimensions subject to survey.
            </p>
          </Section>

          <Section title="Transit & Commute">
            <div className="flex flex-wrap gap-3">
              {["6 min walk to subway", "10 min to Penn Station", "20 min to Grand Central"].map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-lg border border-[var(--color-edge)] bg-[var(--color-surface-raised)] px-3 py-2 text-sm text-[var(--color-ink-dim)]">
                  <span>🚇</span> {item}
                </div>
              ))}
            </div>
            <p className="text-xs text-[var(--color-ink-faint)] mt-3">* Demo data — real routing integration pending.</p>
          </Section>

        </div>

        {/* Sidebar */}
        <aside className="md:col-span-1">
          <div className="sticky top-20 rounded-2xl border border-[var(--color-edge)] bg-[var(--color-surface-raised)] p-6 shadow-sm">
            <div className="mb-1 text-xs font-medium text-[var(--color-ink-muted)] uppercase tracking-wide">Asking</div>
            <div className="text-3xl font-bold text-[var(--color-ink)] mb-0.5">${listing.pricePerSf}<span className="text-base font-medium text-[var(--color-ink-muted)]">/SF/yr</span></div>
            <div className="text-sm text-[var(--color-ink-muted)] mb-6">
              ≈ <span className="font-semibold text-[var(--color-ink)]">${monthlyTotal.toLocaleString()}</span>/mo total
            </div>

            <ContactModal address={listing.address} unit={listing.unit} />

            <button className="w-full rounded-xl border border-[var(--color-edge)] py-2.5 text-sm font-medium text-[var(--color-ink-dim)] hover:bg-[var(--color-surface-overlay)] transition-colors">
              Save to shortlist
            </button>

            <div className="mt-5 pt-5 border-t border-[var(--color-edge)] space-y-2 text-xs text-[var(--color-ink-muted)]">
              <div className="flex justify-between">
                <span>Annual rent</span>
                <span className="font-medium text-[var(--color-ink)]">${(listing.sf * listing.pricePerSf).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Size</span>
                <span className="font-medium text-[var(--color-ink)]">{listing.sf.toLocaleString()} SF</span>
              </div>
              <div className="flex justify-between">
                <span>Type</span>
                <span className="font-medium text-[var(--color-ink)] capitalize">{listing.type}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </article>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-semibold text-[var(--color-ink)] mb-4 pb-2 border-b border-[var(--color-edge)]">{title}</h2>
      <div>{children}</div>
    </section>
  )
}

function Dt({ children }: { children: React.ReactNode }) {
  return <dt className="text-[var(--color-ink-muted)] text-sm">{children}</dt>
}

function Dd({ children, className }: { children: React.ReactNode; className?: string }) {
  return <dd className={`font-medium text-[var(--color-ink)] text-sm ${className ?? ""}`}>{children}</dd>
}
