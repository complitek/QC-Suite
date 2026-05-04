import { NextRequest } from 'next/server'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { projects, preworkPlans, specRequirements, submittals } from '@/lib/db/schema'
import { getSession } from '@/lib/session'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; planId: string }> }
) {
  const session = getSession(request)
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, planId } = await params

  const [project] = await db.select().from(projects)
    .where(and(eq(projects.id, id), eq(projects.companyId, session.companyId)))
  if (!project) return Response.json({ error: 'Not found' }, { status: 404 })

  const [plan] = await db.select().from(preworkPlans)
    .where(and(eq(preworkPlans.id, planId), eq(preworkPlans.projectId, id)))
  if (!plan) return Response.json({ error: 'Plan not found' }, { status: 404 })

  // For QC Plans, also fetch tests and G-designated submittals for this part
  let tests: any[] = []
  let govSubmittals: any[] = []

  if (plan.planType === 'QC_PLAN') {
    const partFilter = plan.partDesignation === 'PART_A' ? 'PART_A'
      : plan.partDesignation === 'PART_B' ? 'PART_B'
      : null

    const allTests = await db.select().from(specRequirements)
      .where(and(
        eq(specRequirements.projectId, id),
        eq(specRequirements.requirementType, 'TEST'),
      ))

    tests = partFilter
      ? allTests.filter(t => t.partDesignation === partFilter || t.partDesignation === 'BOTH')
      : allTests

    const allSubs = await db.select().from(submittals)
      .where(and(
        eq(submittals.projectId, id),
        eq(submittals.gcDesignation, 'G'),
      ))

    govSubmittals = partFilter
      ? allSubs.filter(s => s.partDesignation === partFilter || s.partDesignation === 'BOTH')
      : allSubs
  }

  return Response.json({ plan, project, tests, govSubmittals })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; planId: string }> }
) {
  const session = getSession(request)
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, planId } = await params
  const body = await request.json()

  const [project] = await db.select().from(projects)
    .where(and(eq(projects.id, id), eq(projects.companyId, session.companyId)))
  if (!project) return Response.json({ error: 'Not found' }, { status: 404 })

  const [updated] = await db.update(preworkPlans).set({
    title: body.title,
    revision: body.revision,
    status: body.status,
    content: body.content,
    updatedAt: new Date(),
  }).where(and(
    eq(preworkPlans.id, planId),
    eq(preworkPlans.projectId, id),
  )).returning()

  return Response.json({ plan: updated })
}
