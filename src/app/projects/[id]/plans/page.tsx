'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/layout/nav'

interface Plan {
  id: string
  planType: string
  partDesignation: string
  title: string
  revision: string
  status: string
  updatedAt: string
}

const PLAN_ICONS: Record<string, string> = {
  QC_PLAN:          '📋',
  APP:              '🦺',
  EP:               '🌿',
  SWPPP:            '💧',
  DIRT_DUST:        '🏗️',
  WASTE_MANAGEMENT: '♻️',
  SITE_PLAN:        '📐',
  SIOR:             '📊',
  AHA:              '⚠️',
  OTHER:            '📄',
}

const PLAN_LABELS: Record<string, string> = {
  QC_PLAN:          'Quality Control Plan',
  APP:              'Accident Prevention Plan',
  EP:               'Environmental Protection Plan',
  SWPPP:            'Storm Water Pollution Prevention Plan',
  DIRT_DUST:        'Dirt & Dust Control Plan',
  WASTE_MANAGEMENT: 'Waste Management Plan',
  SITE_PLAN:        'Site Plan',
  SIOR:             'SIOR Plan',
  AHA:              'Activity Hazard Analysis',
  OTHER:            'Other Plan',
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT:      'bg-slate-700 text-slate-300',
  SUBMITTED:  'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  APPROVED:   'bg-green-500/10 text-green-400 border border-green-500/20',
  REJECTED:   'bg-red-500/10 text-red-400 border border-red-500/20',
  SUPERSEDED: 'bg-slate-500/10 text-slate-400',
}

const PART_LABELS: Record<string, string> = {
  PART_A: 'Part A (DBB)',
  PART_B: 'Part B (DB)',
  BOTH:   'Both Parts',
  NA:     '',
}

export default function PlansPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [user, setUser] = useState<{ fullName: string; role: string } | null>(null)
  const [project, setProject] = useState<{ id: string; projectName: string; projectIdShort: string | null } | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)

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
          return fetch(`/api/projects/${id}/plans`)
        })
        .then(r => r?.json())
        .then(data => {
          if (data?.plans) setPlans(data.plans)
          setLoading(false)
        })
        .catch(() => router.push('/projects'))
    })
  }, [params, router])

  // Group plans by type
  const grouped = plans.reduce((acc, plan) => {
    if (!acc[plan.planType]) acc[plan.planType] = []
    acc[plan.planType].push(plan)
    return acc
  }, {} as Record<string, Plan[]>)

  const approvedCount = plans.filter(p => p.status === 'APPROVED').length
  const submittedCount = plans.filter(p => p.status === 'SUBMITTED').length
  const draftCount = plans.filter(p => p.status === 'DRAFT').length

  if (!user || loading) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-slate-400 text-sm">Loading...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-900">
      <Nav user={user} />

      <main className="p-8">
        <div className="max-w-5xl mx-auto">

          {/* Breadcrumb */}
          <div className="flex items-center gap-3 mb-6 text-sm">
            <Link href="/projects" className="text-slate-500 hover:text-slate-300 transition-colors">Projects</Link>
            <span className="text-slate-700">/</span>
            <Link href={`/projects/${project?.id}`} className="text-slate-500 hover:text-slate-300 transition-colors">
              {project?.projectIdShort ?? project?.id}
            </Link>
            <span className="text-slate-700">/</span>
            <span className="text-white">Pre-Work Plans</span>
          </div>

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-white text-2xl font-bold">Pre-Work Plans</h1>
              <p className="text-slate-400 text-sm mt-1">{plans.length} plans required before construction</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: 'Approved', value: approvedCount, color: 'text-green-400' },
              { label: 'Submitted', value: submittedCount, color: 'text-blue-400' },
              { label: 'In Draft', value: draftCount, color: 'text-slate-300' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
                <p className={`text-3xl font-bold ${color}`}>{value}</p>
                <p className="text-slate-500 text-sm mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Plans grouped by type */}
          <div className="space-y-3">
            {Object.entries(grouped).map(([type, typePlans]) => (
              <div key={type} className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-700 flex items-center gap-3">
                  <span className="text-xl">{PLAN_ICONS[type] ?? '📄'}</span>
                  <h2 className="text-white font-semibold">{PLAN_LABELS[type] ?? type}</h2>
                </div>
                <div className="divide-y divide-slate-700/50">
                  {typePlans.map(plan => (
                    <Link key={plan.id} href={`/projects/${project?.id}/plans/${plan.id}`}>
                      <div className="flex items-center justify-between px-6 py-4 hover:bg-slate-700/30 transition-colors group">
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="text-white text-sm font-medium group-hover:text-yellow-400 transition-colors">
                              {plan.title}
                            </p>
                            {PART_LABELS[plan.partDesignation] && (
                              <p className="text-slate-500 text-xs mt-0.5">{PART_LABELS[plan.partDesignation]}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-600 text-xs font-mono">{plan.revision}</span>
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_STYLES[plan.status] ?? STATUS_STYLES.DRAFT}`}>
                            {plan.status}
                          </span>
                          <span className="text-slate-600 text-xs">→</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

        </div>
      </main>
    </div>
  )
}
