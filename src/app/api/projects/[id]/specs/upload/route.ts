import { NextRequest } from 'next/server'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { projects, specBooks, specSections, specRequirements } from '@/lib/db/schema'
import { getSession } from '@/lib/session'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 300

// CUI scrub map — replaces real JBPHH identifiers with Neverland equivalents
const SCRUB: [RegExp, string][] = [
  [/Joint Base Pearl Harbor[- ]?Hickam/gi, 'Naval Station Neverland'],
  [/\bJBPHH\b/g, 'NSN'],
  [/Pearl Harbor/gi, 'Neverland Harbor'],
  [/\bP-?209\b/g, 'P-JRB'],
  [/Dry Dock 3/gi, 'Jolly Roger Basin Dry Dock'],
  [/Dry Dock No\.?\s*3/gi, 'Jolly Roger Basin Dry Dock'],
  [/N62742-24-C-4471/g, 'N32078-26-C-1953'],
]

function scrub(text: string | null | undefined): string {
  if (!text) return ''
  let out = text
  for (const [pattern, replacement] of SCRUB) {
    out = out.replace(pattern, replacement)
  }
  return out
}

const SYSTEM_PROMPT = `You are a federal construction specification analyst. You extract structured data from NAVFAC/USACE specification books.`

const EXTRACTION_PROMPT = `Extract ALL specification sections from this PDF. For each section, extract every quality control requirement.

IMPORTANT — apply these text replacements in ALL extracted content:
- "Joint Base Pearl Harbor-Hickam" / "JBPHH" → "Naval Station Neverland" / "NSN"
- "Pearl Harbor" → "Neverland Harbor"
- "P-209" / "P209" → "P-JRB"
- "Dry Dock 3" / "Dry Dock No. 3" → "Jolly Roger Basin Dry Dock"
- Contract "N62742-24-C-4471" → "N32078-26-C-1953"
- Real person names → "[NAME REDACTED]"

Return ONLY valid JSON — no markdown, no explanation, just the JSON object:

{
  "title": "string — name of this spec book",
  "partDesignation": "PART_A" | "PART_B" | "BOTH" | "NA",
  "sections": [
    {
      "sectionNumber": "03 31 29",
      "sectionTitle": "Marine Concrete",
      "partDesignation": "PART_A" | "PART_B" | "BOTH" | "NA",
      "aiSummary": "1-2 sentence plain-English summary of this section",
      "requirements": [
        {
          "requirementType": "SUBMITTAL" | "TEST" | "HOLD_POINT" | "WITNESS_POINT" | "NOTIFICATION" | "PLAN" | "REPORT" | "CERTIFICATE" | "OTHER",
          "sdCode": "SD-01" through "SD-11" or null,
          "submittalTitle": "title string or null",
          "gcDesignation": "G" | "C" | null,
          "specParagraph": "paragraph ref or null",
          "testStandard": "ASTM C39 etc or null",
          "testFrequency": "frequency text or null",
          "acceptanceCriteria": "criteria text or null",
          "description": "full requirement text",
          "isHoldPoint": false,
          "isWitnessPoint": false,
          "deadlineDays": null
        }
      ]
    }
  ]
}`

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getSession(request)
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const [project] = await db.select().from(projects)
    .where(and(eq(projects.id, id), eq(projects.companyId, session.companyId)))
  if (!project) return Response.json({ error: 'Not found' }, { status: 404 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const partDesignation = (formData.get('partDesignation') as string) || 'NA'

  if (!file) return Response.json({ error: 'No file provided' }, { status: 400 })
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    return Response.json({ error: 'Only PDF files are accepted' }, { status: 400 })
  }
  if (file.size > 32 * 1024 * 1024) {
    return Response.json({ error: 'File must be under 32 MB' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  let extracted: any
  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: buffer.toString('base64'),
            },
          } as any,
          { type: 'text', text: EXTRACTION_PROMPT },
        ],
      }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return Response.json({ error: 'Extraction failed — model did not return JSON' }, { status: 500 })
    }
    extracted = JSON.parse(jsonMatch[0])
  } catch (err: any) {
    return Response.json({ error: `Extraction error: ${err.message}` }, { status: 500 })
  }

  const bookTitle = scrub(extracted.title) || file.name.replace(/\.pdf$/i, '')
  const bookPart = (extracted.partDesignation ?? partDesignation) as any

  const [book] = await db.insert(specBooks).values({
    projectId: id,
    title: bookTitle,
    partDesignation: bookPart,
    fileName: file.name,
    parseStatus: 'complete',
    parsedAt: new Date(),
  }).returning()

  let sectionsAdded = 0
  let requirementsAdded = 0

  for (const sec of (extracted.sections ?? [])) {
    const sectionNumber = String(sec.sectionNumber ?? '').trim()
    if (!sectionNumber) continue

    const [section] = await db.insert(specSections).values({
      specBookId: book.id,
      projectId: id,
      sectionNumber: scrub(sectionNumber),
      sectionTitle: scrub(sec.sectionTitle ?? 'Untitled'),
      partDesignation: ((sec.partDesignation ?? partDesignation) as any),
      aiSummary: sec.aiSummary ? scrub(sec.aiSummary) : null,
    }).returning()

    sectionsAdded++

    for (const req of (sec.requirements ?? [])) {
      await db.insert(specRequirements).values({
        projectId: id,
        specSectionId: section.id,
        specBookId: book.id,
        requirementType: (req.requirementType ?? 'OTHER') as any,
        partDesignation: ((sec.partDesignation ?? partDesignation) as any),
        sdCode: req.sdCode ? scrub(req.sdCode) : null,
        submittalTitle: req.submittalTitle ? scrub(req.submittalTitle) : null,
        gcDesignation: req.gcDesignation ?? null,
        specParagraph: req.specParagraph ?? null,
        testStandard: req.testStandard ? scrub(req.testStandard) : null,
        testFrequency: req.testFrequency ? scrub(req.testFrequency) : null,
        acceptanceCriteria: req.acceptanceCriteria ? scrub(req.acceptanceCriteria) : null,
        description: scrub(req.description ?? ''),
        isHoldPoint: req.isHoldPoint ?? false,
        isWitnessPoint: req.isWitnessPoint ?? false,
        deadlineDays: req.deadlineDays ?? null,
        aiGenerated: true,
      })
      requirementsAdded++
    }
  }

  return Response.json({
    ok: true,
    bookId: book.id,
    bookTitle,
    sectionsAdded,
    requirementsAdded,
  })
}
