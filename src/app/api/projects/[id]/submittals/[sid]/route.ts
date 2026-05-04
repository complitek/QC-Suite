import { NextRequest } from 'next/server'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { projects, submittals } from '@/lib/db/schema'
import { getSession } from '@/lib/session'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sid: string }> }
) {
  const session = getSession(request)
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, sid } = await params
  const body = await request.json()

  const [project] = await db.select().from(projects)
    .where(and(eq(projects.id, id), eq(projects.companyId, session.companyId)))
  if (!project) return Response.json({ error: 'Not found' }, { status: 404 })

  const [updated] = await db.update(submittals).set({
    status: body.status,
    sdCode: body.sdCode,
    title: body.title,
    gcDesignation: body.gcDesignation,
    partDesignation: body.partDesignation,
    specSection: body.specSection,
    requiredDate: body.requiredDate ?? null,
    submittedDate: body.submittedDate ?? null,
    returnedDate: body.returnedDate ?? null,
    approvedDate: body.approvedDate ?? null,
    coActionCode: body.coActionCode ?? null,
    notes: body.notes ?? null,
  }).where(eq(submittals.id, sid)).returning()

  return Response.json({ submittal: updated })
}
