'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/layout/nav'
import ProjectForm from '@/components/forms/project-form'

export default function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [user, setUser] = useState<{ fullName: string; role: string } | null>(null)
  const [project, setProject] = useState<any>(null)

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
          if (data?.project) setProject(data.project)
          else router.push('/projects')
        })
        .catch(() => router.push('/projects'))
    })
  }, [params, router])

  if (!user || !project) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-slate-400 text-sm">Loading...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-900">
      <Nav user={user} />

      <main className="p-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Link href="/projects" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
              Projects
            </Link>
            <span className="text-slate-700">/</span>
            <Link href={`/projects/${project.id}`} className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
              {project.projectIdShort ?? project.contractNumber}
            </Link>
            <span className="text-slate-700">/</span>
            <span className="text-white text-sm">Edit</span>
          </div>

          <h1 className="text-white text-2xl font-bold mb-8">Edit Project</h1>

          <ProjectForm mode="edit" initial={project} />
        </div>
      </main>
    </div>
  )
}
