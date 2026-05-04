import { config } from 'dotenv'
config({ path: '.env.local' })

import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq, and, like } from 'drizzle-orm'
import * as schema from '../lib/db/schema'

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql, { schema })

async function main() {
  // Fix all PLAN-type requirements that have null gcDesignation — QC Plans require Gov approval
  const planReqs = await db.select().from(schema.specRequirements)
    .where(and(
      eq(schema.specRequirements.requirementType, 'PLAN'),
      eq(schema.specRequirements.isHoldPoint, true)
    ))

  let fixed = 0
  for (const req of planReqs) {
    if (!req.gcDesignation) {
      await db.update(schema.specRequirements)
        .set({ gcDesignation: 'G' })
        .where(eq(schema.specRequirements.id, req.id))
      console.log(`Fixed: ${req.submittalTitle ?? req.description.substring(0, 60)}`)
      fixed++
    }
  }

  console.log(`\n✓ Fixed ${fixed} plan requirements — gcDesignation set to G`)
}

main().catch(console.error).finally(() => process.exit(0))
