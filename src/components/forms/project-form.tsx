'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ProjectFormProps {
  initial?: {
    id?: string
    contractNumber?: string
    projectName?: string
    projectIdShort?: string
    agency?: string
    contractType?: string
    isHybrid?: boolean
    primeContractor?: string
    location?: string
    state?: string
    awardDate?: string
    completionDate?: string
    contractValue?: number | null
    complexityTier?: string
    status?: string
    description?: string
  }
  mode: 'create' | 'edit'
}

const AGENCIES = ['NAVFAC', 'USACE', 'ANG', 'OTHER']
const CONTRACT_TYPES = ['DBB', 'DB', 'HYBRID', 'IDIQ', 'MACC']
const TIERS = ['TIER1', 'TIER2', 'TIER3']
const STATUSES = ['ACTIVE', 'CLOSEOUT', 'COMPLETE']

export default function ProjectForm({ initial = {}, mode }: ProjectFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    contractNumber: initial.contractNumber ?? '',
    projectName: initial.projectName ?? '',
    projectIdShort: initial.projectIdShort ?? '',
    agency: initial.agency ?? 'NAVFAC',
    contractType: initial.contractType ?? 'DBB',
    isHybrid: initial.isHybrid ?? false,
    primeContractor: initial.primeContractor ?? '',
    location: initial.location ?? '',
    state: initial.state ?? '',
    awardDate: initial.awardDate ?? '',
    completionDate: initial.completionDate ?? '',
    contractValue: initial.contractValue?.toString() ?? '',
    complexityTier: initial.complexityTier ?? 'TIER1',
    status: initial.status ?? 'ACTIVE',
    description: initial.description ?? '',
  })

  function set(field: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const url = mode === 'create' ? '/api/projects' : `/api/projects/${initial.id}`
      const method = mode === 'create' ? 'POST' : 'PUT'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save project')

      router.push(`/projects/${data.project.id}`)
    } catch (err: any) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Contract Info */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 space-y-4">
        <h2 className="text-white font-semibold">Contract Information</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-slate-400 text-sm block mb-1">Contract Number *</label>
            <input
              required
              value={form.contractNumber}
              onChange={e => set('contractNumber', e.target.value)}
              placeholder="N62742-24-C-0001"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500/50"
            />
          </div>
          <div>
            <label className="text-slate-400 text-sm block mb-1">Short ID</label>
            <input
              value={form.projectIdShort}
              onChange={e => set('projectIdShort', e.target.value)}
              placeholder="NSN-DD1"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500/50"
            />
          </div>
        </div>

        <div>
          <label className="text-slate-400 text-sm block mb-1">Project Name *</label>
          <input
            required
            value={form.projectName}
            onChange={e => set('projectName', e.target.value)}
            placeholder="New Dry Dock 1 Construction"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500/50"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-slate-400 text-sm block mb-1">Agency *</label>
            <select
              required
              value={form.agency}
              onChange={e => set('agency', e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500/50"
            >
              {AGENCIES.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="text-slate-400 text-sm block mb-1">Contract Type *</label>
            <select
              required
              value={form.contractType}
              onChange={e => set('contractType', e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500/50"
            >
              {CONTRACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-slate-400 text-sm block mb-1">Complexity</label>
            <select
              value={form.complexityTier}
              onChange={e => set('complexityTier', e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500/50"
            >
              {TIERS.map(t => <option key={t} value={t}>{t.replace('TIER', 'Tier ')}</option>)}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="isHybrid"
            checked={form.isHybrid}
            onChange={e => set('isHybrid', e.target.checked)}
            className="w-4 h-4 accent-yellow-500"
          />
          <label htmlFor="isHybrid" className="text-slate-300 text-sm">
            Hybrid contract (Part A DBB + Part B DB)
          </label>
        </div>
      </div>

      {/* Project Details */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 space-y-4">
        <h2 className="text-white font-semibold">Project Details</h2>

        <div>
          <label className="text-slate-400 text-sm block mb-1">Prime Contractor</label>
          <input
            value={form.primeContractor}
            onChange={e => set('primeContractor', e.target.value)}
            placeholder="Contractor Name JV"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500/50"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-slate-400 text-sm block mb-1">Location</label>
            <input
              value={form.location}
              onChange={e => set('location', e.target.value)}
              placeholder="Pearl Harbor, HI"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500/50"
            />
          </div>
          <div>
            <label className="text-slate-400 text-sm block mb-1">State</label>
            <input
              value={form.state}
              onChange={e => set('state', e.target.value.toUpperCase().slice(0, 2))}
              placeholder="HI"
              maxLength={2}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500/50"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-slate-400 text-sm block mb-1">Award Date</label>
            <input
              type="date"
              value={form.awardDate}
              onChange={e => set('awardDate', e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500/50"
            />
          </div>
          <div>
            <label className="text-slate-400 text-sm block mb-1">Completion Date</label>
            <input
              type="date"
              value={form.completionDate}
              onChange={e => set('completionDate', e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500/50"
            />
          </div>
          <div>
            <label className="text-slate-400 text-sm block mb-1">Contract Value ($)</label>
            <input
              type="number"
              value={form.contractValue}
              onChange={e => set('contractValue', e.target.value)}
              placeholder="0"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500/50"
            />
          </div>
        </div>

        {mode === 'edit' && (
          <div>
            <label className="text-slate-400 text-sm block mb-1">Status</label>
            <select
              value={form.status}
              onChange={e => set('status', e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500/50"
            >
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="text-slate-400 text-sm block mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={e => set('description', e.target.value)}
            rows={3}
            placeholder="Brief project description..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500/50 resize-none"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2.5 text-slate-400 hover:text-white text-sm transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-slate-900 font-semibold text-sm rounded-xl transition-colors"
        >
          {saving ? 'Saving...' : mode === 'create' ? 'Create Project' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}
