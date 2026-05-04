import { config } from 'dotenv'
config({ path: '.env.local' })

import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq, and } from 'drizzle-orm'
import * as schema from '../lib/db/schema'

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql, { schema })

async function main() {
  const [project] = await db.select().from(schema.projects)
    .where(eq(schema.projects.contractNumber, 'N62742-24-C-4471'))
  if (!project) { console.log('Project not found'); return }

  // Remove the single combined QC Plan stub
  await db.delete(schema.preworkPlans)
    .where(and(
      eq(schema.preworkPlans.projectId, project.id),
      eq(schema.preworkPlans.planType, 'QC_PLAN'),
    ))

  // Insert two separate plans
  await db.insert(schema.preworkPlans).values([
    {
      projectId: project.id,
      planType: 'QC_PLAN',
      partDesignation: 'PART_A',
      title: 'Quality Control Plan — Part A (DBB)',
      revision: 'R0',
      status: 'DRAFT',
      aiGenerated: false,
    },
    {
      projectId: project.id,
      planType: 'QC_PLAN',
      partDesignation: 'PART_B',
      title: 'Quality Control Plan — Part B (DB)',
      revision: 'R0',
      status: 'DRAFT',
      aiGenerated: false,
    },
  ])

  console.log('✓ Created Part A and Part B QC Plan stubs')
}

main().catch(console.error).finally(() => process.exit(0))
