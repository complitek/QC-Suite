'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/layout/nav'

interface SpecBook {
  id: string
  title: string
  partDesignation: string
}

interface SpecSection {
  id: string
  specBookId: string
  sectionNumber: string
  sectionTitle: string
  partDesignation: string
  aiSummary: string | null
}

interface SpecRequirement {
  id: string
  specSectionId: string
  requirementType: string
  sdCode: string | null
  submittalTitle: string | null
  gcDesignation: string | null
  description: string
  isHoldPoint: boolean
  isWitnessPoint: boolean
  testStandard: string | null
  testFrequency: string | null
  acceptanceCriteria: string | null
  deadlineDays: number | null
}

const REQ_COLORS: Record<string, string> = {
  SUBMITTAL:     'bg-blue-500/10 text-blue-400 border-blue-500/20',
  TEST:          'bg-green-500/10 text-green-400 border-green-500/20',
  HOLD_POINT:    'bg-red-500/10 text-red-400 border-red-500/20',
  WITNESS_POINT: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  PLAN:          'bg-purple-500/10 text-purple-400 border-purple-500/20',
  REPORT:        'bg-teal-500/10 text-teal-400 border-teal-500/20',
  CERTIFICATE:   'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  NOTIFICATION:  'bg-slate-500/10 text-slate-400 border-slate-500/20',
  OTHER:         'bg-slate-500/10 text-slate-400 border-slate-500/20',
}

const PART_COLORS: Record<string, string> = {
  PART_A: 'bg-cyan-500/10 text-cyan-400',
  PART_B: 'bg-violet-500/10 text-violet-400',
  BOTH:   'bg-slate-500/10 text-slate-400',
  NA:     'bg-slate-700/50 text-slate-500',
}

function divisionLabel(sectionNumber: string): string {
  if (sectionNumber.startsWith('SWBS')) return 'SWBS — Caisson'
  const parts = sectionNumber.split(' ')
  if (!parts[0]) return 'Other'
  const div = parseInt(parts[0])
  const labels: Record<number, string> = {
    0: 'Division 00 — Procurement',
    1: 'Division 01 — General Requirements',
    2: 'Division 02 — Existing Conditions',
    3: 'Division 03 — Concrete',
    4: 'Division 04 — Masonry',
    5: 'Division 05 — Metals',
    6: 'Division 06 — Wood, Plastics & Composites',
    7: 'Division 07 — Thermal & Moisture Protection',
    8: 'Division 08 — Openings',
    9: 'Division 09 — Finishes',
    10: 'Division 10 — Specialties',
    12: 'Division 12 — Furnishings',
    13: 'Division 13 — Special Construction',
    21: 'Division 21 — Fire Suppression',
    22: 'Division 22 — Plumbing',
    23: 'Division 23 — HVAC',
    25: 'Division 25 — Integrated Automation',
    26: 'Division 26 — Electrical',
    27: 'Division 27 — Communications',
    28: 'Division 28 — Electronic Safety & Security',
    31: 'Division 31 — Earthwork',
    32: 'Division 32 — Exterior Improvements',
    33: 'Division 33 — Utilities',
    34: 'Division 34 — Transportation',
    35: 'Division 35 — Waterway & Marine Construction',
    40: 'Division 40 — Process Interconnections',
    41: 'Division 41 — Material Processing & Handling',
    43: 'Division 43 — Process Gas & Liquid Handling',
    46: 'Division 46 — Water & Wastewater Equipment',
  }
  return labels[div] ?? `Division ${String(div).padStart(2, '0')}`
}

export default function SpecsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [user, setUser] = useState<{ fullName: string; role: string } | null>(null)
  const [project, setProject] = useState<{ id: string; projectName: string; projectIdShort: string | null } | null>(null)
  const [books, setBooks] = useState<SpecBook[]>([])
  const [sections, setSections] = useState<SpecSection[]>([])
  const [requirements, setRequirements] = useState<SpecRequirement[]>([])
  const [loading, setLoading] = useState(true)

  // UI state
  const [projectId, setProjectId] = useState('')
  const [selectedBookId, setSelectedBookId] = useState<string | 'all'>('all')
  const [selectedSection, setSelectedSection] = useState<SpecSection | null>(null)
  const [search, setSearch] = useState('')
  const [expandedDivisions, setExpandedDivisions] = useState<Set<string>>(new Set())

  // Add submittal modal
  const [addingSubmittal, setAddingSubmittal] = useState(false)
  const [submittalForm, setSubmittalForm] = useState({ title: '', sdCode: 'SD-01', gcDesignation: 'G' })
  const [submittalSaving, setSubmittalSaving] = useState(false)

  useEffect(() => {
    params.then(({ id }) => {
      setProjectId(id)
      fetch('/api/auth/me')
        .then(r => r.json())
        .then(data => {
          if (!data.user) { router.push('/'); return }
          setUser(data.user)
          return fetch(`/api/projects/${id}/specs`)
        })
        .then(r => r?.json())
        .then(data => {
          if (!data?.project) { router.push('/projects'); return }
          setProject(data.project)
          setBooks(data.books)
          setSections(data.sections)
          setRequirements(data.requirements)
          setLoading(false)
        })
        .catch(() => router.push('/projects'))
    })
  }, [params, router])

  // Filtered sections
  const filteredSections = useMemo(() => {
    return sections.filter(s => {
      const matchBook = selectedBookId === 'all' || s.specBookId === selectedBookId
      const matchSearch = !search ||
        s.sectionNumber.toLowerCase().includes(search.toLowerCase()) ||
        s.sectionTitle.toLowerCase().includes(search.toLowerCase())
      return matchBook && matchSearch
    })
  }, [sections, selectedBookId, search])

  // Group by division
  const grouped = useMemo(() => {
    const map = new Map<string, SpecSection[]>()
    for (const s of filteredSections) {
      const div = divisionLabel(s.sectionNumber)
      if (!map.has(div)) map.set(div, [])
      map.get(div)!.push(s)
    }
    return map
  }, [filteredSections])

  function toggleDivision(div: string) {
    setExpandedDivisions(prev => {
      const next = new Set(prev)
      if (next.has(div)) next.delete(div)
      else next.add(div)
      return next
    })
  }

  // Requirements for selected section
  const sectionReqs = useMemo(() => {
    if (!selectedSection) return []
    return requirements.filter(r => r.specSectionId === selectedSection.id)
  }, [selectedSection, requirements])

  async function saveSubmittal() {
    if (!selectedSection || !project) return
    setSubmittalSaving(true)
    try {
      const res = await fetch(`/api/projects/${project.id}/submittals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: submittalForm.title,
          sdCode: submittalForm.sdCode,
          gcDesignation: submittalForm.gcDesignation || null,
          specSection: selectedSection.sectionNumber,
          partDesignation: selectedSection.partDesignation,
        }),
      })
      if (res.ok) {
        setAddingSubmittal(false)
        setSubmittalForm({ title: '', sdCode: 'SD-01', gcDesignation: 'G' })
      }
    } finally {
      setSubmittalSaving(false)
    }
  }

  if (!user || loading) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-slate-400 text-sm">Loading...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-900">
      <Nav user={user} />

      <main className="p-8">
        <div className="max-w-7xl mx-auto">

          {/* Breadcrumb */}
          <div className="flex items-center gap-3 mb-6 text-sm">
            <Link href="/projects" className="text-slate-500 hover:text-slate-300 transition-colors">Projects</Link>
            <span className="text-slate-700">/</span>
            <Link href={`/projects/${project?.id}`} className="text-slate-500 hover:text-slate-300 transition-colors">
              {project?.projectIdShort ?? project?.id}
            </Link>
            <span className="text-slate-700">/</span>
            <span className="text-white">Spec Sections</span>
          </div>

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-white text-2xl font-bold">Spec Sections</h1>
              <p className="text-slate-400 text-sm mt-1">{sections.length} sections · {requirements.length} requirements</p>
            </div>
            <Link
              href={`/projects/${projectId}/specs/upload`}
              className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors"
            >
              + Upload Spec Book
            </Link>
          </div>

          <div className="flex gap-6">

            {/* Left panel — section browser */}
            <div className="w-96 shrink-0 space-y-3">

              {/* Search */}
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search sections..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-yellow-500/50"
              />

              {/* Book filter */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setSelectedBookId('all')}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${selectedBookId === 'all' ? 'bg-yellow-500 text-slate-900' : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'}`}
                >
                  All ({sections.length})
                </button>
                {books.map(b => (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBookId(b.id)}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${selectedBookId === b.id ? 'bg-yellow-500 text-slate-900' : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'}`}
                  >
                    {b.partDesignation === 'BOTH' ? 'General' : b.partDesignation === 'PART_A' ? 'Part A' : 'Part B'}
                    {' '}({sections.filter(s => s.specBookId === b.id).length})
                  </button>
                ))}
              </div>

              {/* Division groups */}
              <div className="space-y-1 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                {grouped.size === 0 ? (
                  <div className="text-slate-500 text-sm text-center py-8">No sections match</div>
                ) : (
                  Array.from(grouped.entries()).map(([div, secs]) => (
                    <div key={div}>
                      <button
                        onClick={() => toggleDivision(div)}
                        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-800 rounded-lg transition-colors group"
                      >
                        <span className="text-slate-400 text-xs font-semibold uppercase tracking-wide group-hover:text-slate-200 transition-colors">
                          {div}
                        </span>
                        <span className="text-slate-600 text-xs">{expandedDivisions.has(div) ? '▲' : '▼'} {secs.length}</span>
                      </button>

                      {expandedDivisions.has(div) && (
                        <div className="ml-2 space-y-0.5">
                          {secs.map(s => (
                            <button
                              key={s.id}
                              onClick={() => setSelectedSection(s)}
                              className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                                selectedSection?.id === s.id
                                  ? 'bg-yellow-500/10 border border-yellow-500/30'
                                  : 'hover:bg-slate-800 border border-transparent'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-slate-500 text-xs font-mono shrink-0">{s.sectionNumber}</span>
                                <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${PART_COLORS[s.partDesignation]}`}>
                                  {s.partDesignation === 'BOTH' ? 'GEN' : s.partDesignation === 'PART_A' ? 'A' : s.partDesignation === 'PART_B' ? 'B' : '—'}
                                </span>
                              </div>
                              <p className={`text-xs mt-0.5 leading-tight ${selectedSection?.id === s.id ? 'text-yellow-400' : 'text-slate-300'}`}>
                                {s.sectionTitle}
                              </p>
                              {requirements.filter(r => r.specSectionId === s.id).length > 0 && (
                                <p className="text-slate-600 text-xs mt-1">
                                  {requirements.filter(r => r.specSectionId === s.id).length} req{requirements.filter(r => r.specSectionId === s.id).length !== 1 ? 's' : ''}
                                </p>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right panel — section detail */}
            <div className="flex-1 min-w-0">
              {!selectedSection ? (
                <div className="bg-slate-800 border border-slate-700 rounded-2xl p-16 text-center">
                  <p className="text-4xl mb-4">📋</p>
                  <p className="text-white font-semibold mb-1">Select a section</p>
                  <p className="text-slate-500 text-sm">Click any section in the left panel to view its summary and requirements.</p>
                  <p className="text-slate-600 text-xs mt-6">Tip: click a division name to expand it</p>
                </div>
              ) : (
                <div className="space-y-4">

                  {/* Section header */}
                  <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="text-slate-500 font-mono text-sm">{selectedSection.sectionNumber}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PART_COLORS[selectedSection.partDesignation]}`}>
                            {selectedSection.partDesignation === 'BOTH' ? 'General' : selectedSection.partDesignation === 'PART_A' ? 'Part A (DBB)' : selectedSection.partDesignation === 'PART_B' ? 'Part B (DB)' : '—'}
                          </span>
                        </div>
                        <h2 className="text-white text-xl font-bold">{selectedSection.sectionTitle}</h2>
                      </div>
                      <div className="flex items-start gap-3 shrink-0">
                        <button
                          onClick={() => setAddingSubmittal(true)}
                          className="text-xs bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-semibold px-3 py-1.5 rounded-lg transition-colors"
                        >
                          + Add Submittal
                        </button>
                        <div className="text-right">
                          <p className="text-yellow-500 font-bold text-lg">{sectionReqs.length}</p>
                          <p className="text-slate-500 text-xs">requirements</p>
                        </div>
                      </div>
                    </div>

                    {selectedSection.aiSummary && (
                      <p className="text-slate-300 text-sm leading-relaxed border-t border-slate-700 pt-4">
                        {selectedSection.aiSummary}
                      </p>
                    )}
                  </div>

                  {/* Requirements */}
                  {sectionReqs.length === 0 ? (
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center">
                      <p className="text-slate-500 text-sm">No requirements extracted for this section.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider px-1">Requirements</h3>
                      {sectionReqs.map(req => (
                        <div key={req.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${REQ_COLORS[req.requirementType] ?? REQ_COLORS.OTHER}`}>
                                {req.requirementType.replace('_', ' ')}
                              </span>
                              {req.sdCode && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-mono">
                                  {req.sdCode}
                                </span>
                              )}
                              {req.gcDesignation && (
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${req.gcDesignation === 'G' ? 'bg-red-500/10 text-red-400' : 'bg-slate-700 text-slate-400'}`}>
                                  {req.gcDesignation === 'G' ? 'Gov Approve' : 'Contractor'}
                                </span>
                              )}
                              {req.isHoldPoint && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-medium">
                                  HOLD POINT
                                </span>
                              )}
                              {req.isWitnessPoint && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 font-medium">
                                  WITNESS
                                </span>
                              )}
                            </div>
                            {req.deadlineDays && (
                              <span className="text-slate-500 text-xs shrink-0">{req.deadlineDays}d prior</span>
                            )}
                          </div>

                          <p className="text-white text-sm font-medium mb-1">
                            {req.submittalTitle ?? req.description.split('.')[0]}
                          </p>
                          <p className="text-slate-400 text-sm leading-relaxed">{req.description}</p>

                          {(req.testStandard || req.testFrequency || req.acceptanceCriteria) && (
                            <div className="mt-3 pt-3 border-t border-slate-700 grid grid-cols-1 md:grid-cols-3 gap-2">
                              {req.testStandard && (
                                <div>
                                  <p className="text-slate-600 text-xs">Standard</p>
                                  <p className="text-slate-300 text-xs font-mono">{req.testStandard}</p>
                                </div>
                              )}
                              {req.testFrequency && (
                                <div>
                                  <p className="text-slate-600 text-xs">Frequency</p>
                                  <p className="text-slate-300 text-xs">{req.testFrequency}</p>
                                </div>
                              )}
                              {req.acceptanceCriteria && (
                                <div>
                                  <p className="text-slate-600 text-xs">Acceptance</p>
                                  <p className="text-slate-300 text-xs">{req.acceptanceCriteria}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      </main>

      {/* Add Submittal Modal */}
      {addingSubmittal && selectedSection && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setAddingSubmittal(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-white font-bold">Add Submittal</h2>
              <button onClick={() => setAddingSubmittal(false)} className="text-slate-500 hover:text-white text-xl leading-none">×</button>
            </div>

            <div className="bg-slate-800 rounded-xl px-4 py-3">
              <p className="text-slate-500 text-xs">Section</p>
              <p className="text-white text-sm font-mono mt-0.5">{selectedSection.sectionNumber} — {selectedSection.sectionTitle}</p>
            </div>

            <div>
              <label className="text-slate-400 text-xs block mb-1">Submittal Title *</label>
              <input
                autoFocus
                value={submittalForm.title}
                onChange={e => setSubmittalForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Concrete Mix Design"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 text-xs block mb-1">SD Code</label>
                <select
                  value={submittalForm.sdCode}
                  onChange={e => setSubmittalForm(f => ({ ...f, sdCode: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500/50"
                >
                  {['SD-01','SD-02','SD-03','SD-04','SD-05','SD-06','SD-07','SD-08','SD-10','SD-11'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-slate-400 text-xs block mb-1">G/C Designation</label>
                <select
                  value={submittalForm.gcDesignation}
                  onChange={e => setSubmittalForm(f => ({ ...f, gcDesignation: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500/50"
                >
                  <option value="G">G — Government Approve</option>
                  <option value="C">C — Contractor</option>
                  <option value="">—</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setAddingSubmittal(false)}
                className="flex-1 py-2.5 text-slate-400 hover:text-white border border-slate-700 rounded-xl text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveSubmittal}
                disabled={submittalSaving || !submittalForm.title.trim()}
                className="flex-1 py-2.5 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-slate-900 font-semibold text-sm rounded-xl transition-colors"
              >
                {submittalSaving ? 'Adding...' : 'Add to Register'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
