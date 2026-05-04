import { config } from 'dotenv'
config({ path: '.env.local' })

import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq, like } from 'drizzle-orm'
import * as schema from '../lib/db/schema'

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql, { schema })

async function main() {
  const sections = await db.select().from(schema.specSections)
    .where(like(schema.specSections.sectionNumber, '01 45%'))

  for (const s of sections) {
    console.log(`\n${s.sectionNumber} — ${s.sectionTitle}`)
    const reqs = await db.select().from(schema.specRequirements)
      .where(eq(schema.specRequirements.specSectionId, s.id))
    if (reqs.length === 0) {
      console.log('  (no requirements)')
    } else {
      for (const r of reqs) {
        console.log(`  [${r.requirementType}] ${r.submittalTitle ?? r.description.substring(0, 60)}`)
        console.log(`    gcDesignation: ${r.gcDesignation} | holdPoint: ${r.isHoldPoint}`)
      }
    }
  }
}

main().catch(console.error).finally(() => process.exit(0))
