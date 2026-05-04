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
  description: string | null
  eprojectNumber: string | null
}

interface Stats {
  specBooks: number
  specSections: number
  specRequirements: number
  submittals: number
  submittalsPending: number
  preworkPlans: number
  preworkPlansDraft: number
  ahaPlans: number
  scheduleActivities: number
}

const AGENCY_COLORS: Record<string, string> = {
  NAVFAC: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  USACE: 'bg-green-500/10 text-green-400 border-green-500/20',
  ANG: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  OTHER: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
}

function formatCurrency(val: number | null) {
  if (!val) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val)
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [user, setUser] = useState<{ fullName: string; role: string } | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [projectId, setProjectId] = useState('')

  useEffect(() => {
    params.then(({ id }) => {
      setProjectId(id)
      fetch('/api/auth/me')
        .then(r => r.json())
        .then(data => {
          if (!data.user) { router.push('/'); return }
          setUser(data.user)
          return fetch(`/api/projects/${id}`)
        })
        .then(r => r?.json())
        .then(data => {
          if (data?.project) {
            setProject(data.project)
            setStats(data.stats)
          } else {
            router.push('/projects')
          }
          setLoading(false)
        })
        .catch(() => router.push('/projects'))
    })
  }, [params, router])

  if (!user || loading) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-slate-400 text-sm">Loading...</div>
    </div>
  )

  if (!project) return null

  return (
    <div className="min-h-screen bg-slate-900">
      <Nav user={user} />

      <main className="p-8">
        <div className="max-w-6xl mx-auto">

          {/* Breadcrumb */}
          <div className="flex items-center gap-3 mb-6">
            <Link href="/projects" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
              Projects
            </Link>
            <span className="text-slate-700">/</span>
            <span className="text-white text-sm">{project.projectIdShort ?? project.contractNumber}</span>
          </div>

          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${AGENCY_COLORS[project.agency] ?? AGENCY_COLORS.OTHER}`}>
                  {project.agency}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-medium">
                  {project.complexityTier.replace('TIER', 'Tier ')}
                </span>
                {project.isHybrid && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500 font-medium">
                    HYBRID
                  </span>
                )}
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  project.status === 'ACTIVE' ? 'bg-green-500/10 text-green-400' :
                  project.status === 'CLOSEOUT' ? 'bg-yellow-500/10 text-yellow-400' :
                  'bg-slate-500/10 text-slate-400'
                }`}>
                  {project.status}
                </span>
              </div>
              <h1 className="text-white text-2xl font-bold leading-tight">{project.projectName}</h1>
              <p className="text-slate-500 font-mono text-sm mt-1">{project.contractNumber}</p>
            </div>
            <Link
              href={`/projects/${projectId}/edit`}
              className="text-slate-400 hover:text-white text-sm border border-slate-700 hover:border-slate-500 rounded-xl px-4 py-2 transition-colors"
            >
              Edit
            </Link>
          </div>

          {/* Project info grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Prime Contractor', value: project.primeContractor || '—' },
              { label: 'Location', value: project.location || '—' },
              { label: 'Award Date', value: formatDate(project.awardDate) },
              { label: 'Completion', value: formatDate(project.completionDate) },
              { label: 'Contract Type', value: `${project.contractType}${project.isHybrid ? ' (A+B)' : ''}` },
              { label: 'Contract Value', value: formatCurrency(project.contractValue) },
              { label: 'eProject #', value: project.eprojectNumber || '—' },
              { label: 'Short ID', value: project.projectIdShort || '—' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <p className="text-slate-500 text-xs mb-1">{label}</p>
                <p className="text-white text-sm font-medium">{value}</p>
              </div>
            ))}
          </div>

          {project.description && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-8">
              <p className="text-slate-500 text-xs mb-1">Description</p>
              <p className="text-slate-300 text-sm">{project.description}</p>
            </div>
          )}

          {/* Modules */}
          <h2 className="text-white font-semibold mb-4">Modules</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

            <ModuleCard
              href={`/projects/${projectId}/specs`}
              icon="📋"
              title="Spec Sections"
              description="Browse specification sections and extracted requirements"
              stats={stats ? [
                { label: 'Sections', value: stats.specSections },
                { label: 'Requirements', value: stats.specRequirements },
              ] : undefined}
              color="blue"
            />

            <ModuleCard
              href={`/projects/${projectId}/submittals`}
              icon="📨"
              title="Submittal Register"
              description="Track all submittals, approval status, and due dates"
              stats={stats ? [
                { label: 'Total', value: stats.submittals },
                { label: 'Pending', value: stats.submittalsPending },
              ] : undefined}
              color="purple"
            />

            <ModuleCard
              href={`/projects/${projectId}/plans`}
              icon="📝"
              title="Pre-Work Plans"
              description="QC Plan, APP, EP, SWPPP, and other Division 1 plans"
              stats={stats ? [
                { label: 'Plans', value: stats.preworkPlans },
                { label: 'In Draft', value: stats.preworkPlansDraft },
              ] : undefined}
              color="green"
            />

            <ModuleCard
              href={`/projects/${projectId}/ahas`}
              icon="🦺"
              title="AHA Plans"
              description="Activity Hazard Analyses per construction activity"
              stats={stats ? [
                { label: 'AHAs', value: stats.ahaPlans },
              ] : undefined}
              color="orange"
            />

            <ModuleCard
              href={`/projects/${projectId}/schedule`}
              icon="📅"
              title="Schedule"
              description="Cost-loaded network analysis schedule and activity tracking"
              stats={stats ? [
                { label: 'Activities', value: stats.scheduleActivities },
              ] : undefined}
              color="yellow"
            />

            <ModuleCard
              href={`/projects/${projectId}/evr`}
              icon="📊"
              title="EVR"
              description="Earned Value Reporting — labor, material, and units by period"
              color="teal"
            />

          </div>
        </div>
      </main>
    </div>
  )
}

interface ModuleStat { label: string; value: number }
interface ModuleCardProps {
  href: string
  icon: string
  title: string
  description: string
  stats?: ModuleStat[]
  color: 'blue' | 'purple' | 'green' | 'orange' | 'yellow' | 'teal'
}

const COLOR_MAP: Record<string, string> = {
  blue:   'bg-blue-500/10 group-hover:bg-blue-500/20',
  purple: 'bg-purple-500/10 group-hover:bg-purple-500/20',
  green:  'bg-green-500/10 group-hover:bg-green-500/20',
  orange: 'bg-orange-500/10 group-hover:bg-orange-500/20',
  yellow: 'bg-yellow-500/10 group-hover:bg-yellow-500/20',
  teal:   'bg-teal-500/10 group-hover:bg-teal-500/20',
}

function ModuleCard({ href, icon, title, description, stats, color }: ModuleCardProps) {
  return (
    <Link href={href}>
      <div className="bg-slate-800 border border-slate-700 hover:border-yellow-500/30 rounded-2xl p-6 transition-colors group cursor-pointer h-full">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-colors ${COLOR_MAP[color]}`}>
          <span className="text-lg">{icon}</span>
        </div>
        <h3 className="text-white font-semibold mb-1 group-hover:text-yellow-400 transition-colors">{title}</h3>
        <p className="text-slate-500 text-sm mb-4 leading-relaxed">{description}</p>
        {stats && stats.length > 0 && (
          <div className="flex gap-4 pt-4 border-t border-slate-700">
            {stats.map(s => (
              <div key={s.label}>
                <p className="text-white font-bold text-lg leading-none">{s.value}</p>
                <p className="text-slate-500 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}
