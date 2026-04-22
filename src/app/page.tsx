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
  // SEO JSON-LD: WebSite + SearchAction. Enables Google to render a sitelinks searchbox.
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

      <section className="mx-auto max-w-3xl px-6 py-20 md:py-28">
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-gray-900 mb-4">
          Describe the office you need.
        </h1>
        <p className="text-lg text-gray-600 mb-10">
          Square footage, submarket, sublease, vibe — tell us in plain English. We&rsquo;ll
          find matching NYC offices from every major broker, with AI that actually
          understands what you mean.
        </p>

        <SearchBox chips={CHIPS} autoFocus />

        <p className="mt-6 text-sm text-gray-500">
          Try: {CHIPS.slice(0, 2).map((c, i) => (
            <span key={c}>
              <span className="italic">&ldquo;{c}&rdquo;</span>
              {i === 0 ? ", " : ""}
            </span>
          ))}
        </p>
      </section>
    </>
  )
}
