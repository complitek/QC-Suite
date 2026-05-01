# Projects Module Design
**Date:** 2026-05-01  
**Status:** Approved

## Overview
The Projects module is the foundation of Complitek. Every other module (Specs, Plans, Submittals, Schedule, EVR, QC) hangs off a project record. This spec covers the seed script for the synthetic test project, the API routes, and the three pages.

---

## Synthetic Test Project — Naval Station Neverland

Mirrors the complexity of JBPHH P209 Dry Dock 3 Replacement without using any real government data.

### Company
- **Name:** 3G2B LLC
- **SBA 8(a):** Yes
- **Linked to:** pvaldez@3g2bllc.com (existing ADMIN account)

### Project Record
| Field | Value |
|---|---|
| Contract Number | N62742-24-C-4471 |
| Project Name | Naval Station Neverland New Dry Dock 1 Construction |
| Short ID | NSN-DD1 |
| Agency | NAVFAC |
| Contract Type | HYBRID |
| Is Hybrid | true (Part A DBB + Part B DB) |
| Prime Contractor | Lost Boys Construction |
| Location | Pearl Harbor, HI |
| State | HI |
| Award Date | 2024-03-15 |
| Completion Date | 2028-09-30 |
| Contract Value | $485,000,000 |
| Complexity Tier | TIER3 |
| Status | ACTIVE |

### Spec Book Records (3 — no PDFs yet)
1. Part A — DBB Technical Specifications (PART_A)
2. Part B — DB Technical Specifications (PART_B)
3. General Project Requirements (BOTH)

---

## API Routes

All routes require authentication (JWT cookie). Scoped to the authenticated user's company.

| Method | Route | Description |
|---|---|---|
| GET | `/api/projects` | List all projects for the user's company |
| POST | `/api/projects` | Create a new project |
| GET | `/api/projects/[id]` | Get one project + its spec books |
| PUT | `/api/projects/[id]` | Update project details |
| DELETE | `/api/projects/[id]` | Soft delete — sets status to COMPLETE |

---

## Pages

### 1. Projects List — `/projects`
- Card-based layout, one card per project
- Each card shows: project name, contract number, agency badge, contract type, status, completion date
- "New Project" button (top right) → navigates to `/projects/new`
- Clicking a card → navigates to `/projects/[id]`

### 2. Create / Edit Form — `/projects/new` and `/projects/[id]/edit`
- Single form component used for both create and edit
- Fields grouped into three sections:
  - **Contract Info:** contract number, project name, short ID, agency, contract type, hybrid flag
  - **Project Details:** prime contractor, contract value, location, state, award date, completion date, eProject number, description
  - **Classification:** complexity tier, status
- Required fields clearly marked
- On save → redirect to `/projects/[id]`

### 3. Project Detail — `/projects/[id]`
- Top: full project summary (all fields, read-only)
- Edit button → navigates to `/projects/[id]/edit`
- Bottom: module card row — Specs, Plans, Submittals, Schedule, EVR, QC
  - Each card shows record count and links to that module for this project
  - Unfilled modules show "0 records" until built

---

## Implementation Approach
- **Seed first:** Load the Neverland synthetic project via a seed script before building any UI
- This ensures every page renders real data from the first render
- Seed script validates the database schema works before UI is built on top of it

---

## Notes
- All design decisions are reversible — layout, fields, and navigation can be changed as real-world use reveals gaps
- No hard deletes anywhere in the system (federal construction audit trail requirement)
