import { config } from 'dotenv'
config({ path: '.env.local' })

import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '../lib/db/schema'
import bcrypt from 'bcryptjs'

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql, { schema })

async function main() {
  const users = await db.select({
    email: schema.users.email,
    fullName: schema.users.fullName,
    role: schema.users.role,
    active: schema.users.active,
    companyId: schema.users.companyId,
    passwordHash: schema.users.passwordHash,
  }).from(schema.users)

  console.log(`Found ${users.length} user(s):\n`)

  for (const u of users) {
    console.log(`Email     : ${u.email}`)
    console.log(`Name      : ${u.fullName}`)
    console.log(`Role      : ${u.role}`)
    console.log(`Active    : ${u.active}`)
    console.log(`CompanyId : ${u.companyId}`)
    console.log(`Hash len  : ${u.passwordHash.length}`)

    // Verify the test password works
    const matches = await bcrypt.compare('Complitek2024!', u.passwordHash)
    console.log(`Password 'Complitek2024!' matches: ${matches}`)
    console.log('---')
  }
}

main().catch(console.error).finally(() => process.exit(0))
