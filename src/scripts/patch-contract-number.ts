import { config } from 'dotenv'
config({ path: '.env.local' })

import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
import * as schema from '../lib/db/schema'

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql, { schema })

async function main() {
  const [updated] = await db.update(schema.projects)
    .set({
      contractNumber: 'N32078-26-C-1953',
      location: 'Neverland Harbor, HI',
    })
    .where(eq(schema.projects.contractNumber, 'N62742-24-C-4471'))
    .returning({ id: schema.projects.id, contractNumber: schema.projects.contractNumber })

  if (!updated) {
    console.log('No project found with the old contract number — may already be updated.')
    return
  }

  console.log(`✓ Updated project ${updated.id}`)
  console.log(`  Contract number → ${updated.contractNumber}`)
  console.log(`  Location → Neverland Harbor, HI`)
}

main().catch(console.error).finally(() => process.exit(0))
