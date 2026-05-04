import { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { projects } from '@/lib/db/schema'
import { getSession } from '@/lib/session'

export async function GET(request: NextRequest) {
  const session = getSession(request)
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await db.select().from(projects)
    .where(eq(projects.companyId, session.companyId))
    .orderBy(projects.createdAt)

  return Response.json({ projects: rows })
}

export async function POST(request: NextRequest) {
  const session = getSession(request)
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const {
    contractNumber, projectName, projectIdShort, agency, contractType,
    isHybrid, primeContractor, location, state, awardDate, completionDate,
    contractValue, complexityTier, description,
  } = body

  if (!contractNumber || !projectName || !agency || !contractType) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const [project] = await db.insert(projects).values({
    companyId: session.companyId,
    contractNumber,
    projectName,
    projectIdShort: projectIdShort || null,
    agency,
    contractType,
    isHybrid: !!isHybrid,
    primeContractor: primeContractor || null,
    location: location || null,
    state: state || null,
    awardDate: awardDate || null,
    completionDate: completionDate || null,
    contractValue: contractValue ? parseInt(contractValue) : null,
    complexityTier: complexityTier || 'TIER1',
    status: 'ACTIVE',
    description: description || null,
    createdBy: session.userId,
  }).returning()

  return Response.json({ project }, { status: 201 })
}
