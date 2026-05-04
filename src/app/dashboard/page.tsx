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
  complexityTier: string
  status: string
  contractValue: number | null
  location: string | null
  primeContractor: string | null
}

const AGENCY_COLORS: Record<string, string> = {
  NAVFAC: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  USACE: 'bg-green-500/10 text-green-400 border-green-500/20',
  ANG: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  OTHER: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
}

function formatCurrency(val: number | null) {
  if (!val) return '—'
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(0)}M`
  return `$${(val / 1_000).toFixed(0)}K`
}

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<{ fullName: string; role: string } | null>(null)
  const [projects, setProjects] = useState<Project[]>([])

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (!data.user) { router.push('/'); return }
        setUser(data.user)
        return fetch('/api/projects')
      })
      .then(r => r?.json())
      .then(data => { if (data?.projects) setProjects(data.projects) })
      .catch(() => router.push('/'))
  }, [router])

  if (!user) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-slate-400 text-sm">Loading...</div>
    </div>
  )

  const active = projects.filter(p => p.status === 'ACTIVE')

  return (
    <div className="min-h-screen bg-slate-900">
      <Nav user={user} />

      <main className="p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-white text-2xl font-bold mb-1">Dashboard</h1>
          <p className="text-slate-400 mb-8">Welcome back, {user.fullName.split(' ')[0]}.</p>

          {/* Quick actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Link href="/projects/new">
              <div className="bg-slate-800 border border-slate-700 hover:border-yellow-500/50 rounded-2xl p-6 transition-colors group cursor-pointer">
                <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-yellow-500/20 transition-colors">
                  <span className="text-yellow-500 text-lg">+</span>
                </div>
                <h3 className="text-white font-semibold mb-1">New Project</h3>
                <p className="text-slate-400 text-sm">Start a new federal construction project</p>
              </div>
            </Link>

            <Link href="/projects">
              <div className="bg-slate-800 border border-slate-700 hover:border-yellow-500/50 rounded-2xl p-6 transition-colors group cursor-pointer">
                <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors">
                  <span className="text-blue-400 text-lg">🏗️</span>
                </div>
                <h3 className="text-white font-semibold mb-1">All Projects</h3>
                <p className="text-slate-400 text-sm">{projects.length} project{projects.length !== 1 ? 's' : ''} in your account</p>
              </div>
            </Link>

            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 opacity-50">
              <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center mb-4">
                <span className="text-green-400 text-lg">✓</span>
              </div>
              <h3 className="text-white font-semibold mb-1">QC Plans</h3>
              <p className="text-slate-400 text-sm">Coming soon</p>
            </div>
          </div>

          {/* Active projects */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold">Active Projects</h2>
              {active.length > 0 && (
                <Link href="/projects" className="text-yellow-500 hover:text-yellow-400 text-sm transition-colors">
                  View all →
                </Link>
              )}
            </div>

            {active.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-4xl mb-3">🏗️</p>
                <p className="text-slate-400 font-medium">No active projects</p>
                <p className="text-slate-500 text-sm mt-1">
                  <Link href="/projects/new" className="text-yellow-500 hover:text-yellow-400">Create your first project</Link>
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-700">
                {active.slice(0, 5).map(p => (
                  <Link key={p.id} href={`/projects/${p.id}`}>
                    <div className="flex items-center justify-between py-4 hover:bg-slate-700/30 -mx-2 px-2 rounded-xl transition-colors group">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ${AGENCY_COLORS[p.agency] ?? AGENCY_COLORS.OTHER}`}>
                          {p.agency}
                        </span>
                        <div className="min-w-0">
                          <p className="text-white text-sm font-medium truncate group-hover:text-yellow-400 transition-colors">
                            {p.projectName}
                          </p>
                          <p className="text-slate-500 text-xs font-mono">{p.contractNumber}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0 ml-4">
                        {p.location && <span className="text-slate-500 text-xs hidden md:block">{p.location}</span>}
                        <span className="text-yellow-500 text-sm font-semibold">{formatCurrency(p.contractValue)}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
