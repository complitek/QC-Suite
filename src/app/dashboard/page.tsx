'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<{ fullName: string; role: string } | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (data.user) setUser(data.user)
        else router.push('/')
      })
      .catch(() => router.push('/'))
  }, [router])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Top nav */}
      <nav className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
            <span className="text-slate-900 font-black text-sm">C</span>
          </div>
          <span className="text-white font-bold text-lg">Complitek</span>
          <span className="text-slate-500 text-sm">QC Suite</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-slate-400 text-sm">{user.fullName}</span>
          <span className="bg-yellow-500/10 text-yellow-500 text-xs px-2 py-1 rounded-full font-medium">
            {user.role}
          </span>
          <button
            onClick={handleLogout}
            className="text-slate-400 hover:text-white text-sm transition-colors"
          >
            Sign out
          </button>
        </div>
      </nav>

      {/* Main content */}
      <main className="p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-white text-2xl font-bold mb-2">Dashboard</h1>
          <p className="text-slate-400 mb-8">Welcome back, {user.fullName.split(' ')[0]}.</p>

          {/* Quick actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <button className="bg-slate-800 border border-slate-700 hover:border-yellow-500/50 rounded-2xl p-6 text-left transition-colors group">
              <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-yellow-500/20 transition-colors">
                <span className="text-yellow-500 text-lg">+</span>
              </div>
              <h3 className="text-white font-semibold mb-1">New Project</h3>
              <p className="text-slate-400 text-sm">Start a new federal construction project</p>
            </button>

            <button className="bg-slate-800 border border-slate-700 hover:border-yellow-500/50 rounded-2xl p-6 text-left transition-colors group">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors">
                <span className="text-blue-400 text-lg">📄</span>
              </div>
              <h3 className="text-white font-semibold mb-1">Upload Specs</h3>
              <p className="text-slate-400 text-sm">Upload specification books for AI analysis</p>
            </button>

            <button className="bg-slate-800 border border-slate-700 hover:border-yellow-500/50 rounded-2xl p-6 text-left transition-colors group">
              <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-green-500/20 transition-colors">
                <span className="text-green-400 text-lg">✓</span>
              </div>
              <h3 className="text-white font-semibold mb-1">QC Plans</h3>
              <p className="text-slate-400 text-sm">Generate and manage pre-work plans</p>
            </button>
          </div>

          {/* Projects placeholder */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
            <h2 className="text-white font-semibold mb-4">Active Projects</h2>
            <div className="text-center py-12 text-slate-500">
              <p className="text-4xl mb-3">🏗️</p>
              <p className="font-medium">No projects yet</p>
              <p className="text-sm mt-1">Click &quot;New Project&quot; to get started</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
