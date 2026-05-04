'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/layout/nav'

interface Submittal {
  id: string
  submittalNumber: string
  sdCode: string
  title: string
  partDesignation: string
  gcDesignation: string | null
  specSection: string | null
  status: string
  requiredDate: string | null
  submittedDate: string | null
  returnedDate: string | null
  approvedDate: string | null
  coActionCode: string | null
  notes: string | null
}

const SD_LABELS: Record<string, string> = {
  'SD-01': 'SD-01 Preconstruction',
  'SD-02': 'SD-02 Shop Drawings',
  'SD-03': 'SD-03 Product Data',
  'SD-04': 'SD-04 Samples',
  'SD-05': 'SD-05 Design Data',
  'SD-06': 'SD-06 Test Reports',
  'SD-07': 'SD-07 Certificates',
  'SD-08': 'SD-08 Mfr Instructions',
  'SD-10': 'SD-10 O&M Data',
  'SD-11': 'SD-11 Closeout',
}

const STATUS_STYLES: Record<string, string> = {
  PENDING:   'bg-slate-700 text-slate-300',
  SUBMITTED: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  APPROVED:  'bg-green-500/10 text-green-400 border border-green-500/20',
  REJECTED:  'bg-red-500/10 text-red-400 border border-red-500/20',
  RESUBMIT:  'bg-orange-500/10 text-orange-400 border border-orange-500/20',
}

const PART_LABELS: Record<string, string> = {
  PART_A: 'Part A',
  PART_B: 'Part B',
  BOTH: 'Both',
  NA: '—',
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function SubmittalsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [user, setUser] = useState<{ fullName: string; role: string } | null>(null)
  const [project, setProject] = useState<{ id: string; projectName: string; projectIdShort: string | null } | null>(null)
  const [submittals, setSubmittals] = useState<Submittal[]>([])
  const [loading, setLoading] = useState(true)
  const [generated, setGenerated] = useState(false)

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [sdFilter, setSdFilter] = useState<string>('ALL')
  const [gcFilter, setGcFilter] = useState<string>('ALL')
  const [partFilter, setPartFilter] = useState<string>('ALL')
  const [search, setSearch] = useState('')

  // Edit drawer
  const [editing, setEditing] = useState<Submittal | null>(null)
  const [saving, setSaving] = useState(false)

  // Add submittal modal
  const [adding, setAdding] = useState(false)
  const [addForm, setAddForm] = useState({ title: '', sdCode: 'SD-01', gcDesignation: 'G', specSection: '', partDesignation: 'BOTH' })
  const [addSaving, setAddSaving] = useState(false)

  useEffect(() => {
    params.then(({ id }) => {
      fetch('/api/auth/me')
        .then(r => r.json())
        .then(data => {
          if (!data.user) { router.push('/'); return }
          setUser(data.user)
          return fetch(`/api/projects/${id}`)
        })
        .then(r => r?.json())
        .then(data => {
          if (!data?.project) { router.push('/projects'); return }
          setProject(data.project)
          return fetch(`/api/projects/${id}/submittals`)
        })
        .then(r => r?.json())
        .then(data => {
          if (data?.submittals) {
            setSubmittals(data.submittals)
            if (data.generated) setGenerated(true)
          }
          setLoading(false)
        })
        .catch(() => router.push('/projects'))
    })
  }, [params, router])

  const filtered = useMemo(() => {
    return submittals.filter(s => {
      if (statusFilter !== 'ALL' && s.status !== statusFilter) return false
      if (sdFilter !== 'ALL' && s.sdCode !== sdFilter) return false
      if (gcFilter !== 'ALL' && s.gcDesignation !== gcFilter) return false
      if (partFilter !== 'ALL' && s.partDesignation !== partFilter) return false
      if (search && !s.title.toLowerCase().includes(search.toLowerCase()) &&
          !s.submittalNumber.toLowerCase().includes(search.toLowerCase()) &&
          !(s.specSection ?? '').includes(search)) return false
      return true
    })
  }, [submittals, statusFilter, sdFilter, gcFilter, partFilter, search])

  const counts = useMemo(() => ({
    total: submittals.length,
    pending: submittals.filter(s => s.status === 'PENDING').length,
    submitted: submittals.filter(s => s.status === 'SUBMITTED').length,
    approved: submittals.filter(s => s.status === 'APPROVED').length,
    rejected: submittals.filter(s => s.status === 'REJECTED' || s.status === 'RESUBMIT').length,
    govApprove: submittals.filter(s => s.gcDesignation === 'G').length,
  }), [submittals])

  const sdCodes = useMemo(() => [...new Set(submittals.map(s => s.sdCode))].sort(), [submittals])

  async function saveAdd() {
    if (!project) return
    setAddSaving(true)
    try {
      const res = await fetch(`/api/projects/${project.id}/submittals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      })
      const data = await res.json()
      if (res.ok) {
        setSubmittals(prev => [...prev, data.submittal])
        setAdding(false)
        setAddForm({ title: '', sdCode: 'SD-01', gcDesignation: 'G', specSection: '', partDesignation: 'BOTH' })
      }
    } finally {
      setAddSaving(false)
    }
  }

  async function saveEdit() {
    if (!editing || !project) return
    setSaving(true)
    try {
      const res = await fetch(`/api/projects/${project.id}/submittals/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing),
      })
      const data = await res.json()
      if (res.ok) {
        setSubmittals(prev => prev.map(s => s.id === editing.id ? data.submittal : s))
        setEditing(null)
      }
    } finally {
      setSaving(false)
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
            <span className="text-white">Submittal Register</span>
          </div>

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-white text-2xl font-bold">Submittal Register</h1>
              {generated && (
                <p className="text-yellow-500/80 text-xs mt-1">Auto-generated from spec requirements — review and update as needed</p>
              )}
            </div>
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors"
            >
              + Add Submittal
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
            {[
              { label: 'Total', value: counts.total, color: 'text-white' },
              { label: 'Pending', value: counts.pending, color: 'text-slate-400' },
              { label: 'Submitted', value: counts.submitted, color: 'text-blue-400' },
              { label: 'Approved', value: counts.approved, color: 'text-green-400' },
              { label: 'Action Req', value: counts.rejected, color: 'text-orange-400' },
              { label: 'Gov Approve', value: counts.govApprove, color: 'text-red-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-slate-500 text-xs mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-4 flex flex-wrap gap-3 items-center">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search submittals..."
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-yellow-500/50 w-56"
            />

            {[
              { label: 'Status', value: statusFilter, set: setStatusFilter, opts: ['ALL', 'PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED', 'RESUBMIT'] },
              { label: 'SD Code', value: sdFilter, set: setSdFilter, opts: ['ALL', ...sdCodes] },
              { label: 'G/C', value: gcFilter, set: setGcFilter, opts: ['ALL', 'G', 'C'] },
              { label: 'Part', value: partFilter, set: setPartFilter, opts: ['ALL', 'PART_A', 'PART_B', 'BOTH'] },
            ].map(({ label, value, set, opts }) => (
              <select
                key={label}
                value={value}
                onChange={e => set(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500/50"
              >
                {opts.map(o => <option key={o} value={o}>{o === 'ALL' ? `All ${label}s` : o}</option>)}
              </select>
            ))}

            <span className="text-slate-500 text-sm ml-auto">{filtered.length} of {submittals.length}</span>
          </div>

          {/* Table */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-left">
                    <th className="text-slate-500 font-medium px-4 py-3 text-xs uppercase tracking-wider">#</th>
                    <th className="text-slate-500 font-medium px-4 py-3 text-xs uppercase tracking-wider">SD</th>
                    <th className="text-slate-500 font-medium px-4 py-3 text-xs uppercase tracking-wider w-16">G/C</th>
                    <th className="text-slate-500 font-medium px-4 py-3 text-xs uppercase tracking-wider">Title</th>
                    <th className="text-slate-500 font-medium px-4 py-3 text-xs uppercase tracking-wider">Section</th>
                    <th className="text-slate-500 font-medium px-4 py-3 text-xs uppercase tracking-wider">Part</th>
                    <th className="text-slate-500 font-medium px-4 py-3 text-xs uppercase tracking-wider">Status</th>
                    <th className="text-slate-500 font-medium px-4 py-3 text-xs uppercase tracking-wider">Required</th>
                    <th className="text-slate-500 font-medium px-4 py-3 text-xs uppercase tracking-wider">Submitted</th>
                    <th className="text-slate-500 font-medium px-4 py-3 text-xs uppercase tracking-wider">Approved</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-12 text-slate-500">No submittals match your filters</td>
                    </tr>
                  ) : (
                    filtered.map(s => (
                      <tr
                        key={s.id}
                        onClick={() => setEditing({ ...s })}
                        className="hover:bg-slate-700/30 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 text-slate-500 font-mono text-xs whitespace-nowrap">{s.submittalNumber}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded font-mono whitespace-nowrap">
                            {s.sdCode}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {s.gcDesignation && (
                            <span className={`text-xs px-2 py-0.5 rounded font-bold ${s.gcDesignation === 'G' ? 'bg-red-500/10 text-red-400' : 'bg-slate-700 text-slate-400'}`}>
                              {s.gcDesignation}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-white max-w-xs">
                          <p className="truncate">{s.title}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-500 font-mono text-xs whitespace-nowrap">{s.specSection ?? '—'}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{PART_LABELS[s.partDesignation] ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${STATUS_STYLES[s.status] ?? STATUS_STYLES.PENDING}`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{formatDate(s.requiredDate)}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{formatDate(s.submittedDate)}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{formatDate(s.approvedDate)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Edit drawer */}
      {editing && (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-end" onClick={() => setEditing(null)}>
          <div className="bg-slate-900 border-l border-slate-700 w-full max-w-lg h-full overflow-y-auto p-6 space-y-5"
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between">
              <h2 className="text-white font-bold">Edit Submittal</h2>
              <button onClick={() => setEditing(null)} className="text-slate-500 hover:text-white text-xl leading-none">×</button>
            </div>

            <div>
              <p className="text-slate-500 text-xs mb-1">Submittal #</p>
              <p className="text-slate-300 text-sm font-mono">{editing.submittalNumber}</p>
            </div>

            <div>
              <label className="text-slate-400 text-xs block mb-1">Title</label>
              <input
                value={editing.title}
                onChange={e => setEditing({ ...editing, title: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 text-xs block mb-1">SD Code</label>
                <select
                  value={editing.sdCode}
                  onChange={e => setEditing({ ...editing, sdCode: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500/50"
                >
                  {Object.entries(SD_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-slate-400 text-xs block mb-1">G/C</label>
                <select
                  value={editing.gcDesignation ?? ''}
                  onChange={e => setEditing({ ...editing, gcDesignation: e.target.value || null })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500/50"
                >
                  <option value="">—</option>
                  <option value="G">G — Government Approve</option>
                  <option value="C">C — Contractor</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 text-xs block mb-1">Part</label>
                <select
                  value={editing.partDesignation}
                  onChange={e => setEditing({ ...editing, partDesignation: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500/50"
                >
                  <option value="PART_A">Part A (DBB)</option>
                  <option value="PART_B">Part B (DB)</option>
                  <option value="BOTH">Both</option>
                  <option value="NA">N/A</option>
                </select>
              </div>
              <div>
                <label className="text-slate-400 text-xs block mb-1">Status</label>
                <select
                  value={editing.status}
                  onChange={e => setEditing({ ...editing, status: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500/50"
                >
                  <option value="PENDING">Pending</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="RESUBMIT">Resubmit Required</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-slate-400 text-xs block mb-1">CO Action Code</label>
              <select
                value={editing.coActionCode ?? ''}
                onChange={e => setEditing({ ...editing, coActionCode: e.target.value || null })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500/50"
              >
                <option value="">—</option>
                <option value="A">A — Approved</option>
                <option value="B">B — Approved as Noted</option>
                <option value="C">C — Revise & Resubmit</option>
                <option value="D">D — Rejected</option>
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Required Date', field: 'requiredDate' },
                { label: 'Submitted Date', field: 'submittedDate' },
                { label: 'Approved Date', field: 'approvedDate' },
              ].map(({ label, field }) => (
                <div key={field}>
                  <label className="text-slate-400 text-xs block mb-1">{label}</label>
                  <input
                    type="date"
                    value={(editing as any)[field] ?? ''}
                    onChange={e => setEditing({ ...editing, [field]: e.target.value || null } as Submittal)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-yellow-500/50"
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="text-slate-400 text-xs block mb-1">Notes</label>
              <textarea
                value={editing.notes ?? ''}
                onChange={e => setEditing({ ...editing, notes: e.target.value || null })}
                rows={3}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500/50 resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setEditing(null)}
                className="flex-1 py-2.5 text-slate-400 hover:text-white border border-slate-700 rounded-xl text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="flex-1 py-2.5 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-slate-900 font-semibold text-sm rounded-xl transition-colors"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Submittal Modal */}
      {adding && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setAdding(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-white font-bold">Add Submittal</h2>
              <button onClick={() => setAdding(false)} className="text-slate-500 hover:text-white text-xl leading-none">×</button>
            </div>

            <div>
              <label className="text-slate-400 text-xs block mb-1">Submittal Title *</label>
              <input
                autoFocus
                value={addForm.title}
                onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Concrete Mix Design"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500/50"
              />
            </div>

            <div>
              <label className="text-slate-400 text-xs block mb-1">Spec Section</label>
              <input
                value={addForm.specSection}
                onChange={e => setAddForm(f => ({ ...f, specSection: e.target.value }))}
                placeholder="e.g. 03 30 00"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 text-xs block mb-1">SD Code</label>
                <select
                  value={addForm.sdCode}
                  onChange={e => setAddForm(f => ({ ...f, sdCode: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500/50"
                >
                  {Object.entries(SD_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-slate-400 text-xs block mb-1">G/C</label>
                <select
                  value={addForm.gcDesignation}
                  onChange={e => setAddForm(f => ({ ...f, gcDesignation: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500/50"
                >
                  <option value="G">G — Government Approve</option>
                  <option value="C">C — Contractor</option>
                  <option value="">—</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-slate-400 text-xs block mb-1">Part</label>
              <select
                value={addForm.partDesignation}
                onChange={e => setAddForm(f => ({ ...f, partDesignation: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500/50"
              >
                <option value="BOTH">Both (General)</option>
                <option value="PART_A">Part A (DBB)</option>
                <option value="PART_B">Part B (DB)</option>
                <option value="NA">N/A</option>
              </select>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setAdding(false)}
                className="flex-1 py-2.5 text-slate-400 hover:text-white border border-slate-700 rounded-xl text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveAdd}
                disabled={addSaving || !addForm.title.trim()}
                className="flex-1 py-2.5 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-slate-900 font-semibold text-sm rounded-xl transition-colors"
              >
                {addSaving ? 'Adding...' : 'Add to Register'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
