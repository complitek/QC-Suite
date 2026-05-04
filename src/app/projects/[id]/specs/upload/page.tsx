'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/layout/nav'

interface Result {
  bookTitle: string
  sectionsAdded: number
  requirementsAdded: number
}

const PART_OPTIONS = [
  { value: 'BOTH',   label: 'General Requirements (applies to both parts)' },
  { value: 'PART_A', label: 'Part A — Design-Bid-Build (DBB)' },
  { value: 'PART_B', label: 'Part B — Design-Build (DB)' },
  { value: 'NA',     label: 'Not designated' },
]

export default function SpecUploadPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [user, setUser] = useState<{ fullName: string; role: string } | null>(null)
  const [project, setProject] = useState<{ id: string; projectName: string; projectIdShort: string | null } | null>(null)
  const [projectId, setProjectId] = useState('')

  const [file, setFile] = useState<File | null>(null)
  const [partDesignation, setPartDesignation] = useState('BOTH')
  const [dragging, setDragging] = useState(false)

  type Stage = 'idle' | 'uploading' | 'extracting' | 'done' | 'error'
  const [stage, setStage] = useState<Stage>('idle')
  const [error, setError] = useState('')
  const [results, setResults] = useState<Result[]>([])

  const inputRef = useRef<HTMLInputElement>(null)

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
          if (!data?.project) { router.push('/projects'); return }
          setProject(data.project)
        })
        .catch(() => router.push('/projects'))
    })
  }, [params, router])

  const acceptFile = useCallback((f: File) => {
    if (!f.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are supported.')
      return
    }
    if (f.size > 32 * 1024 * 1024) {
      setError('File must be under 32 MB.')
      return
    }
    setError('')
    setFile(f)
    setStage('idle')
  }, [])

  function onDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragging(true)
  }
  function onDragLeave() { setDragging(false) }
  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) acceptFile(f)
  }
  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) acceptFile(f)
  }

  async function upload() {
    if (!file) return
    setStage('uploading')
    setError('')

    const fd = new FormData()
    fd.append('file', file)
    fd.append('partDesignation', partDesignation)

    try {
      setStage('extracting')
      const res = await fetch(`/api/projects/${projectId}/specs/upload`, {
        method: 'POST',
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Upload failed')
        setStage('error')
        return
      }
      setResults(prev => [...prev, {
        bookTitle: data.bookTitle,
        sectionsAdded: data.sectionsAdded,
        requirementsAdded: data.requirementsAdded,
      }])
      setFile(null)
      if (inputRef.current) inputRef.current.value = ''
      setStage('done')
    } catch (err: any) {
      setError(err.message ?? 'Network error')
      setStage('error')
    }
  }

  const busy = stage === 'uploading' || stage === 'extracting'

  if (!user) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-slate-400 text-sm">Loading...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-900">
      <Nav user={user} />

      <main className="p-8">
        <div className="max-w-2xl mx-auto">

          {/* Breadcrumb */}
          <div className="flex items-center gap-3 mb-6 text-sm">
            <Link href="/projects" className="text-slate-500 hover:text-slate-300 transition-colors">Projects</Link>
            <span className="text-slate-700">/</span>
            <Link href={`/projects/${projectId}`} className="text-slate-500 hover:text-slate-300 transition-colors">
              {project?.projectIdShort ?? projectId}
            </Link>
            <span className="text-slate-700">/</span>
            <Link href={`/projects/${projectId}/specs`} className="text-slate-500 hover:text-slate-300 transition-colors">Spec Sections</Link>
            <span className="text-slate-700">/</span>
            <span className="text-white">Upload</span>
          </div>

          <div className="mb-6">
            <h1 className="text-white text-2xl font-bold">Upload Spec Book</h1>
            <p className="text-slate-400 text-sm mt-1">
              PDF specs are processed by AI to extract sections and requirements. Sensitive references are automatically replaced with Neverland equivalents.
            </p>
          </div>

          <div className="space-y-4">

            {/* Part designation */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
              <label className="text-slate-400 text-xs block mb-3">Which part of the contract is this spec book?</label>
              <div className="space-y-2">
                {PART_OPTIONS.map(opt => (
                  <label key={opt.value} className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                      partDesignation === opt.value
                        ? 'border-yellow-500 bg-yellow-500'
                        : 'border-slate-600 group-hover:border-slate-400'
                    }`}>
                      {partDesignation === opt.value && (
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                      )}
                    </div>
                    <input
                      type="radio"
                      name="part"
                      value={opt.value}
                      checked={partDesignation === opt.value}
                      onChange={() => setPartDesignation(opt.value)}
                      className="sr-only"
                    />
                    <span className={`text-sm transition-colors ${partDesignation === opt.value ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                      {opt.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => !busy && inputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
                busy
                  ? 'border-slate-700 cursor-not-allowed opacity-60'
                  : dragging
                    ? 'border-yellow-500 bg-yellow-500/5'
                    : file
                      ? 'border-green-500/40 bg-green-500/5 hover:border-green-500/60'
                      : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/50'
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={onFileChange}
                className="sr-only"
                disabled={busy}
              />

              {file ? (
                <div>
                  <div className="text-3xl mb-3">📄</div>
                  <p className="text-white font-medium text-sm">{file.name}</p>
                  <p className="text-slate-500 text-xs mt-1">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                  {!busy && (
                    <p className="text-slate-600 text-xs mt-3">Click to choose a different file</p>
                  )}
                </div>
              ) : (
                <div>
                  <div className="text-4xl mb-4">📁</div>
                  <p className="text-white font-medium">Drop your PDF here</p>
                  <p className="text-slate-500 text-sm mt-1">or click to browse</p>
                  <p className="text-slate-600 text-xs mt-3">PDF only · max 32 MB</p>
                </div>
              )}
            </div>

            {/* Status / error */}
            {busy && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin shrink-0" />
                <div>
                  <p className="text-white text-sm font-medium">
                    {stage === 'uploading' ? 'Sending to Claude...' : 'Extracting spec sections and requirements...'}
                  </p>
                  <p className="text-slate-500 text-xs mt-0.5">This takes 30–90 seconds depending on the file size.</p>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <p className="text-red-400 text-sm font-medium">Error</p>
                <p className="text-red-300 text-sm mt-1">{error}</p>
              </div>
            )}

            {/* Upload button */}
            <button
              onClick={upload}
              disabled={!file || busy}
              className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 font-bold text-sm rounded-xl transition-colors"
            >
              {busy ? 'Processing...' : 'Extract & Import Spec Book'}
            </button>

            {/* Results */}
            {results.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Imported</h2>
                {results.map((r, i) => (
                  <div key={i} className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                    <p className="text-green-400 font-medium text-sm">{r.bookTitle}</p>
                    <div className="flex gap-6 mt-2">
                      <div>
                        <p className="text-white font-bold text-lg leading-none">{r.sectionsAdded}</p>
                        <p className="text-slate-500 text-xs mt-0.5">sections</p>
                      </div>
                      <div>
                        <p className="text-white font-bold text-lg leading-none">{r.requirementsAdded}</p>
                        <p className="text-slate-500 text-xs mt-0.5">requirements</p>
                      </div>
                    </div>
                  </div>
                ))}

                <Link
                  href={`/projects/${projectId}/specs`}
                  className="block w-full text-center py-3 border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-white text-sm rounded-xl transition-colors"
                >
                  View Spec Sections →
                </Link>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  )
}
