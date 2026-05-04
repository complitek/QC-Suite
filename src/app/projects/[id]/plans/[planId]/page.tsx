'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/layout/nav'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TeamMember { name: string; title: string; role: string; company: string }
interface DFOW { name: string; specSection: string; description: string }
interface Subcontractor { name: string; scope: string; license: string }

interface QCPlanContent {
  cover: {
    qcmName: string; qcmTitle: string; qcmCertNumber: string; qcmCertExpiry: string
    altQcmName: string; altQcmTitle: string; preparedDate: string
  }
  section1: { projectDescription: string; contractScope: string; performancePeriod: string }
  section2: { orgDescription: string; qcmResponsibilities: string; teamMembers: TeamMember[] }
  section3: { preparatoryPhase: string; initialPhase: string; followupPhase: string }
  section4: { dfows: DFOW[] }
  section5: { description: string }
  section6: { description: string }
  section7: { dailyReportProcedure: string; punchListProcedure: string; nonconformanceProcess: string }
  section8: { description: string; subcontractors: Subcontractor[] }
}

interface Plan {
  id: string; title: string; revision: string; status: string
  planType: string; partDesignation: string; content: QCPlanContent | null
}

interface TestReq {
  id: string; submittalTitle: string | null; description: string
  testStandard: string | null; testFrequency: string | null; acceptanceCriteria: string | null
  specSectionId: string | null
}

interface GovSub { id: string; submittalNumber: string; sdCode: string; title: string; specSection: string | null }

// ─── Defaults ─────────────────────────────────────────────────────────────────

function defaultContent(): QCPlanContent {
  return {
    cover: { qcmName: '', qcmTitle: 'Quality Control Manager', qcmCertNumber: '', qcmCertExpiry: '', altQcmName: '', altQcmTitle: 'Alternate Quality Control Manager', preparedDate: '' },
    section1: { projectDescription: '', contractScope: '', performancePeriod: '' },
    section2: {
      orgDescription: '',
      qcmResponsibilities: 'The QCM is responsible for overall implementation and management of the Quality Control Plan. The QCM has the authority to stop work when deficiencies are identified and to direct corrective action.',
      teamMembers: [{ name: '', title: '', role: 'QCM', company: '' }],
    },
    section3: {
      preparatoryPhase: 'Prior to beginning each definable feature of work, the QCM will conduct a preparatory inspection meeting with the superintendent, subcontractor foreman, and applicable trade personnel. The meeting will review: (1) Contract requirements and applicable specifications; (2) Submittals, shop drawings, and material certifications; (3) Testing requirements and hold/witness points; (4) AHA requirements; (5) Safety requirements per EM 385-1-1.',
      initialPhase: 'After the preparatory phase and when the first work of a feature begins, the QCM will conduct an initial inspection to verify: (1) Work is being performed in accordance with contract requirements; (2) Materials and equipment comply with approved submittals; (3) Testing is being performed at required frequencies; (4) Workers are following the AHA.',
      followupPhase: 'The QCM will conduct follow-up inspections daily or as frequently as necessary to ensure continued compliance with contract requirements. Any deficiencies will be documented on the daily QC report and tracked to completion.',
    },
    section4: { dfows: [{ name: '', specSection: '', description: '' }] },
    section5: { description: '' },
    section6: { description: 'All Government-approve (G) submittals must be approved prior to beginning the associated work. Contractor-certify (C) submittals shall be submitted for the record. All submittals will be processed through the Government-approved project management system.' },
    section7: {
      dailyReportProcedure: 'The QCM or designated alternate will prepare a Daily QC Report for each day that construction work is performed. The report will document: (1) Weather conditions; (2) Work performed; (3) Tests conducted and results; (4) Preparatory and initial inspections conducted; (5) Deficiencies identified and corrective actions; (6) Visitor log.',
      punchListProcedure: 'The QCM will maintain a running punch list of all deficiencies. Each item will include the date identified, description, responsible party, and date resolved. The punch list will be reviewed weekly with the Contracting Officer Representative.',
      nonconformanceProcess: 'When non-conforming work is identified, the QCM will: (1) Issue a written Non-Conformance Report (NCR); (2) Stop affected work; (3) Notify the Contracting Officer; (4) Identify root cause and corrective action; (5) Document resolution and re-inspection.',
    },
    section8: {
      description: 'All subcontractors are required to comply with this QC Plan. The QCM will conduct pre-work meetings with each subcontractor prior to commencement of work. Subcontractors must have qualified personnel and maintain their own quality documentation.',
      subcontractors: [{ name: '', scope: '', license: '' }],
    },
  }
}

// ─── Section nav ──────────────────────────────────────────────────────────────

const SECTIONS = [
  { key: 'cover',    label: 'Cover Page' },
  { key: 'section1', label: '1. Project Overview' },
  { key: 'section2', label: '2. QC Organization' },
  { key: 'section3', label: '3. Three-Phase Control' },
  { key: 'section4', label: '4. Definable Features' },
  { key: 'section5', label: '5. Testing Plan' },
  { key: 'section6', label: '6. Submittal Procedures' },
  { key: 'section7', label: '7. Documentation' },
  { key: 'section8', label: '8. Subcontractor Control' },
]

const STATUS_STYLES: Record<string, string> = {
  DRAFT:     'bg-slate-700 text-slate-300',
  SUBMITTED: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  APPROVED:  'bg-green-500/10 text-green-400 border border-green-500/20',
  REJECTED:  'bg-red-500/10 text-red-400 border border-red-500/20',
}

// ─── Input helpers ─────────────────────────────────────────────────────────

function Field({ label, value, onChange, multiline = false, rows = 4, placeholder = '' }: {
  label: string; value: string; onChange: (v: string) => void
  multiline?: boolean; rows?: number; placeholder?: string
}) {
  return (
    <div>
      <label className="text-slate-400 text-xs block mb-1">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-yellow-500/50 resize-y leading-relaxed"
        />
      ) : (
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500/50"
        />
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlanEditorPage({ params }: { params: Promise<{ id: string; planId: string }> }) {
  const router = useRouter()
  const [user, setUser] = useState<{ fullName: string; role: string } | null>(null)
  const [project, setProject] = useState<{ id: string; projectName: string; projectIdShort: string | null; contractNumber: string; agency: string; primeContractor: string | null; awardDate: string | null; completionDate: string | null } | null>(null)
  const [plan, setPlan] = useState<Plan | null>(null)
  const [tests, setTests] = useState<TestReq[]>([])
  const [govSubs, setGovSubs] = useState<GovSub[]>([])
  const [content, setContent] = useState<QCPlanContent>(defaultContent())
  const [activeSection, setActiveSection] = useState('cover')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [ids, setIds] = useState({ projectId: '', planId: '' })

  useEffect(() => {
    params.then(({ id, planId }) => {
      setIds({ projectId: id, planId })
      fetch('/api/auth/me')
        .then(r => r.json())
        .then(data => {
          if (!data.user) { router.push('/'); return }
          setUser(data.user)
          return fetch(`/api/projects/${id}/plans/${planId}`)
        })
        .then(r => r?.json())
        .then(data => {
          if (!data?.plan) { router.push(`/projects/${id}/plans`); return }
          setPlan(data.plan)
          setProject(data.project)
          setTests(data.tests ?? [])
          setGovSubs(data.govSubmittals ?? [])
          // Load existing content or build defaults pre-filled with project data
          if (data.plan.content) {
            setContent(data.plan.content)
          } else {
            const def = defaultContent()
            // Pre-fill from project
            def.section1.projectDescription = `${data.project.projectName}. Contract ${data.project.contractNumber} awarded to ${data.project.primeContractor ?? '[Prime Contractor]'} by ${data.project.agency}. ${data.plan.partDesignation === 'PART_A' ? 'Part A Design-Bid-Build (DBB) work.' : 'Part B Design-Build (DB) work.'}`
            def.section1.performancePeriod = `Award Date: ${data.project.awardDate ?? 'TBD'} | Completion Date: ${data.project.completionDate ?? 'TBD'}`
            def.cover.preparedDate = new Date().toISOString().split('T')[0]
            setContent(def)
          }
        })
        .catch(() => router.push('/projects'))
    })
  }, [params, router])

  function updateContent(path: string[], value: any) {
    setContent(prev => {
      const next = JSON.parse(JSON.stringify(prev))
      let obj = next as any
      for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]]
      obj[path[path.length - 1]] = value
      return next
    })
    setSaved(false)
  }

  async function save(newStatus?: string) {
    if (!plan) return
    setSaving(true)
    try {
      const res = await fetch(`/api/projects/${ids.projectId}/plans/${ids.planId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: plan.title,
          revision: plan.revision,
          status: newStatus ?? plan.status,
          content,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setPlan(data.plan)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } finally {
      setSaving(false)
    }
  }

  // Team member helpers
  function addTeamMember() {
    updateContent(['section2', 'teamMembers'], [...content.section2.teamMembers, { name: '', title: '', role: '', company: '' }])
  }
  function updateTeamMember(i: number, field: keyof TeamMember, val: string) {
    const members = [...content.section2.teamMembers]
    members[i] = { ...members[i], [field]: val }
    updateContent(['section2', 'teamMembers'], members)
  }
  function removeTeamMember(i: number) {
    updateContent(['section2', 'teamMembers'], content.section2.teamMembers.filter((_, idx) => idx !== i))
  }

  // DFOW helpers
  function addDFOW() {
    updateContent(['section4', 'dfows'], [...content.section4.dfows, { name: '', specSection: '', description: '' }])
  }
  function updateDFOW(i: number, field: keyof DFOW, val: string) {
    const dfows = [...content.section4.dfows]
    dfows[i] = { ...dfows[i], [field]: val }
    updateContent(['section4', 'dfows'], dfows)
  }
  function removeDFOW(i: number) {
    updateContent(['section4', 'dfows'], content.section4.dfows.filter((_, idx) => idx !== i))
  }

  // Subcontractor helpers
  function addSub() {
    updateContent(['section8', 'subcontractors'], [...content.section8.subcontractors, { name: '', scope: '', license: '' }])
  }
  function updateSub(i: number, field: keyof Subcontractor, val: string) {
    const subs = [...content.section8.subcontractors]
    subs[i] = { ...subs[i], [field]: val }
    updateContent(['section8', 'subcontractors'], subs)
  }
  function removeSub(i: number) {
    updateContent(['section8', 'subcontractors'], content.section8.subcontractors.filter((_, idx) => idx !== i))
  }

  if (!user || !plan) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-slate-400 text-sm">Loading...</div>
    </div>
  )

  const partLabel = plan.partDesignation === 'PART_A' ? 'Part A (DBB)' : plan.partDesignation === 'PART_B' ? 'Part B (DB)' : 'Both Parts'

  return (
    <div className="min-h-screen bg-slate-900">
      <Nav user={user} />

      <main className="p-8">
        <div className="max-w-7xl mx-auto">

          {/* Breadcrumb */}
          <div className="flex items-center gap-3 mb-6 text-sm">
            <Link href="/projects" className="text-slate-500 hover:text-slate-300 transition-colors">Projects</Link>
            <span className="text-slate-700">/</span>
            <Link href={`/projects/${ids.projectId}`} className="text-slate-500 hover:text-slate-300 transition-colors">
              {project?.projectIdShort ?? ids.projectId}
            </Link>
            <span className="text-slate-700">/</span>
            <Link href={`/projects/${ids.projectId}/plans`} className="text-slate-500 hover:text-slate-300 transition-colors">Plans</Link>
            <span className="text-slate-700">/</span>
            <span className="text-white">QC Plan — {partLabel}</span>
          </div>

          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-white text-2xl font-bold">{plan.title}</h1>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-slate-500 text-sm font-mono">{plan.revision}</span>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_STYLES[plan.status] ?? STATUS_STYLES.DRAFT}`}>
                  {plan.status}
                </span>
                <span className="text-slate-600 text-xs">{partLabel}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {saved && <span className="text-green-400 text-sm">Saved ✓</span>}
              {plan.status === 'DRAFT' && (
                <button
                  onClick={() => save('SUBMITTED')}
                  className="px-4 py-2 text-sm border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 rounded-xl transition-colors"
                >
                  Mark Submitted
                </button>
              )}
              <button
                onClick={() => save()}
                disabled={saving}
                className="px-5 py-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-slate-900 font-semibold text-sm rounded-xl transition-colors"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          {/* Section tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1 mb-4 scrollbar-hide">
            {SECTIONS.map(s => (
              <button
                key={s.key}
                onClick={() => setActiveSection(s.key)}
                className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                  activeSection === s.key
                    ? 'bg-yellow-500 text-slate-900'
                    : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div>
            {/* Content */}
            <div className="w-full">
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 space-y-6">

                {/* ── Cover ── */}
                {activeSection === 'cover' && (
                  <>
                    <h2 className="text-white text-lg font-bold border-b border-slate-700 pb-4">Cover Page</h2>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="QCM Full Name" value={content.cover.qcmName} onChange={v => updateContent(['cover', 'qcmName'], v)} placeholder="Pebbles Valdez" />
                      <Field label="QCM Title" value={content.cover.qcmTitle} onChange={v => updateContent(['cover', 'qcmTitle'], v)} />
                      <Field label="CQM Cert Number" value={content.cover.qcmCertNumber} onChange={v => updateContent(['cover', 'qcmCertNumber'], v)} placeholder="CQM-XXXXX" />
                      <Field label="Cert Expiry Date" value={content.cover.qcmCertExpiry} onChange={v => updateContent(['cover', 'qcmCertExpiry'], v)} placeholder="YYYY-MM-DD" />
                      <Field label="Alt QCM Full Name" value={content.cover.altQcmName} onChange={v => updateContent(['cover', 'altQcmName'], v)} />
                      <Field label="Alt QCM Title" value={content.cover.altQcmTitle} onChange={v => updateContent(['cover', 'altQcmTitle'], v)} />
                      <Field label="Date Prepared" value={content.cover.preparedDate} onChange={v => updateContent(['cover', 'preparedDate'], v)} placeholder="YYYY-MM-DD" />
                    </div>
                  </>
                )}

                {/* ── Section 1 ── */}
                {activeSection === 'section1' && (
                  <>
                    <h2 className="text-white text-lg font-bold border-b border-slate-700 pb-4">1. Project Overview</h2>
                    <Field label="Project Description" value={content.section1.projectDescription} onChange={v => updateContent(['section1', 'projectDescription'], v)} multiline rows={5} />
                    <Field label="Contract Scope" value={content.section1.contractScope} onChange={v => updateContent(['section1', 'contractScope'], v)} multiline rows={4} placeholder="Describe the scope of work covered by this QC Plan..." />
                    <Field label="Performance Period" value={content.section1.performancePeriod} onChange={v => updateContent(['section1', 'performancePeriod'], v)} />
                  </>
                )}

                {/* ── Section 2 ── */}
                {activeSection === 'section2' && (
                  <>
                    <h2 className="text-white text-lg font-bold border-b border-slate-700 pb-4">2. QC Organization</h2>
                    <Field label="Organization Description" value={content.section2.orgDescription} onChange={v => updateContent(['section2', 'orgDescription'], v)} multiline rows={4} placeholder="Describe the QC organization structure..." />
                    <Field label="QCM Responsibilities" value={content.section2.qcmResponsibilities} onChange={v => updateContent(['section2', 'qcmResponsibilities'], v)} multiline rows={5} />

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-slate-400 text-xs">QC Team Members</label>
                        <button onClick={addTeamMember} className="text-xs text-yellow-500 hover:text-yellow-400 transition-colors">+ Add Member</button>
                      </div>
                      <div className="space-y-3">
                        {content.section2.teamMembers.map((m, i) => (
                          <div key={i} className="bg-slate-900 border border-slate-700 rounded-xl p-4">
                            <div className="grid grid-cols-2 gap-3 mb-3">
                              <Field label="Full Name" value={m.name} onChange={v => updateTeamMember(i, 'name', v)} />
                              <Field label="Title" value={m.title} onChange={v => updateTeamMember(i, 'title', v)} />
                              <Field label="Role" value={m.role} onChange={v => updateTeamMember(i, 'role', v)} placeholder="QCM, Alt QCM, Specialist..." />
                              <Field label="Company" value={m.company} onChange={v => updateTeamMember(i, 'company', v)} />
                            </div>
                            {content.section2.teamMembers.length > 1 && (
                              <button onClick={() => removeTeamMember(i)} className="text-xs text-red-400 hover:text-red-300 transition-colors">Remove</button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* ── Section 3 ── */}
                {activeSection === 'section3' && (
                  <>
                    <h2 className="text-white text-lg font-bold border-b border-slate-700 pb-4">3. Three-Phase Control System</h2>
                    <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 text-yellow-400/80 text-xs mb-4">
                      The three-phase control system is the cornerstone of NAVFAC quality control. All three phases must be completed for each Definable Feature of Work.
                    </div>
                    <Field label="Preparatory Phase" value={content.section3.preparatoryPhase} onChange={v => updateContent(['section3', 'preparatoryPhase'], v)} multiline rows={6} />
                    <Field label="Initial Phase" value={content.section3.initialPhase} onChange={v => updateContent(['section3', 'initialPhase'], v)} multiline rows={6} />
                    <Field label="Follow-up Phase" value={content.section3.followupPhase} onChange={v => updateContent(['section3', 'followupPhase'], v)} multiline rows={5} />
                  </>
                )}

                {/* ── Section 4 ── */}
                {activeSection === 'section4' && (
                  <>
                    <h2 className="text-white text-lg font-bold border-b border-slate-700 pb-4">4. Definable Features of Work</h2>
                    <p className="text-slate-400 text-sm mb-4">List all definable features of work (DFOWs) that require the three-phase control process.</p>
                    <div className="space-y-3">
                      {content.section4.dfows.map((d, i) => (
                        <div key={i} className="bg-slate-900 border border-slate-700 rounded-xl p-4">
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <Field label="Feature Name" value={d.name} onChange={v => updateDFOW(i, 'name', v)} placeholder="e.g. Structural Concrete — Dry Dock Floor" />
                            <Field label="Spec Section" value={d.specSection} onChange={v => updateDFOW(i, 'specSection', v)} placeholder="e.g. 03 31 29" />
                          </div>
                          <Field label="Description" value={d.description} onChange={v => updateDFOW(i, 'description', v)} multiline rows={2} />
                          {content.section4.dfows.length > 1 && (
                            <button onClick={() => removeDFOW(i)} className="text-xs text-red-400 hover:text-red-300 mt-2 transition-colors">Remove</button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button onClick={addDFOW} className="mt-3 text-sm text-yellow-500 hover:text-yellow-400 transition-colors">+ Add DFOW</button>
                  </>
                )}

                {/* ── Section 5 — Testing Plan ── */}
                {activeSection === 'section5' && (
                  <>
                    <h2 className="text-white text-lg font-bold border-b border-slate-700 pb-4">5. Testing Plan</h2>
                    <Field label="General Testing Procedures" value={content.section5.description} onChange={v => updateContent(['section5', 'description'], v)} multiline rows={4} placeholder="Describe general testing procedures, laboratory requirements, and reporting..." />

                    <div>
                      <p className="text-slate-400 text-xs mb-3">Required Tests — pulled from {partLabel} spec requirements</p>
                      {tests.length === 0 ? (
                        <div className="text-slate-500 text-sm text-center py-8 bg-slate-900 rounded-xl border border-slate-700">
                          No test requirements found for {partLabel}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {tests.map(t => (
                            <div key={t.id} className="bg-slate-900 border border-slate-700 rounded-xl p-4">
                              <p className="text-white text-sm font-medium">{t.submittalTitle ?? t.description.split('.')[0]}</p>
                              <p className="text-slate-400 text-xs mt-1 leading-relaxed">{t.description}</p>
                              {(t.testStandard || t.testFrequency || t.acceptanceCriteria) && (
                                <div className="flex gap-4 mt-2 pt-2 border-t border-slate-800">
                                  {t.testStandard && <span className="text-slate-500 text-xs">Standard: <span className="text-slate-300 font-mono">{t.testStandard}</span></span>}
                                  {t.testFrequency && <span className="text-slate-500 text-xs">Freq: <span className="text-slate-300">{t.testFrequency}</span></span>}
                                  {t.acceptanceCriteria && <span className="text-slate-500 text-xs">Accept: <span className="text-slate-300">{t.acceptanceCriteria}</span></span>}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* ── Section 6 — Submittal Procedures ── */}
                {activeSection === 'section6' && (
                  <>
                    <h2 className="text-white text-lg font-bold border-b border-slate-700 pb-4">6. Submittal Procedures</h2>
                    <Field label="Submittal Process Description" value={content.section6.description} onChange={v => updateContent(['section6', 'description'], v)} multiline rows={5} />

                    <div>
                      <p className="text-slate-400 text-xs mb-3">Government-Approve (G) Submittals — {partLabel}</p>
                      {govSubs.length === 0 ? (
                        <div className="text-slate-500 text-sm text-center py-8 bg-slate-900 rounded-xl border border-slate-700">
                          No G-designated submittals found for {partLabel}
                        </div>
                      ) : (
                        <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-slate-700">
                                <th className="text-slate-500 font-medium px-4 py-2 text-xs text-left">Number</th>
                                <th className="text-slate-500 font-medium px-4 py-2 text-xs text-left">SD Code</th>
                                <th className="text-slate-500 font-medium px-4 py-2 text-xs text-left">Title</th>
                                <th className="text-slate-500 font-medium px-4 py-2 text-xs text-left">Section</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                              {govSubs.map(s => (
                                <tr key={s.id}>
                                  <td className="px-4 py-2 text-slate-500 font-mono text-xs">{s.submittalNumber}</td>
                                  <td className="px-4 py-2 text-xs"><span className="bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded font-mono">{s.sdCode}</span></td>
                                  <td className="px-4 py-2 text-white text-xs">{s.title}</td>
                                  <td className="px-4 py-2 text-slate-500 font-mono text-xs">{s.specSection ?? '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* ── Section 7 ── */}
                {activeSection === 'section7' && (
                  <>
                    <h2 className="text-white text-lg font-bold border-b border-slate-700 pb-4">7. Documentation Requirements</h2>
                    <Field label="Daily QC Report Procedure" value={content.section7.dailyReportProcedure} onChange={v => updateContent(['section7', 'dailyReportProcedure'], v)} multiline rows={5} />
                    <Field label="Punch List Procedure" value={content.section7.punchListProcedure} onChange={v => updateContent(['section7', 'punchListProcedure'], v)} multiline rows={4} />
                    <Field label="Non-Conformance Process" value={content.section7.nonconformanceProcess} onChange={v => updateContent(['section7', 'nonconformanceProcess'], v)} multiline rows={5} />
                  </>
                )}

                {/* ── Section 8 ── */}
                {activeSection === 'section8' && (
                  <>
                    <h2 className="text-white text-lg font-bold border-b border-slate-700 pb-4">8. Subcontractor Control</h2>
                    <Field label="Subcontractor Control Procedures" value={content.section8.description} onChange={v => updateContent(['section8', 'description'], v)} multiline rows={5} />

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-slate-400 text-xs">Subcontractors</label>
                        <button onClick={addSub} className="text-xs text-yellow-500 hover:text-yellow-400 transition-colors">+ Add Subcontractor</button>
                      </div>
                      <div className="space-y-3">
                        {content.section8.subcontractors.map((s, i) => (
                          <div key={i} className="bg-slate-900 border border-slate-700 rounded-xl p-4">
                            <div className="grid grid-cols-3 gap-3">
                              <Field label="Company Name" value={s.name} onChange={v => updateSub(i, 'name', v)} />
                              <Field label="Scope of Work" value={s.scope} onChange={v => updateSub(i, 'scope', v)} />
                              <Field label="License / Cert #" value={s.license} onChange={v => updateSub(i, 'license', v)} />
                            </div>
                            {content.section8.subcontractors.length > 1 && (
                              <button onClick={() => removeSub(i)} className="text-xs text-red-400 hover:text-red-300 mt-2 transition-colors">Remove</button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Bottom save */}
                <div className="border-t border-slate-700 pt-6 flex justify-end gap-3">
                  {saved && <span className="text-green-400 text-sm self-center">Saved ✓</span>}
                  <button
                    onClick={() => save()}
                    disabled={saving}
                    className="px-6 py-2.5 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-slate-900 font-semibold text-sm rounded-xl transition-colors"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>

              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}

