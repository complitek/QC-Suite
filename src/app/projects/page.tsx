'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/layout/nav'

interface Project {
  id: string
  contractNumber: string
  projectName: string
  projectIdShort: string | null
  agency: string
  contractType: string
  isHybrid: boolean
  primeContractor: string | null
  location: string | null
  state: string | null
  complexityTier: string
  status: string
  contractValue: number | null
  awardDate: string | null
  completionDate: string | null
}

const AGENCY_COLORS: Record<string, string> = {
  NAVFAC: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  USACE: 'bg-green-500/10 text-green-400 border-green-500/20',
  ANG: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  OTHER: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-500/10 text-green-400',
  CLOSEOUT: 'bg-yellow-500/10 text-yellow-400',
  COMPLETE: 'bg-slate-500/10 text-slate-400',
}

function formatCurrency(val: number | null) {
  if (!val) return '—'
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(0)}M`
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`
  return `$${val}`
}

export default function ProjectsPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ fullName: string; role: string } | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (!data.user) { router.push('/'); return }
        setUser(data.user)
        return fetch('/api/projects')
      })
      .then(r => r?.json())
      .then(data => {
        if (data?.projects) setProjects(data.projects)
        setLoading(false)
      })
      .catch(() => router.push('/'))
  }, [router])

  if (!user) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-slate-400 text-sm">Loading...</div>
    </div>
  )

  const active = projects.filter(p => p.status === 'ACTIVE')
  const other = projects.filter(p => p.status !== 'ACTIVE')

  return (
    <div className="min-h-screen bg-slate-900">
      <Nav user={user} />

      <main className="p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-white text-2xl font-bold">Projects</h1>
              <p className="text-slate-400 text-sm mt-1">
                {projects.length} project{projects.length !== 1 ? 's' : ''} total
              </p>
            </div>
            <Link
              href="/projects/new"
              className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors"
            >
              <span>+</span> New Project
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-20 text-slate-500">Loading projects...</div>
          ) : projects.length === 0 ? (
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-16 text-center">
              <p className="text-4xl mb-4">🏗️</p>
              <p className="text-white font-semibold mb-1">No projects yet</p>
              <p className="text-slate-400 text-sm mb-6">Create your first federal construction project to get started.</p>
              <Link
                href="/projects/new"
                className="inline-flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors"
              >
                + New Project
              </Link>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Active projects */}
              {active.length > 0 && (
                <section>
                  <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">
                    Active ({active.length})
                  </h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {active.map(p => <ProjectCard key={p.id} project={p} />)}
                  </div>
                </section>
              )}

              {/* Closeout / Complete */}
              {other.length > 0 && (
                <section>
                  <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">
                    Other ({other.length})
                  </h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {other.map(p => <ProjectCard key={p.id} project={p} />)}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function ProjectCard({ project: p }: { project: Project }) {
  return (
    <Link href={`/projects/${p.id}`}>
      <div className="bg-slate-800 border border-slate-700 hover:border-yellow-500/40 rounded-2xl p-6 transition-colors cursor-pointer group">
        {/* Top row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${AGENCY_COLORS[p.agency] ?? AGENCY_COLORS.OTHER}`}>
              {p.agency}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[p.status] ?? STATUS_COLORS.ACTIVE}`}>
              {p.status}
            </span>
            {p.isHybrid && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500 font-medium">
                HYBRID
              </span>
            )}
          </div>
          <span className="text-slate-500 text-xs">{p.complexityTier.replace('TIER', 'T')}</span>
        </div>

        {/* Name */}
        <h3 className="text-white font-semibold group-hover:text-yellow-400 transition-colors leading-tight mb-1">
          {p.projectName}
        </h3>
        <p className="text-slate-500 text-xs mb-4 font-mono">{p.contractNumber}</p>

        {/* Details */}
        <div className="flex items-center gap-4 text-sm text-slate-400">
          {p.primeContractor && (
            <span className="truncate">{p.primeContractor}</span>
          )}
          {p.location && (
            <span className="text-slate-500 shrink-0">{p.location}</span>
          )}
        </div>

        {/* Bottom row */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700">
          <span className="text-slate-500 text-xs">
            {p.contractType}{p.isHybrid ? ' (A+B)' : ''}
          </span>
          <span className="text-yellow-500 text-sm font-semibold">
            {formatCurrency(p.contractValue)}
          </span>
        </div>
      </div>
    </Link>
  )
}
