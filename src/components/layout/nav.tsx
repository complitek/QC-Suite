'use client'

import { useRouter } from 'next/navigation'

interface NavProps {
  user: { fullName: string; role: string }
}

export default function Nav({ user }: NavProps) {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  return (
    <nav className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
          <span className="text-slate-900 font-black text-sm">C</span>
        </div>
        <a href="/dashboard" className="text-white font-bold text-lg hover:text-yellow-500 transition-colors">
          Complitek
        </a>
        <span className="text-slate-500 text-sm">QC Suite</span>
      </div>
      <div className="flex items-center gap-4">
        <a href="/projects" className="text-slate-400 hover:text-white text-sm transition-colors">
          Projects
        </a>
        <span className="text-slate-600">|</span>
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
  )
}
