import { config } from 'dotenv'
config({ path: '.env.local' })

import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
import * as schema from '../lib/db/schema'

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql, { schema })

async function main() {
  const [project] = await db.select().from(schema.projects)
    .where(eq(schema.projects.contractNumber, 'N62742-24-C-4471'))

  if (!project) { console.log('Project not found'); return }

  const deleted = await db.delete(schema.submittals)
    .where(eq(schema.submittals.projectId, project.id))
    .returning({ id: schema.submittals.id })

  console.log(`✓ Deleted ${deleted.length} submittal records — they will regenerate on next page load`)
}

main().catch(console.error).finally(() => process.exit(0))
