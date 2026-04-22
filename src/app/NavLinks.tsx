"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const links = [
  { href: "/search", label: "Search" },
  { href: "/import", label: "PM · Import" },
  { href: "/tenants", label: "PM · Tenants" },
  { href: "/leases", label: "PM · Leases" },
  { href: "/dashboard", label: "PM · Dashboard" },
]

export function NavLinks() {
  const pathname = usePathname()
  return (
    <nav className="flex gap-6 text-sm">
      {links.map(({ href, label }) => {
        const active = pathname === href || (href !== "/" && pathname.startsWith(href))
        return (
          <Link
            key={href}
            href={href}
            className={
              active
                ? "text-gray-900 font-medium"
                : "text-gray-500 hover:text-gray-900"
            }
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
