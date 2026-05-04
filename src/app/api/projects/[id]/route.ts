import { NextRequest } from 'next/server'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { projects, specBooks, specSections, specRequirements, submittals, preworkPlans, ahaPlans, scheduleActivities } from '@/lib/db/schema'
import { getSession } from '@/lib/session'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSession(request)
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const [project] = await db.select().from(projects)
    .where(and(eq(projects.id, id), eq(projects.companyId, session.companyId)))

  if (!project) return Response.json({ error: 'Not found' }, { status: 404 })

  const [books, sectionRows, reqRows, submittalRows, planRows, ahaRows, scheduleRows] = await Promise.all([
    db.select().from(specBooks).where(eq(specBooks.projectId, id)),
    db.select({ id: specSections.id }).from(specSections).where(eq(specSections.projectId, id)),
    db.select({ id: specRequirements.id }).from(specRequirements).where(eq(specRequirements.projectId, id)),
    db.select({ id: submittals.id, status: submittals.status }).from(submittals).where(eq(submittals.projectId, id)),
    db.select({ id: preworkPlans.id, status: preworkPlans.status }).from(preworkPlans).where(eq(preworkPlans.projectId, id)),
    db.select({ id: ahaPlans.id, status: ahaPlans.status }).from(ahaPlans).where(eq(ahaPlans.projectId, id)),
    db.select({ id: scheduleActivities.id }).from(scheduleActivities).where(eq(scheduleActivities.projectId, id)),
  ])

  return Response.json({
    project,
    stats: {
      specBooks: books.length,
      specSections: sectionRows.length,
      specRequirements: reqRows.length,
      submittals: submittalRows.length,
      submittalsPending: submittalRows.filter(s => s.status === 'PENDING').length,
      preworkPlans: planRows.length,
      preworkPlansDraft: planRows.filter(p => p.status === 'DRAFT').length,
      ahaPlans: ahaRows.length,
      scheduleActivities: scheduleRows.length,
    },
    specBooks: books,
  })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSession(request)
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  const [existing] = await db.select().from(projects)
    .where(and(eq(projects.id, id), eq(projects.companyId, session.companyId)))

  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })

  const {
    contractNumber, projectName, projectIdShort, agency, contractType,
    isHybrid, primeContractor, location, state, awardDate, completionDate,
    contractValue, complexityTier, status, description,
  } = body

  const [updated] = await db.update(projects).set({
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
    status: status || 'ACTIVE',
    description: description || null,
  }).where(eq(projects.id, id)).returning()

  return Response.json({ project: updated })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSession(request)
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const [existing] = await db.select().from(projects)
    .where(and(eq(projects.id, id), eq(projects.companyId, session.companyId)))

  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })

  await db.update(projects).set({ status: 'COMPLETE' }).where(eq(projects.id, id))

  return Response.json({ ok: true })
}
