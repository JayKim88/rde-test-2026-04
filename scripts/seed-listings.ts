/**
 * Seed listings from data/listings.json into the DB.
 * Run once at project setup: `npx tsx --env-file=.env scripts/seed-listings.ts`
 * Idempotent: uses slug as upsert key.
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import { PrismaClient } from "../src/generated/prisma/client"

const url = process.env.DATABASE_URL!.replace(/^file:/, "")
const adapter = new PrismaBetterSqlite3({ url })
const prisma = new PrismaClient({ adapter })

type RawListing = {
  id: string
  slug: string
  address: string
  unit: string
  submarket: string
  sf: number
  pricePerSf: number
  availability: string
  type: string
  condition: string
  buildingClass: string
  yearBuilt: number
  features: string[]
  description: string
  heroImage: string
  photos: string[]
  floorplan: string
}

// Normalize submarket: lowercase, strip common suffixes like " area"
function normalizeSubmarket(s: string): string {
  return s.toLowerCase().replace(/\s+area\s*$/i, "").trim()
}

/**
 * Generate a canonical slug: {building-slug}-ste-{unit}-{hash}
 * where hash is a 6-char hex derived from listing id for uniqueness.
 * Used when the source JSON does not provide a pre-computed slug.
 */
function generateSlug(address: string, unit: string, id: string): string {
  const buildingSlug = address
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
  const unitSlug = unit
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
  // Deterministic 6-char hash from listing id
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  const hashHex = hash.toString(16).padStart(6, "0").slice(0, 6)
  return `${buildingSlug}-ste-${unitSlug}-${hashHex}`
}

async function main() {
  const path = join(process.cwd(), "data/listings.json")
  const raw: RawListing[] = JSON.parse(readFileSync(path, "utf8"))

  console.log(`Seeding ${raw.length} listings...`)
  let created = 0
  let updated = 0

  for (const l of raw) {
    const slug = l.slug || generateSlug(l.address, l.unit, l.id)
    const result = await prisma.listing.upsert({
      where: { slug },
      create: {
        id: l.id,
        slug,
        address: l.address,
        unit: l.unit,
        submarket: l.submarket,
        submarketNorm: normalizeSubmarket(l.submarket),
        sf: l.sf,
        pricePerSf: l.pricePerSf,
        availability: l.availability,
        type: l.type,
        condition: l.condition,
        buildingClass: l.buildingClass,
        yearBuilt: l.yearBuilt,
        features: JSON.stringify(l.features),
        description: l.description,
        heroImage: l.heroImage,
        photos: JSON.stringify(l.photos),
        floorplan: l.floorplan,
      },
      update: {
        address: l.address,
        unit: l.unit,
        submarket: l.submarket,
        submarketNorm: normalizeSubmarket(l.submarket),
        sf: l.sf,
        pricePerSf: l.pricePerSf,
        availability: l.availability,
        type: l.type,
        condition: l.condition,
        buildingClass: l.buildingClass,
        yearBuilt: l.yearBuilt,
        features: JSON.stringify(l.features),
        description: l.description,
        heroImage: l.heroImage,
        photos: JSON.stringify(l.photos),
        floorplan: l.floorplan,
      },
    })
    if (result.createdAt.getTime() === result.createdAt.getTime()) {
      created++
    } else {
      updated++
    }
  }

  // Verify distinct submarkets (catches "Grand Central" vs "Grand Central Area" normalization)
  const submarkets = await prisma.listing.groupBy({
    by: ["submarketNorm"],
    _count: true,
  })
  console.log("\nNormalized submarkets:")
  submarkets.forEach((s) => console.log(`  ${s.submarketNorm}: ${s._count}`))

  console.log(`\n✓ Seeded ${raw.length} listings (${created + updated} affected).`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
