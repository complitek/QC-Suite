import { config } from 'dotenv'
config({ path: '.env.local' })

import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq, like } from 'drizzle-orm'
import * as schema from '../lib/db/schema'

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql, { schema })

async function main() {
  // Find the NAS section
  const [section] = await db.select().from(schema.specSections)
    .where(like(schema.specSections.sectionNumber, '01 32 17%'))

  if (!section) { console.log('NAS section not found'); return }

  console.log(`Found: ${section.sectionNumber} — ${section.sectionTitle}`)

  // Check if already patched
  const existing = await db.select().from(schema.specRequirements)
    .where(eq(schema.specRequirements.specSectionId, section.id))

  if (existing.length > 0) {
    console.log('Already has requirements — skipping')
    return
  }

  const requirements: typeof schema.specRequirements.$inferInsert[] = [
    {
      projectId: section.projectId,
      specSectionId: section.id,
      specBookId: section.specBookId,
      requirementType: 'SUBMITTAL',
      partDesignation: section.partDesignation,
      sdCode: 'SD-01',
      submittalTitle: 'Initial Cost-Loaded Network Analysis Schedule (NAS)',
      gcDesignation: 'G',
      description: 'Contractor shall submit the initial cost-loaded NAS within 30 days of NTP. The schedule must reflect all activities, durations, logic ties, and cost loading by labor and material. Government approval is required before construction activities may begin.',
      isHoldPoint: true,
      isWitnessPoint: false,
      deadlineDays: 30,
      aiGenerated: false,
    },
    {
      projectId: section.projectId,
      specSectionId: section.id,
      specBookId: section.specBookId,
      requirementType: 'SUBMITTAL',
      partDesignation: section.partDesignation,
      sdCode: 'SD-01',
      submittalTitle: 'Monthly Schedule Update',
      gcDesignation: 'C',
      description: 'Contractor shall submit a monthly schedule update no later than the 10th of each month reflecting actual progress, revised logic where applicable, and a 3-week look-ahead.',
      isHoldPoint: false,
      isWitnessPoint: false,
      deadlineDays: null,
      aiGenerated: false,
    },
    {
      projectId: section.projectId,
      specSectionId: section.id,
      specBookId: section.specBookId,
      requirementType: 'REPORT',
      partDesignation: section.partDesignation,
      sdCode: 'SD-06',
      submittalTitle: 'Schedule Narrative Report',
      gcDesignation: 'C',
      description: 'Monthly narrative explaining schedule variances, float consumption, critical path status, and corrective actions for activities behind schedule.',
      isHoldPoint: false,
      isWitnessPoint: false,
      deadlineDays: null,
      aiGenerated: false,
    },
    {
      projectId: section.projectId,
      specSectionId: section.id,
      specBookId: section.specBookId,
      requirementType: 'SUBMITTAL',
      partDesignation: section.partDesignation,
      sdCode: 'SD-01',
      submittalTitle: 'Recovery Schedule',
      gcDesignation: 'G',
      description: 'When the schedule shows 14 or more calendar days of negative float on any path to contract completion, Contractor shall submit a Recovery Schedule for Government approval within 14 days of the deficiency being identified.',
      isHoldPoint: false,
      isWitnessPoint: false,
      deadlineDays: null,
      aiGenerated: false,
    },
    {
      projectId: section.projectId,
      specSectionId: section.id,
      specBookId: section.specBookId,
      requirementType: 'SUBMITTAL',
      partDesignation: section.partDesignation,
      sdCode: 'SD-01',
      submittalTitle: 'Fragnet for Change Orders',
      gcDesignation: 'G',
      description: 'For any change order affecting the contract duration, Contractor shall submit a fragnet (schedule fragment) demonstrating the impact on the critical path and proposed revised completion date.',
      isHoldPoint: false,
      isWitnessPoint: false,
      deadlineDays: null,
      aiGenerated: false,
    },
  ]

  await db.insert(schema.specRequirements).values(requirements)

  // Also update the section's aiSummary since it was a skeleton
  await db.update(schema.specSections)
    .set({
      aiSummary: 'Section 01 32 17.00 20 governs the preparation, submission, and maintenance of the Cost-Loaded Network Analysis Schedule (NAS) for the project. The contractor must submit an initial cost-loaded schedule within 30 days of NTP that requires Government approval before construction begins, and provide monthly updates and narrative reports throughout the project. A Recovery Schedule is required when negative float of 14 or more calendar days develops on any critical path.',
    })
    .where(eq(schema.specSections.id, section.id))

  console.log(`✓ Added ${requirements.length} requirements to NAS section`)
  console.log('✓ Updated section summary')
}

main().catch(console.error).finally(() => process.exit(0))
