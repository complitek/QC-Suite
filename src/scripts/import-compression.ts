/**
 * One-time import: reads the Compressive Strength sheet from the P209 master log
 * and loads historical pours + break results into the Neverland project.
 *
 * Usage:
 *   npx tsx src/scripts/import-compression.ts
 *
 * The script looks for the Excel file at EXCEL_PATH and the project by
 * contract number NEVERLAND_CONTRACT. Adjust as needed.
 */

import 'dotenv/config'
import * as ExcelJS from 'exceljs'
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { eq } from 'drizzle-orm'
import * as schema from '../lib/db/schema'
import path from 'path'

const EXCEL_PATH = path.resolve(
  process.env.HOME ?? process.env.USERPROFILE ?? '',
  'OneDrive', 'Desktop', 'P209 Concrete Reports',
  'P209 Concrete and Masonry Sample Log.xlsx'
)

const NEVERLAND_CONTRACT = 'N32078-26-C-1953'

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql, { schema })

// ─── Column indices (ExcelJS 1-based = Python 0-based + 1) ───────────────────
const C = {
  SAMPLE_ID:    2,
  SHIFT_DATE:   3,
  DFOW:         4,
  SPEC:         5,
  AREA:         6,
  LOCATION:    11,
  WALL_PANEL:  12,
  PFU_LOC:     13,
  STRUCTURE:   14,
  ELEMENT:     15,
  SAMPLED_BY:  16,
  SAMPLE_TYPE: 17,
  SUPPLIER:    18,
  MIX_ID:      19,
  BATCH_TKT:   20,
  QTY_SIZE:    21,
  TEST_DATE:   22,
  AGE_DAYS:    23,
  TESTED_BY:   24,
  SLUMP:       25,
  FLOW:        26,
  AIR:         27,
  TEMP:        28,
  UNIT_WT:     29,
  WC:          30,
  VSI:         31,
  AMB_TEMP:    32,
  LOAD_LBS:    33,
  SURF_AREA:   34,
  STRENGTH:    35,
  AVERAGE:     36,
  BREAK_TYPE:  37,
  REQ_STR:     38,
  VOL_CY:      39,
  DAILY_VOL:   40,
  MARINE_CUM:  41,
  MARINE_LOT:  42,
  COMPLY_YES:  43,
  COMPLY_NO:   44,
  COMPLY_NA:   45,
  SUBMITTED:   46,
  COMMENTS:    47,
}

function cell(row: ExcelJS.Row, col: number): ExcelJS.CellValue {
  const c = row.getCell(col)
  // Formula cells return { formula, result } — unwrap the result
  const v = c.value
  if (v != null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
    const obj = v as unknown as Record<string, unknown>
    if ('result' in obj) return obj.result as ExcelJS.CellValue
    if ('text' in obj) return obj.text as ExcelJS.CellValue
  }
  return v
}

function toStr(v: ExcelJS.CellValue): string | null {
  if (v == null) return null
  if (typeof v === 'string') { const t = v.trim(); return t === '' || t.toUpperCase() === 'N/A' ? null : t }
  if (typeof v === 'number') return Number.isFinite(v) ? v.toString() : null
  if (v instanceof Date) {
    if (v.getFullYear() < 2000 || v.getFullYear() > 2100) return null
    return v.toISOString().split('T')[0]
  }
  return null
}

function toNum(v: ExcelJS.CellValue): number | null {
  if (v == null) return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (v instanceof Date) return null
  const s = toStr(v)
  if (!s) return null
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

function toInt(v: ExcelJS.CellValue): number | null {
  const n = toNum(v)
  return n == null ? null : Math.round(n)
}

function toDate(v: ExcelJS.CellValue): string | null {
  if (v == null) return null
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return null
    if (v.getFullYear() < 2000 || v.getFullYear() > 2100) return null
    // Use UTC date to avoid timezone shift
    const y = v.getUTCFullYear(), m = String(v.getUTCMonth() + 1).padStart(2, '0'), d = String(v.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  if (typeof v === 'string') {
    const t = v.trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t
  }
  return null
}

function complianceOf(row: ExcelJS.Row): string | null {
  const yesVal = cell(row, C.COMPLY_YES)
  const noVal  = cell(row, C.COMPLY_NO)
  const naVal  = cell(row, C.COMPLY_NA)
  // Non-null / non-empty means that column is checked
  if (yesVal != null && yesVal !== '') return 'YES'
  if (noVal  != null && noVal  !== '') return 'NO'
  if (naVal  != null && naVal  !== '') return 'NA'
  return null
}

async function main() {
  console.log('Looking for project:', NEVERLAND_CONTRACT)
  const [project] = await db.select().from(schema.projects).where(eq(schema.projects.contractNumber, NEVERLAND_CONTRACT))
  if (!project) {
    console.error('Project not found. Run db:seed first.')
    process.exit(1)
  }
  console.log('Project found:', project.projectName)

  // Check if already imported
  const existing = await db.select().from(schema.concretePours).where(eq(schema.concretePours.projectId, project.id))
  if (existing.length > 0) {
    console.log(`Already imported ${existing.length} pours. Delete them first to re-import.`)
    process.exit(0)
  }

  console.log('Reading Excel file:', EXCEL_PATH)
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(EXCEL_PATH)

  const ws = workbook.getWorksheet('Compressive Strength')
  if (!ws) { console.error('Sheet "Compressive Strength" not found'); process.exit(1) }

  // Data starts at row 16 (rows 1-13 = legend/header, 14 = col headers, 15 = sub-headers)
  const DATA_START = 16

  // Group rows by batch ticket → pour
  const pourMap = new Map<string, { rows: ExcelJS.Row[]; key: string }>()

  ws.eachRow((row, rowNum) => {
    if (rowNum < DATA_START) return
    const sampleId = toStr(cell(row, C.SAMPLE_ID))
    if (!sampleId) return  // skip empty rows

    const batchTkt = toStr(cell(row, C.BATCH_TKT))
    const shiftDate = toDate(cell(row, C.SHIFT_DATE))
    const location = toStr(cell(row, C.LOCATION)) ?? ''

    // Group key: batch ticket if present, else shift_date + location
    const key = batchTkt && batchTkt !== 'N/A'
      ? `bkt:${batchTkt}`
      : `date:${shiftDate}:loc:${location}`

    if (!pourMap.has(key)) pourMap.set(key, { rows: [], key })
    pourMap.get(key)!.rows.push(row)
  })

  console.log(`Found ${pourMap.size} unique pours, total rows will be inserted...`)

  let pourInserted = 0
  let breakInserted = 0
  let skipped = 0

  for (const { rows: pourRows } of pourMap.values()) {
    const first = pourRows[0]
    const shiftDate = toDate(cell(first, C.SHIFT_DATE))
    if (!shiftDate) { skipped++; continue }

    // Insert pour record (data from first row of the group)
    const [pour] = await db.insert(schema.concretePours).values({
      projectId: project.id,
      shiftDate,
      definableFeature: toStr(cell(first, C.DFOW)),
      specSection: toStr(cell(first, C.SPEC)),
      area: toStr(cell(first, C.AREA)),
      locationDescription: toStr(cell(first, C.LOCATION)),
      wallPanelControlNo: toStr(cell(first, C.WALL_PANEL)),
      pfuLocation: toStr(cell(first, C.PFU_LOC)),
      structure: toStr(cell(first, C.STRUCTURE)),
      element: toStr(cell(first, C.ELEMENT)),
      sampledBy: toStr(cell(first, C.SAMPLED_BY)),
      sampleType: toStr(cell(first, C.SAMPLE_TYPE)),
      readyMixSupplier: toStr(cell(first, C.SUPPLIER)),
      mixId: toStr(cell(first, C.MIX_ID)),
      batchTicketNumber: toStr(cell(first, C.BATCH_TKT)),
      quantitySize: toStr(cell(first, C.QTY_SIZE)),
      astmC143Slump: toNum(cell(first, C.SLUMP)),
      astmC1611Flow: toNum(cell(first, C.FLOW)),
      astmC231Air: toNum(cell(first, C.AIR)),
      astmC1064Temp: toNum(cell(first, C.TEMP)),
      astmC138UnitWeight: toNum(cell(first, C.UNIT_WT)),
      wcRatio: toNum(cell(first, C.WC)),
      vsi: toInt(cell(first, C.VSI)),
      ambientTemp: toNum(cell(first, C.AMB_TEMP)),
      volumeCy: toStr(cell(first, C.VOL_CY)),
      totalDailyVol: toNum(cell(first, C.DAILY_VOL)),
      marineConcreteCumulative: toNum(cell(first, C.MARINE_CUM)),
      marineConcreteLoNumber: toStr(cell(first, C.MARINE_LOT)),
      requiredCompStrength: toInt(cell(first, C.REQ_STR)),
      importedFromExcel: true,
    }).returning()

    pourInserted++

    // Insert break record for each row in this group
    const breakValues = pourRows.map(row => ({
      pourId: pour.id,
      projectId: project.id,
      sampleId: toStr(cell(row, C.SAMPLE_ID)),
      testDate: toDate(cell(row, C.TEST_DATE)),
      ageDays: toInt(cell(row, C.AGE_DAYS)),
      testedBy: toStr(cell(row, C.TESTED_BY)),
      compressiveLoadLbs: toInt(cell(row, C.LOAD_LBS)),
      surfaceArea: toNum(cell(row, C.SURF_AREA)),
      compStrengthPsi: toInt(cell(row, C.STRENGTH)),
      averagePsi: toNum(cell(row, C.AVERAGE)),
      breakType: toInt(cell(row, C.BREAK_TYPE)),
      compliance: complianceOf(row),
      dateSubmittedToGovt: toDate(cell(row, C.SUBMITTED)),
      comments: toStr(cell(row, C.COMMENTS)),
    }))

    // Batch insert in chunks of 100
    for (let i = 0; i < breakValues.length; i += 100) {
      await db.insert(schema.concreteTestResults).values(breakValues.slice(i, i + 100))
      breakInserted += Math.min(100, breakValues.length - i)
    }

    if (pourInserted % 50 === 0) {
      process.stdout.write(`\r  ${pourInserted} pours / ${breakInserted} breaks inserted...`)
    }
  }

  console.log(`\nDone. ${pourInserted} pours and ${breakInserted} break records imported. ${skipped} rows skipped.`)
}

main().catch(err => { console.error(err); process.exit(1) })
