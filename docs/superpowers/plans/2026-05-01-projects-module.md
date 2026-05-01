# Projects Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Projects module — seed the Neverland synthetic project, create CRUD API routes, and build the list, create, detail, and edit pages.

**Architecture:** Seed script loads Neverland data directly into Neon DB first. API routes follow the existing auth route pattern (NextRequest/NextResponse, JWT cookie auth via shared session helper). Pages follow the existing dashboard pattern ('use client', useEffect for auth + data, dark slate/yellow theme).

**Tech Stack:** Next.js 16, Drizzle ORM, Neon PostgreSQL, Tailwind CSS 4, TypeScript

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `src/lib/session.ts` | Reusable helper: extract + verify JWT from request cookie |
| Create | `src/components/layout/nav.tsx` | Shared top nav (extracted from dashboard) |
| Create | `src/scripts/seed.ts` | One-time seed: 3G2B LLC company + Neverland project + 3 spec books |
| Create | `src/app/api/projects/route.ts` | GET (list) + POST (create) |
| Create | `src/app/api/projects/[id]/route.ts` | GET (one + spec books) + PUT (update) + DELETE (soft) |
| Create | `src/app/(dashboard)/projects/page.tsx` | Projects list page |
| Create | `src/app/(dashboard)/projects/new/page.tsx` | Create project page |
| Create | `src/components/forms/project-form.tsx` | Shared form component (used by new + edit) |
| Create | `src/app/(dashboard)/projects/[id]/page.tsx` | Project detail page |
| Create | `src/app/(dashboard)/projects/[id]/edit/page.tsx` | Edit project page |
| Modify | `src/app/dashboard/page.tsx` | Wire up "New Project" button + show real project list |
| Modify | `package.json` | Add `db:seed` script |

---

## Task 1: Create `src/lib/session.ts`

**Files:**
- Create: `src/lib/session.ts`

- [ ] **Step 1: Create the file**

```typescript
import { NextRequest } from 'next/server'
import { verifyToken, TokenPayload } from './auth'

export function getSession(req: NextRequest): TokenPayload | null {
  const token = req.cookies.get('auth_token')?.value
  if (!token) return null
  return verifyToken(token)
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd C:\Users\hiunl\Complitek && npx tsc --noEmit`
Expected: No errors related to session.ts

- [ ] **Step 3: Commit**

```bash
git add src/lib/session.ts
git commit -m "feat: add reusable session helper"
```

---

## Task 2: Extract Nav into `src/components/layout/nav.tsx`

**Files:**
- Create: `src/components/layout/nav.tsx`

- [ ] **Step 1: Create the nav component**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/nav.tsx
git commit -m "feat: add shared Nav component"
```

---

## Task 3: Create `src/scripts/seed.ts`

**Files:**
- Create: `src/scripts/seed.ts`

- [ ] **Step 1: Create the seed script**

```typescript
import { config } from 'dotenv'
config({ path: '.env.local' })

import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
import * as schema from '../lib/db/schema'

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql, { schema })

async function seed() {
  console.log('Seeding Neverland project...\n')

  // 1. Get or create 3G2B LLC
  let [company] = await db.select().from(schema.companies)
    .where(eq(schema.companies.name, '3G2B LLC'))

  if (!company) {
    ;[company] = await db.insert(schema.companies).values({
      name: '3G2B LLC',
      sba8a: true,
      email: 'pvaldez@3g2bllc.com',
    }).returning()
    console.log('✓ Created company: 3G2B LLC')
  } else {
    console.log('✓ Company exists: 3G2B LLC')
  }

  // 2. Link admin user to company if not already linked
  const [adminUser] = await db.select().from(schema.users)
    .where(eq(schema.users.email, 'pvaldez@3g2bllc.com'))

  if (adminUser && !adminUser.companyId) {
    await db.update(schema.users)
      .set({ companyId: company.id })
      .where(eq(schema.users.email, 'pvaldez@3g2bllc.com'))
    console.log('✓ Linked admin user to 3G2B LLC')
  } else {
    console.log('✓ Admin user already linked')
  }

  // 3. Skip if already seeded
  const existing = await db.select().from(schema.projects)
    .where(eq(schema.projects.contractNumber, 'N62742-24-C-4471'))

  if (existing.length > 0) {
    console.log('\nNeverland project already seeded. Done.')
    return
  }

  // 4. Create the project
  const [project] = await db.insert(schema.projects).values({
    companyId: company.id,
    contractNumber: 'N62742-24-C-4471',
    projectName: 'Naval Station Neverland New Dry Dock 1 Construction',
    projectIdShort: 'NSN-DD1',
    agency: 'NAVFAC',
    contractType: 'HYBRID',
    isHybrid: true,
    primeContractor: 'Lost Boys Construction',
    location: 'Pearl Harbor, HI',
    state: 'HI',
    awardDate: '2024-03-15',
    completionDate: '2028-09-30',
    contractValue: 485000000,
    complexityTier: 'TIER3',
    status: 'ACTIVE',
    description: 'Construction of a new dry dock facility at Naval Station Neverland. Hybrid contract: Part A (Design-Bid-Build) and Part B (Design-Build).',
    createdBy: adminUser?.id,
  }).returning()

  console.log(`✓ Created project: ${project.projectName}`)

  // 5. Create 3 spec books
  const books: { title: string; partDesignation: 'PART_A' | 'PART_B' | 'BOTH' }[] = [
    { title: 'Part A — DBB Technical Specifications', partDesignation: 'PART_A' },
    { title: 'Part B — DB Technical Specifications', partDesignation: 'PART_B' },
    { title: 'General Project Requirements', partDesignation: 'BOTH' },
  ]

  for (const book of books) {
    await db.insert(schema.specBooks).values({
      projectId: project.id,
      title: book.title,
      partDesignation: book.partDesignation,
      parseStatus: 'pending',
      createdBy: adminUser?.id,
    })
    console.log(`✓ Created spec book: ${book.title}`)
  }

  console.log('\nSeed complete!')
  console.log(`Project ID: ${project.id}`)
}

seed().catch(console.error).finally(() => process.exit(0))
```

- [ ] **Step 2: Add seed script to package.json**

In `package.json`, add to `"scripts"`:
```json
"db:seed": "npx tsx src/scripts/seed.ts"
```

- [ ] **Step 3: Commit**

```bash
git add src/scripts/seed.ts package.json
git commit -m "feat: add Neverland seed script"
```

---

## Task 4: Run the Seed Script

**Files:** None (verification only)

- [ ] **Step 1: Run the seed**

Run: `cd C:\Users\hiunl\Complitek && npm run db:seed`

Expected output:
```
Seeding Neverland project...

✓ Company exists: 3G2B LLC   (or "Created company")
✓ Admin user already linked  (or "Linked admin user")
✓ Created project: Naval Station Neverland New Dry Dock 1 Construction
✓ Created spec book: Part A — DBB Technical Specifications
✓ Created spec book: Part B — DB Technical Specifications
✓ Created spec book: General Project Requirements

Seed complete!
Project ID: <uuid>
```

If output says "Neverland project already seeded" — seed ran previously, that's fine too.

- [ ] **Step 2: Verify in database**

Run:
```
node -e "
const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);
sql.query('SELECT contract_number, project_name, status FROM projects').then(r => console.log(r.rows)).catch(console.error).finally(() => process.exit(0));
"
```

Expected: Row with `N62742-24-C-4471` and `Naval Station Neverland New Dry Dock 1 Construction`

---

## Task 5: Build `GET /api/projects` and `POST /api/projects`

**Files:**
- Create: `src/app/api/projects/route.ts`

- [ ] **Step 1: Create the route file**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { projects } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/session'

export async function GET(req: NextRequest) {
  const session = getSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await db.select().from(projects)
    .where(eq(projects.companyId, session.companyId))
    .orderBy(projects.createdAt)

  return NextResponse.json({ projects: rows })
}

export async function POST(req: NextRequest) {
  const session = getSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    contractNumber, projectName, projectIdShort, agency, contractType,
    isHybrid, primeContractor, location, state, awardDate, completionDate,
    eprojectNumber, contractValue, complexityTier, status, description,
  } = body

  if (!contractNumber || !projectName || !agency || !contractType) {
    return NextResponse.json(
      { error: 'Contract number, project name, agency, and contract type are required' },
      { status: 400 }
    )
  }

  const [project] = await db.insert(projects).values({
    companyId: session.companyId,
    contractNumber,
    projectName,
    projectIdShort: projectIdShort || null,
    agency,
    contractType,
    isHybrid: isHybrid ?? false,
    primeContractor: primeContractor || null,
    location: location || null,
    state: state || null,
    awardDate: awardDate || null,
    completionDate: completionDate || null,
    eprojectNumber: eprojectNumber || null,
    contractValue: contractValue ? Number(contractValue) : null,
    complexityTier: complexityTier ?? 'TIER1',
    status: status ?? 'ACTIVE',
    description: description || null,
    createdBy: session.userId,
  }).returning()

  return NextResponse.json({ project }, { status: 201 })
}
```

- [ ] **Step 2: Start dev server and verify GET returns Neverland**

Run: `npm run dev` (in a separate terminal)

Then run:
```bash
curl -s http://localhost:3000/api/projects
```
Expected: `{"error":"Unauthorized"}` (correct — no cookie sent)

Log in at http://localhost:3000 with pvaldez@3g2bllc.com, then use browser devtools Network tab to verify GET /api/projects returns the Neverland project with status 200.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/projects/route.ts
git commit -m "feat: add GET and POST /api/projects"
```

---

## Task 6: Build `GET /PUT /DELETE /api/projects/[id]`

**Files:**
- Create: `src/app/api/projects/[id]/route.ts`

- [ ] **Step 1: Create the route file**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { projects, specBooks } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { getSession } from '@/lib/session'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const [project] = await db.select().from(projects)
    .where(and(eq(projects.id, id), eq(projects.companyId, session.companyId)))

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const books = await db.select().from(specBooks).where(eq(specBooks.projectId, id))

  return NextResponse.json({ project, specBooks: books })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const [existing] = await db.select().from(projects)
    .where(and(eq(projects.id, id), eq(projects.companyId, session.companyId)))

  if (!existing) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const body = await req.json()
  const {
    contractNumber, projectName, projectIdShort, agency, contractType,
    isHybrid, primeContractor, location, state, awardDate, completionDate,
    eprojectNumber, contractValue, complexityTier, status, description,
  } = body

  const [updated] = await db.update(projects).set({
    contractNumber,
    projectName,
    projectIdShort: projectIdShort || null,
    agency,
    contractType,
    isHybrid: isHybrid ?? false,
    primeContractor: primeContractor || null,
    location: location || null,
    state: state || null,
    awardDate: awardDate || null,
    completionDate: completionDate || null,
    eprojectNumber: eprojectNumber || null,
    contractValue: contractValue ? Number(contractValue) : null,
    complexityTier,
    status,
    description: description || null,
  }).where(eq(projects.id, id)).returning()

  return NextResponse.json({ project: updated })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const [existing] = await db.select().from(projects)
    .where(and(eq(projects.id, id), eq(projects.companyId, session.companyId)))

  if (!existing) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const [updated] = await db.update(projects)
    .set({ status: 'COMPLETE' })
    .where(eq(projects.id, id))
    .returning()

  return NextResponse.json({ project: updated })
}
```

- [ ] **Step 2: Verify GET /api/projects/[id] returns Neverland**

In browser devtools (while logged in), navigate to `/api/projects` first to get Neverland's ID, then verify `/api/projects/<that-id>` returns the project plus its 3 spec books.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/projects/[id]/route.ts
git commit -m "feat: add GET, PUT, DELETE /api/projects/[id]"
```

---

## Task 7: Build Projects List Page

**Files:**
- Create: `src/app/(dashboard)/projects/page.tsx`

- [ ] **Step 1: Create the page**

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/components/layout/nav'

type Project = {
  id: string
  contractNumber: string
  projectName: string
  agency: string
  contractType: string
  status: string
  completionDate: string | null
  complexityTier: string
  primeContractor: string | null
}

type User = { fullName: string; role: string }

const agencyColors: Record<string, string> = {
  NAVFAC: 'bg-blue-500/10 text-blue-400',
  USACE: 'bg-green-500/10 text-green-400',
  ANG: 'bg-purple-500/10 text-purple-400',
  OTHER: 'bg-slate-500/10 text-slate-400',
}

export default function ProjectsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const meRes = await fetch('/api/auth/me')
      const meData = await meRes.json()
      if (!meData.user) { router.push('/'); return }
      setUser(meData.user)

      const projRes = await fetch('/api/projects')
      const projData = await projRes.json()
      setProjects(projData.projects ?? [])
      setLoading(false)
    }
    load().catch(() => router.push('/'))
  }, [router])

  if (!user || loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <Nav user={user} />
      <main className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-white text-2xl font-bold">Projects</h1>
              <p className="text-slate-400 text-sm mt-1">
                {projects.length} project{projects.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={() => router.push('/projects/new')}
              className="bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-semibold px-4 py-2 rounded-xl transition-colors text-sm"
            >
              + New Project
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-12 text-center">
              <p className="text-4xl mb-3">🏗️</p>
              <p className="text-white font-medium">No projects yet</p>
              <p className="text-slate-400 text-sm mt-1">Click &quot;New Project&quot; to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map(project => (
                <div
                  key={project.id}
                  onClick={() => router.push(`/projects/${project.id}`)}
                  className="bg-slate-800 border border-slate-700 hover:border-yellow-500/50 rounded-2xl p-6 cursor-pointer transition-colors group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${agencyColors[project.agency] ?? agencyColors.OTHER}`}>
                      {project.agency}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      project.status === 'ACTIVE'
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-slate-500/10 text-slate-400'
                    }`}>
                      {project.status}
                    </span>
                  </div>
                  <h3 className="text-white font-semibold mb-1 group-hover:text-yellow-500 transition-colors line-clamp-2">
                    {project.projectName}
                  </h3>
                  <p className="text-slate-400 text-sm mb-3">{project.contractNumber}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>{project.contractType}</span>
                    <span>·</span>
                    <span>{project.complexityTier}</span>
                    {project.completionDate && (
                      <>
                        <span>·</span>
                        <span>Complete {new Date(project.completionDate).getFullYear()}</span>
                      </>
                    )}
                  </div>
                  {project.primeContractor && (
                    <p className="text-slate-500 text-xs mt-2">{project.primeContractor}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Navigate to http://localhost:3000/projects (while logged in).
Expected: Neverland project card visible — NAVFAC badge, contract number N62742-24-C-4471, HYBRID, TIER3.

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/projects/page.tsx
git commit -m "feat: add projects list page"
```

---

## Task 8: Build Shared Project Form + Create Page

**Files:**
- Create: `src/components/forms/project-form.tsx`
- Create: `src/app/(dashboard)/projects/new/page.tsx`

- [ ] **Step 1: Create the shared form component**

```typescript
'use client'

import { useState } from 'react'

export interface ProjectFormData {
  contractNumber: string
  projectName: string
  projectIdShort: string
  agency: string
  contractType: string
  isHybrid: boolean
  primeContractor: string
  location: string
  state: string
  awardDate: string
  completionDate: string
  eprojectNumber: string
  contractValue: string
  complexityTier: string
  status: string
  description: string
}

interface ProjectFormProps {
  initialData?: Partial<ProjectFormData>
  onSubmit: (data: ProjectFormData) => Promise<void>
  submitLabel: string
  onCancel: () => void
  error: string | null
  loading: boolean
}

const defaultData: ProjectFormData = {
  contractNumber: '',
  projectName: '',
  projectIdShort: '',
  agency: 'NAVFAC',
  contractType: 'DBB',
  isHybrid: false,
  primeContractor: '',
  location: '',
  state: '',
  awardDate: '',
  completionDate: '',
  eprojectNumber: '',
  contractValue: '',
  complexityTier: 'TIER1',
  status: 'ACTIVE',
  description: '',
}

export default function ProjectForm({
  initialData,
  onSubmit,
  submitLabel,
  onCancel,
  error,
  loading,
}: ProjectFormProps) {
  const [form, setForm] = useState<ProjectFormData>({ ...defaultData, ...initialData })

  function set(field: keyof ProjectFormData, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await onSubmit(form)
  }

  const inputClass = 'w-full bg-slate-700 border border-slate-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-yellow-500 transition-colors'
  const labelClass = 'block text-slate-400 text-xs font-medium mb-1.5'
  const selectClass = inputClass

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* Contract Info */}
      <div>
        <h2 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Contract Info</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Contract Number *</label>
            <input className={inputClass} value={form.contractNumber}
              onChange={e => set('contractNumber', e.target.value)} required placeholder="N62742-24-C-0000" />
          </div>
          <div>
            <label className={labelClass}>Short ID</label>
            <input className={inputClass} value={form.projectIdShort}
              onChange={e => set('projectIdShort', e.target.value)} placeholder="NSN-DD1" />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Project Name *</label>
            <input className={inputClass} value={form.projectName}
              onChange={e => set('projectName', e.target.value)} required placeholder="Naval Station Neverland New Dry Dock 1 Construction" />
          </div>
          <div>
            <label className={labelClass}>Agency *</label>
            <select className={selectClass} value={form.agency} onChange={e => set('agency', e.target.value)}>
              <option value="NAVFAC">NAVFAC</option>
              <option value="USACE">USACE</option>
              <option value="ANG">ANG</option>
              <option value="OTHER">OTHER</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Contract Type *</label>
            <select className={selectClass} value={form.contractType} onChange={e => set('contractType', e.target.value)}>
              <option value="DBB">DBB — Design-Bid-Build</option>
              <option value="DB">DB — Design-Build</option>
              <option value="HYBRID">HYBRID — Part A DBB + Part B DB</option>
              <option value="IDIQ">IDIQ</option>
              <option value="MACC">MACC</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isHybrid"
              checked={form.isHybrid}
              onChange={e => set('isHybrid', e.target.checked)}
              className="w-4 h-4 accent-yellow-500"
            />
            <label htmlFor="isHybrid" className="text-slate-400 text-sm">Hybrid contract (Part A + Part B)</label>
          </div>
        </div>
      </div>

      {/* Project Details */}
      <div>
        <h2 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Project Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Prime Contractor</label>
            <input className={inputClass} value={form.primeContractor}
              onChange={e => set('primeContractor', e.target.value)} placeholder="Lost Boys Construction" />
          </div>
          <div>
            <label className={labelClass}>Contract Value ($)</label>
            <input className={inputClass} type="number" value={form.contractValue}
              onChange={e => set('contractValue', e.target.value)} placeholder="485000000" />
          </div>
          <div>
            <label className={labelClass}>Location</label>
            <input className={inputClass} value={form.location}
              onChange={e => set('location', e.target.value)} placeholder="Pearl Harbor, HI" />
          </div>
          <div>
            <label className={labelClass}>State</label>
            <input className={inputClass} value={form.state} maxLength={2}
              onChange={e => set('state', e.target.value.toUpperCase())} placeholder="HI" />
          </div>
          <div>
            <label className={labelClass}>Award Date</label>
            <input className={inputClass} type="date" value={form.awardDate}
              onChange={e => set('awardDate', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Completion Date</label>
            <input className={inputClass} type="date" value={form.completionDate}
              onChange={e => set('completionDate', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>eProject Number</label>
            <input className={inputClass} value={form.eprojectNumber}
              onChange={e => set('eprojectNumber', e.target.value)} placeholder="ePM number" />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Description</label>
            <textarea className={`${inputClass} resize-none`} rows={3} value={form.description}
              onChange={e => set('description', e.target.value)} placeholder="Brief project description..." />
          </div>
        </div>
      </div>

      {/* Classification */}
      <div>
        <h2 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Classification</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Complexity Tier</label>
            <select className={selectClass} value={form.complexityTier} onChange={e => set('complexityTier', e.target.value)}>
              <option value="TIER1">TIER 1 — Low Complexity</option>
              <option value="TIER2">TIER 2 — Medium Complexity</option>
              <option value="TIER3">TIER 3 — High Complexity</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Status</label>
            <select className={selectClass} value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="ACTIVE">Active</option>
              <option value="CLOSEOUT">Closeout</option>
              <option value="COMPLETE">Complete</option>
            </select>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-slate-900 font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm"
        >
          {loading ? 'Saving...' : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-slate-400 hover:text-white text-sm transition-colors px-4 py-2.5"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
```


- [ ] **Step 2: Create `src/app/(dashboard)/projects/new/page.tsx`**

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/components/layout/nav'
import ProjectForm, { ProjectFormData } from '@/components/forms/project-form'

type User = { fullName: string; role: string }

export default function NewProjectPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => { if (data.user) setUser(data.user); else router.push('/') })
      .catch(() => router.push('/'))
  }, [router])

  async function handleSubmit(formData: ProjectFormData) {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to create project'); return }
      router.push(`/projects/${data.project.id}`)
    } finally {
      setLoading(false)
    }
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
      <Nav user={user} />
      <main className="p-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <button onClick={() => router.push('/projects')} className="text-slate-400 hover:text-white text-sm transition-colors mb-4 block">
              ← Back to Projects
            </button>
            <h1 className="text-white text-2xl font-bold">New Project</h1>
            <p className="text-slate-400 text-sm mt-1">Enter the contract details to set up a new federal construction project.</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8">
            <ProjectForm
              onSubmit={handleSubmit}
              submitLabel="Create Project"
              onCancel={() => router.push('/projects')}
              error={error}
              loading={loading}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Verify in browser**

Navigate to http://localhost:3000/projects/new
Expected: Form loads with all sections (Contract Info, Project Details, Classification). Fill in a test project and submit. Should redirect to the new project's detail page (which will show 404 until Task 9 is done — that's expected).

- [ ] **Step 4: Commit**

```bash
git add src/components/forms/project-form.tsx src/app/(dashboard)/projects/new/page.tsx
git commit -m "feat: add project create form and new project page"
```

---

## Task 9: Build Project Detail Page

**Files:**
- Create: `src/app/(dashboard)/projects/[id]/page.tsx`

- [ ] **Step 1: Create the detail page**

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Nav from '@/components/layout/nav'

type Project = {
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
  awardDate: string | null
  completionDate: string | null
  eprojectNumber: string | null
  contractValue: number | null
  complexityTier: string
  status: string
  description: string | null
}

type SpecBook = {
  id: string
  title: string
  partDesignation: string
  parseStatus: string
}

type User = { fullName: string; role: string }

const agencyColors: Record<string, string> = {
  NAVFAC: 'bg-blue-500/10 text-blue-400',
  USACE: 'bg-green-500/10 text-green-400',
  ANG: 'bg-purple-500/10 text-purple-400',
  OTHER: 'bg-slate-500/10 text-slate-400',
}

const modules = [
  { key: 'specs', label: 'Specs', icon: '📄', path: 'specs' },
  { key: 'plans', label: 'Plans', icon: '📋', path: 'plans' },
  { key: 'submittals', label: 'Submittals', icon: '📬', path: 'submittals' },
  { key: 'schedule', label: 'Schedule', icon: '📅', path: 'schedule' },
  { key: 'evr', label: 'EVR', icon: '📊', path: 'evr' },
  { key: 'qc', label: 'QC', icon: '✅', path: 'qc' },
]

export default function ProjectDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [user, setUser] = useState<User | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [specBooks, setSpecBooks] = useState<SpecBook[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const meRes = await fetch('/api/auth/me')
      const meData = await meRes.json()
      if (!meData.user) { router.push('/'); return }
      setUser(meData.user)

      const projRes = await fetch(`/api/projects/${id}`)
      if (!projRes.ok) { router.push('/projects'); return }
      const projData = await projRes.json()
      setProject(projData.project)
      setSpecBooks(projData.specBooks ?? [])
      setLoading(false)
    }
    load().catch(() => router.push('/projects'))
  }, [id, router])

  if (!user || loading || !project) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    )
  }

  function formatDate(d: string | null) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  function formatCurrency(v: number | null) {
    if (!v) return '—'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <Nav user={user} />
      <main className="p-8">
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <div className="mb-6">
            <button onClick={() => router.push('/projects')} className="text-slate-400 hover:text-white text-sm transition-colors mb-4 block">
              ← Projects
            </button>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${agencyColors[project.agency] ?? agencyColors.OTHER}`}>
                    {project.agency}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    project.status === 'ACTIVE' ? 'bg-green-500/10 text-green-400' : 'bg-slate-500/10 text-slate-400'
                  }`}>
                    {project.status}
                  </span>
                  {project.isHybrid && (
                    <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-500 font-medium">
                      HYBRID
                    </span>
                  )}
                </div>
                <h1 className="text-white text-2xl font-bold">{project.projectName}</h1>
                <p className="text-slate-400 text-sm mt-1">{project.contractNumber}{project.projectIdShort ? ` · ${project.projectIdShort}` : ''}</p>
              </div>
              <button
                onClick={() => router.push(`/projects/${id}/edit`)}
                className="bg-slate-700 hover:bg-slate-600 text-white text-sm px-4 py-2 rounded-xl transition-colors"
              >
                Edit
              </button>
            </div>
          </div>

          {/* Details grid */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 mb-6">
            <h2 className="text-white font-semibold mb-4">Contract Details</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { label: 'Contract Type', value: project.contractType },
                { label: 'Complexity', value: project.complexityTier },
                { label: 'Prime Contractor', value: project.primeContractor },
                { label: 'Contract Value', value: formatCurrency(project.contractValue) },
                { label: 'Location', value: project.location ? `${project.location}` : '—' },
                { label: 'Award Date', value: formatDate(project.awardDate) },
                { label: 'Completion Date', value: formatDate(project.completionDate) },
                { label: 'eProject #', value: project.eprojectNumber ?? '—' },
              ].map(item => (
                <div key={item.label}>
                  <p className="text-slate-500 text-xs mb-1">{item.label}</p>
                  <p className="text-white text-sm font-medium">{item.value ?? '—'}</p>
                </div>
              ))}
            </div>
            {project.description && (
              <div className="mt-4 pt-4 border-t border-slate-700">
                <p className="text-slate-500 text-xs mb-1">Description</p>
                <p className="text-slate-300 text-sm">{project.description}</p>
              </div>
            )}
          </div>

          {/* Spec Books */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 mb-6">
            <h2 className="text-white font-semibold mb-4">Specification Books ({specBooks.length})</h2>
            {specBooks.length === 0 ? (
              <p className="text-slate-500 text-sm">No spec books uploaded yet.</p>
            ) : (
              <div className="space-y-2">
                {specBooks.map(book => (
                  <div key={book.id} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
                    <div>
                      <p className="text-white text-sm">{book.title}</p>
                      <p className="text-slate-500 text-xs">{book.partDesignation}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      book.parseStatus === 'complete' ? 'bg-green-500/10 text-green-400' : 'bg-slate-600/50 text-slate-400'
                    }`}>
                      {book.parseStatus}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Module cards */}
          <div>
            <h2 className="text-white font-semibold mb-4">Modules</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {modules.map(mod => (
                <div
                  key={mod.key}
                  className="bg-slate-800 border border-slate-700 hover:border-yellow-500/30 rounded-2xl p-5 cursor-not-allowed opacity-60"
                  title="Coming soon"
                >
                  <div className="text-2xl mb-2">{mod.icon}</div>
                  <h3 className="text-white font-medium text-sm">{mod.label}</h3>
                  <p className="text-slate-500 text-xs mt-1">Coming soon</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Navigate to http://localhost:3000/projects, click the Neverland card.
Expected: Detail page loads with all contract fields, 3 spec books listed (pending status), and 6 module cards.

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/projects/[id]/page.tsx
git commit -m "feat: add project detail page"
```

---

## Task 10: Build Edit Project Page

**Files:**
- Create: `src/app/(dashboard)/projects/[id]/edit/page.tsx`

- [ ] **Step 1: Create the edit page**

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Nav from '@/components/layout/nav'
import ProjectForm, { ProjectFormData } from '@/components/forms/project-form'

type User = { fullName: string; role: string }

export default function EditProjectPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [user, setUser] = useState<User | null>(null)
  const [initialData, setInitialData] = useState<Record<string, string | boolean> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function load() {
      const meRes = await fetch('/api/auth/me')
      const meData = await meRes.json()
      if (!meData.user) { router.push('/'); return }
      setUser(meData.user)

      const projRes = await fetch(`/api/projects/${id}`)
      if (!projRes.ok) { router.push('/projects'); return }
      const { project } = await projRes.json()

      setInitialData({
        contractNumber: project.contractNumber ?? '',
        projectName: project.projectName ?? '',
        projectIdShort: project.projectIdShort ?? '',
        agency: project.agency ?? 'NAVFAC',
        contractType: project.contractType ?? 'DBB',
        isHybrid: project.isHybrid ?? false,
        primeContractor: project.primeContractor ?? '',
        location: project.location ?? '',
        state: project.state ?? '',
        awardDate: project.awardDate ?? '',
        completionDate: project.completionDate ?? '',
        eprojectNumber: project.eprojectNumber ?? '',
        contractValue: project.contractValue ? String(project.contractValue) : '',
        complexityTier: project.complexityTier ?? 'TIER1',
        status: project.status ?? 'ACTIVE',
        description: project.description ?? '',
      })
    }
    load().catch(() => router.push('/projects'))
  }, [id, router])

  async function handleSubmit(formData: ProjectFormData) {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to update project'); return }
      router.push(`/projects/${id}`)
    } finally {
      setLoading(false)
    }
  }

  if (!user || !initialData) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <Nav user={user} />
      <main className="p-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <button onClick={() => router.push(`/projects/${id}`)} className="text-slate-400 hover:text-white text-sm transition-colors mb-4 block">
              ← Back to Project
            </button>
            <h1 className="text-white text-2xl font-bold">Edit Project</h1>
            <p className="text-slate-400 text-sm mt-1">Update the contract details for this project.</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8">
            <ProjectForm
              initialData={initialData}
              onSubmit={handleSubmit}
              submitLabel="Save Changes"
              onCancel={() => router.push(`/projects/${id}`)}
              error={error}
              loading={loading}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

From the Neverland detail page, click "Edit". Form should pre-fill with all Neverland data. Make a small change (e.g., description) and save. Should redirect back to detail page with updated data.

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/projects/[id]/edit/page.tsx
git commit -m "feat: add edit project page"
```

---

## Task 11: Update Dashboard to Show Real Projects

**Files:**
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Replace the dashboard with updated version**

Replace the entire contents of `src/app/dashboard/page.tsx` with:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/components/layout/nav'

type Project = {
  id: string
  contractNumber: string
  projectName: string
  agency: string
  status: string
}

type User = { fullName: string; role: string }

const agencyColors: Record<string, string> = {
  NAVFAC: 'bg-blue-500/10 text-blue-400',
  USACE: 'bg-green-500/10 text-green-400',
  ANG: 'bg-purple-500/10 text-purple-400',
  OTHER: 'bg-slate-500/10 text-slate-400',
}

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [projects, setProjects] = useState<Project[]>([])

  useEffect(() => {
    async function load() {
      const meRes = await fetch('/api/auth/me')
      const meData = await meRes.json()
      if (!meData.user) { router.push('/'); return }
      setUser(meData.user)

      const projRes = await fetch('/api/projects')
      const projData = await projRes.json()
      setProjects(projData.projects ?? [])
    }
    load().catch(() => router.push('/'))
  }, [router])

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <Nav user={user} />
      <main className="p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-white text-2xl font-bold mb-2">Dashboard</h1>
          <p className="text-slate-400 mb-8">Welcome back, {user.fullName.split(' ')[0]}.</p>

          {/* Quick actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <button
              onClick={() => router.push('/projects/new')}
              className="bg-slate-800 border border-slate-700 hover:border-yellow-500/50 rounded-2xl p-6 text-left transition-colors group"
            >
              <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-yellow-500/20 transition-colors">
                <span className="text-yellow-500 text-lg">+</span>
              </div>
              <h3 className="text-white font-semibold mb-1">New Project</h3>
              <p className="text-slate-400 text-sm">Start a new federal construction project</p>
            </button>

            <button
              onClick={() => router.push('/projects')}
              className="bg-slate-800 border border-slate-700 hover:border-yellow-500/50 rounded-2xl p-6 text-left transition-colors group"
            >
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors">
                <span className="text-blue-400 text-lg">🏗️</span>
              </div>
              <h3 className="text-white font-semibold mb-1">All Projects</h3>
              <p className="text-slate-400 text-sm">View and manage your projects</p>
            </button>

            <button
              disabled
              className="bg-slate-800 border border-slate-700 rounded-2xl p-6 text-left opacity-50 cursor-not-allowed"
            >
              <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center mb-4">
                <span className="text-green-400 text-lg">✓</span>
              </div>
              <h3 className="text-white font-semibold mb-1">QC Plans</h3>
              <p className="text-slate-400 text-sm">Coming soon</p>
            </button>
          </div>

          {/* Active projects */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold">Active Projects</h2>
              <button onClick={() => router.push('/projects')} className="text-yellow-500 hover:text-yellow-400 text-sm transition-colors">
                View all →
              </button>
            </div>
            {projects.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <p className="text-4xl mb-3">🏗️</p>
                <p className="font-medium">No projects yet</p>
                <p className="text-sm mt-1">Click &quot;New Project&quot; to get started</p>
              </div>
            ) : (
              <div className="space-y-2">
                {projects.slice(0, 5).map(project => (
                  <div
                    key={project.id}
                    onClick={() => router.push(`/projects/${project.id}`)}
                    className="flex items-center justify-between py-3 border-b border-slate-700/50 last:border-0 cursor-pointer hover:bg-slate-700/30 rounded-xl px-2 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${agencyColors[project.agency] ?? agencyColors.OTHER}`}>
                        {project.agency}
                      </span>
                      <span className="text-white text-sm font-medium truncate max-w-md">{project.projectName}</span>
                    </div>
                    <span className="text-slate-500 text-xs">{project.contractNumber}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Navigate to http://localhost:3000/dashboard.
Expected: Neverland project appears in "Active Projects" list. "New Project" button navigates to `/projects/new`. "All Projects" button navigates to `/projects`.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat: wire dashboard to real projects data"
```

---

## Task 12: Deploy to Vercel

**Files:** None

- [ ] **Step 1: Push all commits**

```bash
git push
```

- [ ] **Step 2: Watch deployment**

Run: `npx vercel logs qc-suite --follow`
Or check https://vercel.com/comlpliteks-projects/qc-suite

Expected: Deployment completes successfully (green).

- [ ] **Step 3: Smoke test production**

Visit https://qc-suite.vercel.app and verify:
1. Login works
2. Dashboard shows Neverland project
3. /projects shows Neverland card
4. Clicking Neverland opens detail page with all fields + 3 spec books
5. Edit button opens pre-filled form
6. New Project form creates a project and redirects to its detail page

- [ ] **Step 4: Final commit if any fixes needed**

If any production-only issues, fix, commit, and push again.
