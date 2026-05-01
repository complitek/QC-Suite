import { pgTable, uuid, varchar, text, boolean, integer, date, timestamp, jsonb, pgEnum, serial } from 'drizzle-orm/pg-core'

// ─── Enums ───────────────────────────────────────────────────────────────────

export const agencyEnum = pgEnum('agency', ['NAVFAC', 'USACE', 'ANG', 'OTHER'])
export const contractTypeEnum = pgEnum('contract_type', ['DBB', 'DB', 'HYBRID', 'IDIQ', 'MACC'])
export const complexityTierEnum = pgEnum('complexity_tier', ['TIER1', 'TIER2', 'TIER3'])
export const projectStatusEnum = pgEnum('project_status', ['ACTIVE', 'CLOSEOUT', 'COMPLETE'])
export const userRoleEnum = pgEnum('user_role', [
  'ADMIN', 'QCM', 'ALT_QCM', 'ASST_QCM', 'SPECIALIST',
  'PM', 'SUPT', 'CO_READONLY', 'CONSULTING_QCM'
])
export const planStatusEnum = pgEnum('plan_status', ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'SUPERSEDED'])
export const planTypeEnum = pgEnum('plan_type', [
  'QC_PLAN', 'APP', 'EP', 'DIRT_DUST', 'SWPPP',
  'WASTE_MANAGEMENT', 'SITE_PLAN', 'SIOR', 'AHA', 'OTHER'
])
export const requirementTypeEnum = pgEnum('requirement_type', [
  'SUBMITTAL', 'TEST', 'HOLD_POINT', 'WITNESS_POINT',
  'NOTIFICATION', 'PLAN', 'REPORT', 'CERTIFICATE', 'OTHER'
])
export const deliverableStatusEnum = pgEnum('deliverable_status', [
  'PENDING', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'OVERDUE', 'NA'
])
export const scheduleActivityStatusEnum = pgEnum('schedule_activity_status', [
  'NOT_STARTED', 'IN_PROGRESS', 'COMPLETE', 'DELAYED'
])
export const passFailEnum = pgEnum('pass_fail', ['PASS', 'FAIL', 'PENDING'])
export const partDesignationEnum = pgEnum('part_designation', ['PART_A', 'PART_B', 'BOTH', 'NA'])

// ─── Companies ────────────────────────────────────────────────────────────────

export const companies = pgTable('companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  samUei: varchar('sam_uei', { length: 50 }),
  cageCode: varchar('cage_code', { length: 20 }),
  address: text('address'),
  phone: varchar('phone', { length: 30 }),
  email: varchar('email', { length: 255 }),
  sba8a: boolean('sba_8a').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').references(() => companies.id),
  email: varchar('email', { length: 255 }).notNull().unique(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: userRoleEnum('role').notNull().default('QCM'),
  cqmCertNumber: varchar('cqm_cert_number', { length: 100 }),
  cqmCertExpiry: date('cqm_cert_expiry'),
  phone: varchar('phone', { length: 30 }),
  title: varchar('title', { length: 100 }),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ─── Projects ─────────────────────────────────────────────────────────────────

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  contractNumber: varchar('contract_number', { length: 100 }).notNull(),
  projectName: varchar('project_name', { length: 500 }).notNull(),
  projectIdShort: varchar('project_id_short', { length: 50 }), // e.g. JBPHH-DD3 — used in file naming
  agency: agencyEnum('agency').notNull(),
  location: varchar('location', { length: 255 }),
  state: varchar('state', { length: 2 }),
  contractType: contractTypeEnum('contract_type').notNull(),
  awardDate: date('award_date'),
  completionDate: date('completion_date'),
  eprojectNumber: varchar('eproject_number', { length: 100 }),
  complexityTier: complexityTierEnum('complexity_tier').notNull().default('TIER1'),
  status: projectStatusEnum('status').notNull().default('ACTIVE'),
  isHybrid: boolean('is_hybrid').default(false), // true = has Part A + Part B
  primeContractor: varchar('prime_contractor', { length: 255 }),
  contractValue: integer('contract_value'), // in dollars
  description: text('description'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ─── Spec Books ───────────────────────────────────────────────────────────────
// Each uploaded specification document (projects can have multiple)

export const specBooks = pgTable('spec_books', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 500 }).notNull(), // e.g. "Part A - DBB Specifications"
  partDesignation: partDesignationEnum('part_designation').default('NA'),
  fileUrl: varchar('file_url', { length: 1000 }), // S3/Vercel Blob URL
  fileName: varchar('file_name', { length: 500 }),
  pageCount: integer('page_count'),
  parseStatus: varchar('parse_status', { length: 50 }).default('pending'), // pending | processing | complete | failed
  parsedAt: timestamp('parsed_at'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ─── Spec Sections ────────────────────────────────────────────────────────────
// CSI MasterFormat sections extracted from spec books

export const specSections = pgTable('spec_sections', {
  id: uuid('id').primaryKey().defaultRandom(),
  specBookId: uuid('spec_book_id').references(() => specBooks.id, { onDelete: 'cascade' }).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  sectionNumber: varchar('section_number', { length: 50 }).notNull(), // e.g. "03 31 29"
  sectionTitle: varchar('section_title', { length: 500 }).notNull(),
  partDesignation: partDesignationEnum('part_designation').default('NA'),
  rawText: text('raw_text'), // extracted section text
  aiSummary: text('ai_summary'),
  pageStart: integer('page_start'),
  pageEnd: integer('page_end'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ─── Spec Requirements ────────────────────────────────────────────────────────
// All requirements extracted by AI from spec books

export const specRequirements = pgTable('spec_requirements', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  specSectionId: uuid('spec_section_id').references(() => specSections.id),
  specBookId: uuid('spec_book_id').references(() => specBooks.id),
  requirementType: requirementTypeEnum('requirement_type').notNull(),
  partDesignation: partDesignationEnum('part_designation').default('NA'),
  // Submittal fields
  sdCode: varchar('sd_code', { length: 20 }), // SD-01, SD-02, etc.
  submittalTitle: varchar('submittal_title', { length: 500 }),
  gcDesignation: varchar('gc_designation', { length: 10 }), // G or C
  specParagraph: varchar('spec_paragraph', { length: 100 }),
  // Test fields
  testStandard: varchar('test_standard', { length: 100 }), // ASTM C39, etc.
  testFrequency: varchar('test_frequency', { length: 255 }),
  acceptanceCriteria: text('acceptance_criteria'),
  // Plan fields
  planType: varchar('plan_type', { length: 100 }),
  // General
  description: text('description').notNull(),
  deadlineDays: integer('deadline_days'), // days from NTP or activity start
  deadlineReference: varchar('deadline_reference', { length: 255 }),
  isHoldPoint: boolean('is_hold_point').default(false),
  isWitnessPoint: boolean('is_witness_point').default(false),
  sourceReference: varchar('source_reference', { length: 255 }), // "EM 385-1-1" or "FAR 52.246-21"
  aiGenerated: boolean('ai_generated').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ─── Deliverables ─────────────────────────────────────────────────────────────
// Master list of everything a project is required to submit

export const deliverables = pgTable('deliverables', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  specRequirementId: uuid('spec_requirement_id').references(() => specRequirements.id),
  title: varchar('title', { length: 500 }).notNull(),
  category: varchar('category', { length: 100 }), // PLAN, SUBMITTAL, TEST, REPORT, CERTIFICATE
  partDesignation: partDesignationEnum('part_designation').default('NA'),
  dueDate: date('due_date'),
  dueDateNote: varchar('due_date_note', { length: 255 }), // e.g. "14 days before first concrete pour"
  responsibleParty: varchar('responsible_party', { length: 255 }),
  status: deliverableStatusEnum('status').default('PENDING'),
  submittedDate: date('submitted_date'),
  approvedDate: date('approved_date'),
  fileUrl: varchar('file_url', { length: 1000 }),
  notes: text('notes'),
  aiGenerated: boolean('ai_generated').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ─── Pre-Work Plans ───────────────────────────────────────────────────────────
// QC Plan, APP, EP, SWPPP, Site Plan, SIOR, Dirt & Dust, Waste Management

export const preworkPlans = pgTable('prework_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  planType: planTypeEnum('plan_type').notNull(),
  partDesignation: partDesignationEnum('part_designation').default('NA'),
  title: varchar('title', { length: 500 }).notNull(),
  revision: varchar('revision', { length: 10 }).default('R0'), // R0, R1, R2
  status: planStatusEnum('status').default('DRAFT'),
  content: jsonb('content'), // structured plan content (sections, fields)
  fileUrl: varchar('file_url', { length: 1000 }), // exported Word doc
  fileName: varchar('file_name', { length: 500 }), // per nomenclature standard
  submittedDate: date('submitted_date'),
  approvedDate: date('approved_date'),
  coComments: text('co_comments'),
  aiGenerated: boolean('ai_generated').default(false),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ─── AHA Plans ────────────────────────────────────────────────────────────────
// Activity Hazard Analysis — one per construction activity

export const ahaPlans = pgTable('aha_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  activityName: varchar('activity_name', { length: 500 }).notNull(), // e.g. "Mobilization"
  sequenceNumber: integer('sequence_number').notNull(), // 001, 002, etc.
  partDesignation: partDesignationEnum('part_designation').default('NA'),
  revision: varchar('revision', { length: 10 }).default('R0'),
  status: planStatusEnum('status').default('DRAFT'),
  activityDescription: text('activity_description'),
  hazards: jsonb('hazards'), // array of {hazard, risk_level, controls, ppe}
  ppe: jsonb('ppe'), // required PPE list
  personnelQualifications: text('personnel_qualifications'),
  inspectionRequirements: text('inspection_requirements'),
  emReferences: jsonb('em_references'), // EM 385-1-1 paragraph references
  fileUrl: varchar('file_url', { length: 1000 }),
  fileName: varchar('file_name', { length: 500 }),
  submittedDate: date('submitted_date'),
  approvedDate: date('approved_date'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ─── Submittal Register ───────────────────────────────────────────────────────

export const submittals = pgTable('submittals', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  specRequirementId: uuid('spec_requirement_id').references(() => specRequirements.id),
  submittalNumber: varchar('submittal_number', { length: 50 }), // auto-generated
  sdCode: varchar('sd_code', { length: 20 }).notNull(), // SD-01 through SD-11
  specSection: varchar('spec_section', { length: 50 }),
  specParagraph: varchar('spec_paragraph', { length: 100 }),
  title: varchar('title', { length: 500 }).notNull(),
  partDesignation: partDesignationEnum('part_designation').default('NA'),
  gcDesignation: varchar('gc_designation', { length: 10 }), // G = Government approve, C = Contractor
  requiredDate: date('required_date'), // from schedule
  submittedDate: date('submitted_date'),
  returnedDate: date('returned_date'),
  approvedDate: date('approved_date'),
  status: varchar('status', { length: 50 }).default('PENDING'), // PENDING, SUBMITTED, APPROVED, REJECTED, RESUBMIT
  coActionCode: varchar('co_action_code', { length: 10 }), // A, B, C, D
  fileUrl: varchar('file_url', { length: 1000 }),
  notes: text('notes'),
  aiGenerated: boolean('ai_generated').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ─── Schedule Activities ───────────────────────────────────────────────────────

export const scheduleActivities = pgTable('schedule_activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  activityId: varchar('activity_id', { length: 50 }), // from P6 or MS Project
  activityName: varchar('activity_name', { length: 500 }).notNull(),
  partDesignation: partDesignationEnum('part_designation').default('NA'),
  specSection: varchar('spec_section', { length: 50 }),
  trade: varchar('trade', { length: 100 }),
  plannedStart: date('planned_start'),
  plannedFinish: date('planned_finish'),
  actualStart: date('actual_start'),
  actualFinish: date('actual_finish'),
  duration: integer('duration'), // working days
  percentComplete: integer('percent_complete').default(0),
  status: scheduleActivityStatusEnum('status').default('NOT_STARTED'),
  predecessors: jsonb('predecessors'), // array of activity IDs
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ─── EVR Entries ──────────────────────────────────────────────────────────────
// Earned Value Reporting — tracked per activity per period

export const evrEntries = pgTable('evr_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  scheduleActivityId: uuid('schedule_activity_id').references(() => scheduleActivities.id),
  partDesignation: partDesignationEnum('part_designation').default('NA'),
  reportingPeriod: varchar('reporting_period', { length: 20 }).notNull(), // YYYY-MM
  // Budget
  budgetLaborHours: integer('budget_labor_hours').default(0),
  budgetLaborCost: integer('budget_labor_cost').default(0), // cents
  budgetMaterialCost: integer('budget_material_cost').default(0), // cents
  budgetTotalCost: integer('budget_total_cost').default(0), // cents
  // Planned Value (BCWS)
  pvLaborCost: integer('pv_labor_cost').default(0),
  pvMaterialCost: integer('pv_material_cost').default(0),
  // Earned Value (BCWP)
  evLaborCost: integer('ev_labor_cost').default(0),
  evMaterialCost: integer('ev_material_cost').default(0),
  // Actual Cost (ACWP)
  acLaborHours: integer('ac_labor_hours').default(0),
  acLaborCost: integer('ac_labor_cost').default(0),
  acMaterialCost: integer('ac_material_cost').default(0),
  // Units (for quantity-based tracking)
  unitOfMeasure: varchar('unit_of_measure', { length: 50 }),
  budgetQuantity: integer('budget_quantity'),
  earnedQuantity: integer('earned_quantity'),
  actualQuantity: integer('actual_quantity'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ─── Audit Log ────────────────────────────────────────────────────────────────
// Every create/update/delete logged — legal requirement

export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  tableName: varchar('table_name', { length: 100 }).notNull(),
  recordId: uuid('record_id').notNull(),
  action: varchar('action', { length: 20 }).notNull(), // INSERT, UPDATE, DELETE
  fieldName: varchar('field_name', { length: 100 }),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  changedBy: uuid('changed_by').references(() => users.id),
  changedAt: timestamp('changed_at').defaultNow().notNull(),
  ipAddress: varchar('ip_address', { length: 50 }),
  userAgent: varchar('user_agent', { length: 500 }),
})

// ─── Document Files ───────────────────────────────────────────────────────────
// Every exported file, named per nomenclature standard

export const documentFiles = pgTable('document_files', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  moduleCode: varchar('module_code', { length: 20 }).notNull(), // QC, SAFE, ENV, etc.
  docType: varchar('doc_type', { length: 50 }).notNull(), // APP, QCPLAN, AHA-001, etc.
  specSection: varchar('spec_section', { length: 50 }),
  sequenceNumber: integer('sequence_number').notNull(),
  revision: varchar('revision', { length: 10 }).default('R0'),
  fileDate: date('file_date').notNull(),
  fileUrl: varchar('file_url', { length: 1000 }).notNull(),
  fileName: varchar('file_name', { length: 500 }).notNull(), // full nomenclature name
  fileType: varchar('file_type', { length: 20 }), // docx, xlsx, pdf
  partDesignation: partDesignationEnum('part_designation').default('NA'),
  referenceId: uuid('reference_id'), // ID of the plan/report this file belongs to
  referenceTable: varchar('reference_table', { length: 100 }), // prework_plans, aha_plans, etc.
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
