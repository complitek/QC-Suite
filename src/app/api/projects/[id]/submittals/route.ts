import { NextRequest } from 'next/server'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { projects, specRequirements, specSections, submittals } from '@/lib/db/schema'
import { getSession } from '@/lib/session'

function sectionToCode(sectionNumber: string): string {
  // SWBS sections keep their prefix + 3-digit number: "SWBS 000" → "SWBS000"
  if (sectionNumber.startsWith('SWBS')) {
    return sectionNumber.replace(/\s+/g, '')
  }
  // CSI sections: remove spaces, strip dot-suffix, take first 6 digits
  // "01 33 00" → "013300", "01 45 00.00 20" → "014500"
  const digits = sectionNumber.replace(/\s+/g, '').split('.')[0]
  return digits.substring(0, 6)
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSession(request)
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const [project] = await db.select().from(projects)
    .where(and(eq(projects.id, id), eq(projects.companyId, session.companyId)))
  if (!project) return Response.json({ error: 'Not found' }, { status: 404 })

  const existing = await db.select().from(submittals).where(eq(submittals.projectId, id))

  if (existing.length === 0) {
    // Join requirements with their sections to get section numbers
    const reqs = await db.select({
      req: specRequirements,
      sectionNumber: specSections.sectionNumber,
    })
      .from(specRequirements)
      .leftJoin(specSections, eq(specRequirements.specSectionId, specSections.id))
      .where(and(
        eq(specRequirements.projectId, id),
        eq(specRequirements.requirementType, 'SUBMITTAL'),
      ))

    if (reqs.length > 0) {
      // Track sequence per section
      const sectionSeq: Record<string, number> = {}

      const rows = reqs.map(({ req: r, sectionNumber }) => {
        const code = sectionNumber ? sectionToCode(sectionNumber) : 'GEN'
        sectionSeq[code] = (sectionSeq[code] ?? 0) + 1
        const seq = String(sectionSeq[code]).padStart(3, '0')

        return {
          projectId: id,
          specRequirementId: r.id,
          submittalNumber: `${code}-${seq}`,
          sdCode: r.sdCode ?? 'SD-01',
          specSection: sectionNumber ?? null,
          title: r.submittalTitle ?? r.description.substring(0, 200),
          partDesignation: r.partDesignation,
          gcDesignation: r.gcDesignation,
          status: 'PENDING' as const,
          aiGenerated: true,
        }
      })

      await db.insert(submittals).values(rows)

      const created = await db.select().from(submittals).where(eq(submittals.projectId, id))
      return Response.json({ submittals: created, generated: true })
    }
  }

  return Response.json({ submittals: existing, generated: false })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSession(request)
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  const [project] = await db.select().from(projects)
    .where(and(eq(projects.id, id), eq(projects.companyId, session.companyId)))
  if (!project) return Response.json({ error: 'Not found' }, { status: 404 })

  // Number manually-added submittals as GEN-NNN
  const existing = await db.select().from(submittals)
    .where(and(eq(submittals.projectId, id), eq(submittals.aiGenerated, false)))

  const seq = String(existing.length + 1).padStart(3, '0')
  const sectionCode = body.specSection ? sectionToCode(body.specSection) : 'GEN'

  const [created] = await db.insert(submittals).values({
    projectId: id,
    submittalNumber: `${sectionCode}-${seq}`,
    sdCode: body.sdCode,
    title: body.title,
    partDesignation: body.partDesignation ?? 'NA',
    gcDesignation: body.gcDesignation ?? null,
    specSection: body.specSection ?? null,
    status: 'PENDING',
    notes: body.notes ?? null,
    aiGenerated: false,
  }).returning()

  return Response.json({ submittal: created }, { status: 201 })
}
