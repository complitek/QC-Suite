import { config } from 'dotenv'
config({ path: '.env.local' })

import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
import fs from 'fs'
import path from 'path'
import * as schema from '../lib/db/schema'

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql, { schema })

// ─── Types matching neverland-content.json ────────────────────────────────────

interface GeneratedRequirement {
  type: string
  sdCode?: string
  title: string
  gcDesignation?: string
  description: string
  isHoldPoint?: boolean
  isWitnessPoint?: boolean
  testStandard?: string
  testFrequency?: string
  acceptanceCriteria?: string
  deadlineDays?: number
}

interface GeneratedSection {
  sectionNumber: string
  sectionTitle: string
  partDesignation: 'PART_A' | 'PART_B' | 'BOTH' | 'NA'
  aiSummary: string
  fullTreatment: boolean
  requirements: GeneratedRequirement[]
}

interface OutputBook {
  key: string
  title: string
  partDesignation: 'PART_A' | 'PART_B' | 'BOTH' | 'NA'
  sections: GeneratedSection[]
}

interface NeverlandContent {
  generatedAt: string
  books: OutputBook[]
}

// ─── Seed ─────────────────────────────────────────────────────────────────────

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
  let adminUser: typeof schema.users.$inferSelect | null = null
  const users = await db.select().from(schema.users)
    .where(eq(schema.users.email, 'pvaldez@3g2bllc.com'))

  if (users.length > 0) {
    adminUser = users[0]
    if (!adminUser.companyId) {
      await db.update(schema.users)
        .set({ companyId: company.id })
        .where(eq(schema.users.email, 'pvaldez@3g2bllc.com'))
      console.log('✓ Linked admin user to 3G2B LLC')
    } else {
      console.log('✓ Admin user already linked')
    }
  } else {
    console.log('✓ Admin user not yet created (skipping createdBy fields)')
  }

  // 3. Get or create project
  let project: typeof schema.projects.$inferSelect

  const existing = await db.select().from(schema.projects)
    .where(eq(schema.projects.contractNumber, 'N32078-26-C-1953'))

  if (existing.length > 0) {
    project = existing[0]
    console.log('✓ Project exists: Naval Station Neverland')
  } else {
    ;[project] = await db.insert(schema.projects).values({
      companyId: company.id,
      contractNumber: 'N32078-26-C-1953',
      projectName: 'Naval Station Neverland New Dry Dock 1 Construction',
      projectIdShort: 'NSN-DD1',
      agency: 'NAVFAC',
      contractType: 'HYBRID',
      isHybrid: true,
      primeContractor: 'Lost Boys Construction',
      location: 'Neverland Harbor, HI',
      state: 'HI',
      awardDate: '2024-03-15',
      completionDate: '2028-09-30',
      contractValue: 485000000,
      complexityTier: 'TIER3',
      status: 'ACTIVE',
      description: 'Construction of a new dry dock facility at Naval Station Neverland. Hybrid contract: Part A (Design-Bid-Build) and Part B (Design-Build). Mirror project for Complitek testing.',
      createdBy: adminUser?.id,
    }).returning()
    console.log(`✓ Created project: ${project.projectName}`)
  }

  // 4. Get or create the 3 spec books
  const bookTitles = [
    { title: 'General Project Requirements', part: 'BOTH' as const, key: 'general' },
    { title: 'Part A — DBB Technical Specifications', part: 'PART_A' as const, key: 'part_a' },
    { title: 'Part B — DB Technical Specifications', part: 'PART_B' as const, key: 'part_b' },
  ]

  const specBookMap: Record<string, string> = {}  // key → spec book ID

  for (const bookDef of bookTitles) {
    const existing = await db.select().from(schema.specBooks)
      .where(eq(schema.specBooks.title, bookDef.title))

    if (existing.length > 0) {
      specBookMap[bookDef.key] = existing[0].id
      console.log(`✓ Spec book exists: ${bookDef.title}`)
    } else {
      const [book] = await db.insert(schema.specBooks).values({
        projectId: project.id,
        title: bookDef.title,
        partDesignation: bookDef.part,
        parseStatus: 'complete',
        parsedAt: new Date(),
        createdBy: adminUser?.id,
      }).returning()
      specBookMap[bookDef.key] = book.id
      console.log(`✓ Created spec book: ${bookDef.title}`)
    }
  }

  // 5. Check if spec sections already seeded
  const existingSections = await db.select().from(schema.specSections)
    .where(eq(schema.specSections.projectId, project.id))

  if (existingSections.length > 0) {
    console.log(`\n✓ Spec sections already seeded (${existingSections.length} sections). Done.`)
    return
  }

  // 6. Load neverland-content.json
  const contentPath = path.join(__dirname, 'neverland-content.json')
  if (!fs.existsSync(contentPath)) {
    console.log('\n⚠️  neverland-content.json not found.')
    console.log('   Run: npx tsx src/scripts/generate-neverland-content.ts')
    console.log('   Then re-run this seed.')
    return
  }

  const content: NeverlandContent = JSON.parse(fs.readFileSync(contentPath, 'utf-8'))
  console.log(`\n📄 Loaded content generated at: ${content.generatedAt}`)

  // 7. Insert spec sections and requirements
  let sectionCount = 0
  let requirementCount = 0

  for (const book of content.books) {
    const specBookId = specBookMap[book.key]
    if (!specBookId) {
      console.log(`⚠️  No spec book found for key: ${book.key} — skipping`)
      continue
    }

    console.log(`\n  📖 Seeding: ${book.title} (${book.sections.length} sections)`)

    for (const sec of book.sections) {
      const [inserted] = await db.insert(schema.specSections).values({
        specBookId,
        projectId: project.id,
        sectionNumber: sec.sectionNumber,
        sectionTitle: sec.sectionTitle,
        partDesignation: sec.partDesignation,
        aiSummary: sec.aiSummary,
      }).returning()

      sectionCount++

      // Insert requirements for full-treatment sections
      for (const req of sec.requirements) {
        await db.insert(schema.specRequirements).values({
          projectId: project.id,
          specSectionId: inserted.id,
          specBookId,
          requirementType: req.type as typeof schema.specRequirements.$inferInsert['requirementType'],
          partDesignation: sec.partDesignation,
          sdCode: req.sdCode,
          submittalTitle: req.title,
          gcDesignation: req.gcDesignation,
          description: req.description,
          isHoldPoint: req.isHoldPoint ?? false,
          isWitnessPoint: req.isWitnessPoint ?? false,
          testStandard: req.testStandard,
          testFrequency: req.testFrequency,
          acceptanceCriteria: req.acceptanceCriteria,
          deadlineDays: req.deadlineDays,
          aiGenerated: true,
        })
        requirementCount++
      }
    }
  }

  // 8. Seed pre-work plan stubs
  console.log('\n  📋 Seeding pre-work plan stubs...')

  const preworkPlans = [
    { planType: 'QC_PLAN' as const,         title: 'Quality Control Plan',                       part: 'BOTH' as const },
    { planType: 'APP' as const,              title: 'Accident Prevention Plan',                   part: 'BOTH' as const },
    { planType: 'EP' as const,               title: 'Environmental Protection Plan',              part: 'BOTH' as const },
    { planType: 'SWPPP' as const,            title: 'Storm Water Pollution Prevention Plan',      part: 'BOTH' as const },
    { planType: 'DIRT_DUST' as const,        title: 'Dirt and Dust Control Plan',                 part: 'BOTH' as const },
    { planType: 'WASTE_MANAGEMENT' as const, title: 'Waste Management Plan',                      part: 'BOTH' as const },
    { planType: 'SITE_PLAN' as const,        title: 'Site Plan',                                  part: 'BOTH' as const },
    { planType: 'SIOR' as const,             title: 'Sustainability and Installation Operations Requirements Plan', part: 'BOTH' as const },
  ]

  for (const plan of preworkPlans) {
    await db.insert(schema.preworkPlans).values({
      projectId: project.id,
      planType: plan.planType,
      partDesignation: plan.part,
      title: plan.title,
      revision: 'R0',
      status: 'DRAFT',
      aiGenerated: false,
      createdBy: adminUser?.id,
    })
  }
  console.log(`  ✓ ${preworkPlans.length} pre-work plan stubs created`)

  // 9. Seed AHA plan stubs (first two required activities)
  console.log('\n  🦺 Seeding AHA plan stubs...')

  const ahaPlans = [
    {
      activityName: 'Mobilization',
      sequenceNumber: 1,
      activityDescription: 'Site mobilization including equipment staging, temporary facility setup, security fence installation, and site access establishment.',
      part: 'BOTH' as const,
    },
    {
      activityName: 'Clearing and Grubbing',
      sequenceNumber: 2,
      activityDescription: 'Clearing of vegetation, grubbing of root systems, and initial site grading to prepare for construction operations.',
      part: 'PART_B' as const,
    },
    {
      activityName: 'Landside Demolition',
      sequenceNumber: 3,
      activityDescription: 'Demolition of existing landside structures, removal of above-grade and below-grade elements, and hazardous material abatement.',
      part: 'PART_B' as const,
    },
  ]

  for (const aha of ahaPlans) {
    await db.insert(schema.ahaPlans).values({
      projectId: project.id,
      activityName: aha.activityName,
      sequenceNumber: aha.sequenceNumber,
      partDesignation: aha.part,
      activityDescription: aha.activityDescription,
      revision: 'R0',
      status: 'DRAFT',
      createdBy: adminUser?.id,
    })
  }
  console.log(`  ✓ ${ahaPlans.length} AHA plan stubs created`)

  // 10. Seed early schedule activities
  console.log('\n  📅 Seeding schedule activities...')

  const activities = [
    { id: 'MOB-001',  name: 'Mobilization',                    part: 'BOTH' as const,   start: '2024-06-01', finish: '2024-06-28', dur: 20 },
    { id: 'ENV-001',  name: 'Environmental Controls Setup',     part: 'BOTH' as const,   start: '2024-06-15', finish: '2024-06-28', dur: 10 },
    { id: 'DEMO-001', name: 'Landside Demolition Phase 1',      part: 'PART_B' as const, start: '2024-07-01', finish: '2024-09-30', dur: 65 },
    { id: 'HZMT-001', name: 'Hazmat Abatement',                 part: 'PART_A' as const, start: '2024-07-01', finish: '2024-08-30', dur: 45 },
    { id: 'EXCV-001', name: 'Excavation and Fill — Dry Dock',   part: 'PART_A' as const, start: '2024-10-01', finish: '2025-03-31', dur: 130 },
    { id: 'PILE-001', name: 'Deep Foundation — Concrete Piles', part: 'PART_A' as const, start: '2024-11-01', finish: '2025-04-30', dur: 110 },
    { id: 'DRDG-001', name: 'Dredging Operations',              part: 'PART_A' as const, start: '2025-01-01', finish: '2025-06-30', dur: 130 },
    { id: 'CONC-001', name: 'Mass Concrete — Dry Dock Floor',   part: 'PART_A' as const, start: '2025-07-01', finish: '2026-03-31', dur: 195 },
    { id: 'MRNC-001', name: 'Marine Concrete — Walls',         part: 'PART_A' as const, start: '2026-01-01', finish: '2026-12-31', dur: 260 },
    { id: 'CAIS-001', name: 'Caisson Fabrication',              part: 'PART_A' as const, start: '2025-01-01', finish: '2027-06-30', dur: 650 },
    { id: 'LAND-001', name: 'Landside Improvements',            part: 'PART_B' as const, start: '2026-01-01', finish: '2027-12-31', dur: 520 },
    { id: 'COMM-001', name: 'Commissioning and Testing',        part: 'BOTH' as const,   start: '2028-01-01', finish: '2028-07-31', dur: 150 },
  ]

  for (const act of activities) {
    await db.insert(schema.scheduleActivities).values({
      projectId: project.id,
      activityId: act.id,
      activityName: act.name,
      partDesignation: act.part,
      plannedStart: act.start,
      plannedFinish: act.finish,
      duration: act.dur,
      percentComplete: 0,
      status: 'NOT_STARTED',
    })
  }
  console.log(`  ✓ ${activities.length} schedule activities created`)

  console.log('\n─────────────────────────────────────────────────────')
  console.log('✅ Seed complete')
  console.log(`   Spec sections    : ${sectionCount}`)
  console.log(`   Requirements     : ${requirementCount}`)
  console.log(`   Pre-work plans   : ${preworkPlans.length}`)
  console.log(`   AHA plans        : ${ahaPlans.length}`)
  console.log(`   Schedule items   : ${activities.length}`)
}

seed().catch(console.error).finally(() => process.exit(0))
