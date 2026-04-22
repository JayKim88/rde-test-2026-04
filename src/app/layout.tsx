import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import Link from "next/link"
import { NavLinks } from "./NavLinks"
import "./globals.css"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

export const metadata: Metadata = {
  title: {
    default: "Beyond the Space — NYC office search",
    template: "%s · Beyond the Space",
  },
  description:
    "Describe the office you need — Beyond the Space finds it. NYC commercial real estate, AI-powered search.",
  openGraph: {
    title: "Beyond the Space — NYC office search",
    description: "Describe the office you need. We'll find it.",
    type: "website",
    url: "https://beyondthespace.example",
    images: [{ url: "https://beyondthespace.example/og-default.png", width: 1200, height: 630 }],
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white text-gray-900">
        <header className="border-b border-gray-200">
          <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
            <Link href="/" className="font-semibold tracking-tight">
              Beyond the Space
            </Link>
            <NavLinks />
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-gray-200 py-6 text-center text-sm text-gray-500">
          © RDE Advisors · Prototype
        </footer>
      </body>
    </html>
  )
}
