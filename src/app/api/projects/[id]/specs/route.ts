import { NextRequest } from 'next/server'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { projects, specBooks, specSections, specRequirements } from '@/lib/db/schema'
import { getSession } from '@/lib/session'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSession(request)
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const [project] = await db.select().from(projects)
    .where(and(eq(projects.id, id), eq(projects.companyId, session.companyId)))
  if (!project) return Response.json({ error: 'Not found' }, { status: 404 })

  const books = await db.select().from(specBooks).where(eq(specBooks.projectId, id))

  const sections = await db.select().from(specSections).where(eq(specSections.projectId, id))

  const requirements = await db.select().from(specRequirements).where(eq(specRequirements.projectId, id))

  return Response.json({ project, books, sections, requirements })
}
