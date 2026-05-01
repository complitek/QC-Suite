import { config } from 'dotenv'
config({ path: '.env.local' })

import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
import * as schema from '../lib/db/schema'

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql, { schema })

async function seed() {
  console.log('Seeding Neverland project...\n')

  // 1. Get or create 3G2B LLC
  let [company] = await db.select().from(schema.companies)
    .where(eq(schema.companies.name, '3G2B LLC'))

  if (!company) {
    ;[company] = await db.insert(schema.companies).values({
      name: '3G2B LLC',
      sba8a: true,
      email: 'pvaldez@3g2bllc.com',
    }).returning()
    console.log('✓ Created company: 3G2B LLC')
  } else {
    console.log('✓ Company exists: 3G2B LLC')
  }

  // 2. Link admin user to company if not already linked
  const [adminUser] = await db.select().from(schema.users)
    .where(eq(schema.users.email, 'pvaldez@3g2bllc.com'))

  if (adminUser && !adminUser.companyId) {
    await db.update(schema.users)
      .set({ companyId: company.id })
      .where(eq(schema.users.email, 'pvaldez@3g2bllc.com'))
    console.log('✓ Linked admin user to 3G2B LLC')
  } else {
    console.log('✓ Admin user already linked')
  }

  // 3. Skip if already seeded
  const existing = await db.select().from(schema.projects)
    .where(eq(schema.projects.contractNumber, 'N62742-24-C-4471'))

  if (existing.length > 0) {
    console.log('\nNeverland project already seeded. Done.')
    return
  }

  // 4. Create the project
  const [project] = await db.insert(schema.projects).values({
    companyId: company.id,
    contractNumber: 'N62742-24-C-4471',
    projectName: 'Naval Station Neverland New Dry Dock 1 Construction',
    projectIdShort: 'NSN-DD1',
    agency: 'NAVFAC',
    contractType: 'HYBRID',
    isHybrid: true,
    primeContractor: 'Lost Boys Construction',
    location: 'Pearl Harbor, HI',
    state: 'HI',
    awardDate: '2024-03-15',
    completionDate: '2028-09-30',
    contractValue: 485000000,
    complexityTier: 'TIER3',
    status: 'ACTIVE',
    description: 'Construction of a new dry dock facility at Naval Station Neverland. Hybrid contract: Part A (Design-Bid-Build) and Part B (Design-Build).',
    createdBy: adminUser?.id,
  }).returning()

  console.log(`✓ Created project: ${project.projectName}`)

  // 5. Create 3 spec books
  const books: { title: string; partDesignation: 'PART_A' | 'PART_B' | 'BOTH' }[] = [
    { title: 'Part A — DBB Technical Specifications', partDesignation: 'PART_A' },
    { title: 'Part B — DB Technical Specifications', partDesignation: 'PART_B' },
    { title: 'General Project Requirements', partDesignation: 'BOTH' },
  ]

  for (const book of books) {
    await db.insert(schema.specBooks).values({
      projectId: project.id,
      title: book.title,
      partDesignation: book.partDesignation,
      parseStatus: 'pending',
      createdBy: adminUser?.id,
    })
    console.log(`✓ Created spec book: ${book.title}`)
  }

  console.log('\nSeed complete!')
  console.log(`Project ID: ${project.id}`)
}

seed().catch(console.error).finally(() => process.exit(0))
