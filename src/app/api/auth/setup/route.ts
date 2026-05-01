import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { companies, users } from '@/lib/db/schema'
import { hashPassword } from '@/lib/auth'
import { eq } from 'drizzle-orm'

// One-time setup endpoint — creates the first admin account and company
// Disabled automatically once an admin exists
export async function POST(req: NextRequest) {
  try {
    const existingAdmins = await db.select().from(users).where(eq(users.role, 'ADMIN'))
    if (existingAdmins.length > 0) {
      return NextResponse.json({ error: 'Setup already complete' }, { status: 403 })
    }

    const { companyName, adminEmail, adminName, adminPassword } = await req.json()

    if (!companyName || !adminEmail || !adminName || !adminPassword) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    if (adminPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const [company] = await db.insert(companies).values({
      name: companyName,
      sba8a: true,
    }).returning()

    const passwordHash = await hashPassword(adminPassword)

    const [user] = await db.insert(users).values({
      companyId: company.id,
      email: adminEmail.toLowerCase(),
      fullName: adminName,
      passwordHash,
      role: 'ADMIN',
    }).returning()

    return NextResponse.json({
      success: true,
      message: 'Admin account created. You can now log in.',
      email: user.email,
    })
  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json({ error: 'Setup failed. Please try again.' }, { status: 500 })
  }
}
