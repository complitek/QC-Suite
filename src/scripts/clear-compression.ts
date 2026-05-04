import 'dotenv/config'
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from '../lib/db/schema'
import { eq } from 'drizzle-orm'

async function main() {
  const sql = neon(process.env.DATABASE_URL!)
  const db = drizzle(sql, { schema })
  const [proj] = await db.select().from(schema.projects)
    .where(eq(schema.projects.contractNumber, 'N32078-26-C-1953'))
  if (!proj) { console.log('Project not found'); process.exit(1) }
  const pours = await db.delete(schema.concretePours)
    .where(eq(schema.concretePours.projectId, proj.id))
    .returning()
  console.log(`Deleted ${pours.length} pours (breaks cascade deleted.)`)
}
main().catch(e => { console.error(e); process.exit(1) })
