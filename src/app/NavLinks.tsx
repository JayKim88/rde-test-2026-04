"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const links = [
  { href: "/search", label: "Search" },
  { href: "/import", label: "Import" },
  { href: "/tenants", label: "Tenants" },
  { href: "/leases", label: "Leases" },
  { href: "/dashboard", label: "Dashboard" },
]

export function NavLinks() {
  const pathname = usePathname()
  return (
    <nav className="flex items-center gap-1">
      {links.map(({ href, label }) => {
        const active = pathname === href || (href !== "/" && pathname.startsWith(href))
        return (
          <Link
            key={href}
            href={href}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              active
                ? "bg-[var(--color-accent-muted)] text-[var(--color-accent-bold)]"
                : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-overlay)]"
            }`}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
