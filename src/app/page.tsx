import type { Metadata } from "next"
import Script from "next/script"
import { SearchBox } from "./SearchBox"

const CHIPS = [
  "Tech startup in Hudson Yards",
  "25 people in Midtown",
  "10,000 SF in FiDi",
  "Sublease near Penn Station",
  "Creative space in SoHo",
  "Column-free floor in Tribeca",
]

export const metadata: Metadata = {
  title: "Beyond the Space — NYC office search",
  description:
    "Describe the office you need — square footage, submarket, vibe. Beyond the Space aggregates NYC commercial listings with AI-assisted search.",
  alternates: { canonical: "/" },
}

export default function Home() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Beyond the Space",
    url: "https://beyondthespace.example",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://beyondthespace.example/search?q={query}",
      },
      "query-input": "required name=query",
    },
  }

  return (
    <>
      <Script id="ld-json" type="application/ld+json" strategy="beforeInteractive">
        {JSON.stringify(jsonLd)}
      </Script>

      <section className="mx-auto max-w-5xl px-6 py-20 md:py-32">
        <div className="max-w-2xl">
        {/* Eyebrow */}
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--color-edge)] bg-[var(--color-surface-raised)] px-3 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
          <span className="text-xs font-medium text-[var(--color-ink-dim)]">AI-powered · 25+ NYC listings</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[var(--color-ink)] mb-4 leading-[1.1]">
          Describe the office<br className="hidden md:block" /> you need.
        </h1>
        <p className="text-[var(--color-ink-muted)] text-lg mb-10 leading-relaxed">
          Square footage, submarket, sublease, vibe — plain English. We&rsquo;ll find matching NYC offices across every major broker.
        </p>

        <SearchBox chips={CHIPS} autoFocus />

        <p className="mt-8 text-xs text-[var(--color-ink-faint)]">
          Press <kbd className="rounded border border-[var(--color-edge)] bg-[var(--color-surface-raised)] px-1.5 py-0.5 font-mono text-[11px]">Enter</kbd> to search · <kbd className="rounded border border-[var(--color-edge)] bg-[var(--color-surface-raised)] px-1.5 py-0.5 font-mono text-[11px]">Shift+Enter</kbd> for new line
        </p>
        </div>
      </section>
    </>
  )
}
