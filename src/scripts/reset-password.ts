import { config } from 'dotenv'
config({ path: '.env.local' })

import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import * as schema from '../lib/db/schema'

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql, { schema })

async function main() {
  const email = 'pvaldez@3g2bllc.com'
  const newPassword = 'Complitek2024!'

  const hash = await bcrypt.hash(newPassword, 12)

  const result = await db.update(schema.users)
    .set({ passwordHash: hash })
    .where(eq(schema.users.email, email))
    .returning({ email: schema.users.email })

  if (result.length === 0) {
    console.log(`No user found with email: ${email}`)
    console.log('Creating account...')

    await db.insert(schema.users).values({
      email,
      fullName: 'Pebbles Valdez',
      passwordHash: hash,
      role: 'ADMIN',
    })
    console.log('Account created.')
  } else {
    console.log(`Password reset for: ${email}`)
  }

  console.log(`\nLogin credentials:`)
  console.log(`  Email    : ${email}`)
  console.log(`  Password : ${newPassword}`)
}

main().catch(console.error).finally(() => process.exit(0))
