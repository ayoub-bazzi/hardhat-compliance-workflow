---
name: HardHat Compliance — Project Overview
description: Construction compliance SaaS; Phase 25 complete, multi-tenant GC/sub platform
type: project
---

Next.js 16.2.4 App Router + Supabase. Two roles: GC (general contractor) and subcontractor.
Full memory lives in `.claude/HC_memory/`. This is a summary pointer only.

**Current state (as of 2026-05-19):**
- 25 phases shipped. Core compliance pipeline, versioning engine, risk register, payment gate, gate scanning, site journals, payment certificates, PWA push notifications, RBAC, and subcontractor portal are all live.
- Live DB has 19 tables, 4 views, 9 triggers, 17 functions.
- Active known bug: `document_events` check constraint missing `'superseded'` — code writes it, DB silently rejects it.

**Key architecture facts:**
- Multi-tenancy: org isolation via RLS + `organization_id` on every table. Pages use `getOrgId()`, mutations use FK propagation.
- AI pipeline: Gemini 2.5 Flash (`v1beta`) for document extraction — base64 inline, no public URLs.
- Dual risk engine: UI classifyRisk reads `documents` table; DB triggers watch `compliance_docs` (0 rows, decoupled by design).
- Server action files at `app/gc/projects/[id]/` — NOT in the `(dashboard)` route group.

**Why:** Full detail in `.claude/HC_memory/` — read those files at session start for complete context.
**How to apply:** Always check `.claude/HC_memory/current-state.md` first when resuming work.
