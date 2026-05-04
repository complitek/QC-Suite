'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/layout/nav'
import ProjectForm from '@/components/forms/project-form'

export default function NewProjectPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ fullName: string; role: string } | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (!data.user) router.push('/')
        else setUser(data.user)
      })
      .catch(() => router.push('/'))
  }, [router])

  if (!user) return (
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
            <span className="text-white text-sm">New Project</span>
          </div>

          <h1 className="text-white text-2xl font-bold mb-8">New Project</h1>

          <ProjectForm mode="create" />
        </div>
      </main>
    </div>
  )
}
