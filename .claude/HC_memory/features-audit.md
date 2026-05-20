# Features Audit — HardHat Compliance
# Updated: 2026-05-19
# Brain: update status fields after each session. Never delete bug entries — mark them FIXED.

## Status Key
| Status | Meaning |
|---|---|
| `PENDING` | Not tested yet |
| `CODE_PASS` | Claude code + DB audit clean |
| `CODE_BUG` | Claude found a bug in code review |
| `DB_BUG` | Schema or constraint issue found |
| `UI_PASS` | User tested, works correctly |
| `UI_BUG` | User found a runtime issue |
| `CONFIRMED_BUG` | Both code and UI confirm broken |
| `FIXED` | Bug resolved and verified |

## UX Note (Future Sprint)
The dashboard navigation structure feels cluttered to the user — too many top-level items with no clear grouping hierarchy. Flag for a dedicated UX restructure sprint. Do not change nav during bug-fixing sessions.

---

## TIER 1 — Core Pipeline
*Everything else depends on these. Test these first.*

---

### 1.1 Authentication & Session
- **Route:** `/login`, `middleware.ts`
- **Files:** `app/(auth)/login/page.tsx`, `app/auth/actions.ts`, `middleware.ts`
- **What it does:** Email/password login via Supabase Auth. Middleware redirects by role: GC without org → `/onboarding`, wrong role → `/unauthorized`.
- **My Code Audit:** `CODE_PASS`
- **Your UI Test:** `UI_PASS 2026-05-19`
- **Bugs:** Bug #010 (FIXED)
- **Red Flags:** —

---

### 1.2 GC Onboarding (Org Creation)
- **Route:** `/onboarding`
- **Files:** `app/onboarding/page.tsx`, `app/onboarding/actions.ts`
- **What it does:** First-time GC creates their organization profile. Sets `organization_id` on their profile. Trigger `trg_on_org_created` bootstraps admin role.
- **My Code Audit:** `CODE_PASS`
- **Your UI Test:** `UI_PASS 2026-05-19`
- **Bugs:** —
- **Red Flags:** —

---

### 1.3 Multi-Tenancy / Org Isolation
- **Files:** `lib/org.ts`, `middleware.ts`, all server actions
- **What it does:** Every query is scoped to the caller's `organization_id`. Pages use `getOrgId()`. Mutations rely on FK propagation. RLS enforces at DB level.
- **My Code Audit:** `PENDING`
- **Your UI Test:** `UI_PASS 2026-05-19`
- **Bugs:** —
- **Red Flags:** Several server actions (`uploadDocument`, `deleteDocument`, `deleteSubcontractor`) do not call `getOrgId()` — they rely on FK scoping. Valid pattern but worth auditing each one individually. Added `not-found.tsx` to project detail route — blank content area is now a proper "Project not found" page. Performance.measure Next.js dev error on notFound() is cosmetic, dev-only.

---

### 1.4 Project Management
- **Route:** `/gc/projects`
- **Files:** `app/(dashboard)/gc/projects/page.tsx`, `app/(dashboard)/gc/projects/actions.ts`, `app/(dashboard)/gc/projects/[id]/page.tsx`, `app/(dashboard)/gc/projects/[id]/project-lifecycle-actions.ts`
- **What it does:** GC creates, views, archives, and hard-deletes projects. Delete cascades to subcontractors and documents. Archive toggles status to 'archived'.
- **My Code Audit:** `CODE_BUG` → Bug #011 `FIXED`
- **Your UI Test:** `UI_PASS 2026-05-19`
- **Bugs:** Bug #011 (FIXED)
- **Red Flags:** `audit_events` and `nudge_logs` are `NO ACTION` on project delete — can leave dangling rows. Known debt.

---

### 1.5 Subcontractor Management
- **Route:** `/gc/projects/[id]`
- **Files:** `app/gc/projects/[id]/actions.ts` (`addSubcontractor`, `updateSubcontractor`, `deleteSubcontractor`)
- **What it does:** GC adds, edits, and removes subcontractors from a project. Delete cascades to documents and storage files.
- **My Code Audit:** `CODE_PASS`
- **Your UI Test:** `UI_PASS 2026-05-19`
- **Bugs:** —
- **Red Flags:** —

---

### 1.6 Document Upload Pipeline (The Bouncer)
- **Route:** `/gc/projects/[id]` → upload dialog
- **Files:** `app/gc/projects/[id]/actions.ts` (`uploadDocument`), `app/(dashboard)/gc/projects/[id]/upload-document-dialog.tsx`
- **What it does:** GC uploads COI / Certified Payroll / W9. Three paths: pre-extracted AI data (instant result), manual entry (pending_verification), or fallback full AI review. Stores file in `compliance-docs` bucket.
- **My Code Audit:** `CODE_PASS`
- **Your UI Test:** `UI_PASS 2026-05-19`
- **Bugs:** —
- **Red Flags:** —

---

### 1.7 AI Review Engine (The Bouncer — Gemini)
- **Files:** `app/gc/projects/[id]/ai-actions.ts` (`runAiReview`, `scanDocumentFile`)
- **What it does:** Sends document as base64 to Gemini 2.5 Flash (`v1beta`). Extracts company name, expiry date, GL coverage. Applies business rules server-side. Returns approved / rejected / pending_verification. Sends verdict email to sub.
- **My Code Audit:** `CODE_PASS`
- **Your UI Test:** `UI_PASS 2026-05-19`
- **Bugs:** —
- **Red Flags:** No real timeout — 30s error message is caught text from Gemini 429/503, not a `Promise.race`. If Gemini hangs without error, the request hangs with it. Note: Certified Payroll doc needs explicit "EXPIRATION DATE" label — "Week Ending" alone is not picked up by AI.

---

### 1.8 Document Versioning (Safe Vault)
- **Route:** `/gc/projects/[id]` → doc history drawer
- **Files:** `app/gc/projects/[id]/actions.ts`, `app/gc/projects/[id]/ai-actions.ts`, `app/(dashboard)/gc/projects/[id]/doc-history-drawer.tsx`
- **What it does:** Golden Rule — only one `is_current = true` per (subcontractor_id, type). New approved doc promotes itself, archives siblings. Delete promotes next best. Superseded docs get an audit event.
- **My Code Audit:** `CODE_BUG` → `FIXED`
- **Your UI Test:** `PENDING`
- **Bugs:**
  - `DB_BUG` **[FIXED 2026-05-19]** `document_events` CHECK constraint did not include `'superseded'`. Every supersede event insert was silently rejected by the DB. Fixed by migration `fix_document_events_superseded_constraint` — constraint now includes all 5 event types.
- **Red Flags:** —

---

### 1.9 Manual Document Entry
- **Route:** `/gc/projects/[id]` → upload dialog → manual toggle
- **Files:** `app/gc/projects/[id]/actions.ts` (`uploadDocument` with `verified_by = 'manual'`)
- **What it does:** GC enters document metadata manually (company name + expiry). Status set to `pending_verification`. Skips AI pipeline entirely.
- **My Code Audit:** `PENDING`
- **Your UI Test:** `PENDING`
- **Bugs:** —
- **Red Flags:** —

---

### 1.10 Force Approve Override
- **Route:** `/gc/projects/[id]` → doc actions menu
- **Files:** `app/gc/projects/[id]/audit-trail-actions.ts`, `app/(dashboard)/gc/projects/[id]/force-approve-button.tsx`
- **What it does:** GC manually approves any document with a mandatory written justification note. Blank/whitespace note is rejected hard. Logs `manual_override` event.
- **My Code Audit:** `CODE_PASS`
- **Your UI Test:** `PENDING`
- **Bugs:** —
- **Red Flags:** —

---

### 1.11 Risk Engine / Risk Register
- **Route:** `/gc/risk`
- **Files:** `app/(dashboard)/gc/risk/page.tsx` (`classifyRisk`), `components/risk-score-bar.tsx`
- **What it does:** Pure TypeScript server-side. Reads `documents` table (`is_current = true`). Classifies each sub as CRITICAL (rejected or expired doc) / ELEVATED (missing or unverified W9/COI) / LOW (all approved). Renders fleet heatmap + sortable register.
- **My Code Audit:** `CODE_PASS`
- **Your UI Test:** `PENDING`
- **Bugs:** —
- **Red Flags:** UI risk level (`classifyRisk`) and DB `risk_score` field are calculated by different engines and can show conflicting values. The `compliance_docs` trigger engine (which drives `risk_score`) has 0 rows. `risk_score` on subcontractors is effectively stale/manual. Known dual-engine debt.

---

## TIER 2 — Revenue-Critical Features

---

### 2.1 Payment Gate / Payment Status
- **Route:** `/gc/finance`
- **Files:** `app/(dashboard)/gc/finance/page.tsx`, `app/(dashboard)/gc/finance/finance-actions.ts`
- **What it does:** Displays payment status per sub ('Clear to Pay' / 'Compliance Hold' / 'Manual Review'). DB trigger `trg_payment_gate` auto-sets based on `risk_score` thresholds. Finance role can manually override.
- **My Code Audit:** `PENDING`
- **Your UI Test:** `PENDING`
- **Bugs:** —
- **Red Flags:** Because `risk_score` is stale (see 1.11), the automatic payment gate is also effectively non-functional. Payment holds are not auto-triggering from real document state.

---

### 2.2 Payment Certificates
- **Route:** `/gc/finance/certificates`
- **Files:** `app/(dashboard)/gc/finance/certificates/page.tsx`, `app/(dashboard)/gc/finance/certificates/certificate-actions.ts`, `app/(dashboard)/gc/finance/export-button.tsx`
- **What it does:** GC creates payment certificates for subs. AI checks invoice amounts. Compliance snapshot taken at time of cert creation. PDF export via jsPDF.
- **My Code Audit:** `PENDING`
- **Your UI Test:** `PENDING`
- **Bugs:** —
- **Red Flags:** Types file has 15+ columns for `payment_certificates`. Live DB has 10 with different names (`amount` not `amount_claimed`, `period_start/end` not `period_from/to`). Code that uses the wrong column names will fail silently or crash.

---

### 2.3 Subcontractor Invite & Portal (Token Upload)
- **Route:** `/portal/upload/[token]` (public), `/gc/projects/[id]` → invite button
- **Files:** `app/gc/projects/[id]/actions.ts` (`sendInviteEmail`), `app/portal/upload/[token]/page.tsx`, `app/portal/upload/[token]/portal-actions.ts`, `app/portal/upload/[token]/portal-client.tsx`
- **What it does:** GC sends invite email with HMAC-signed token. Sub accesses public portal, uploads COI/Certified Payroll/W9 docs. Token expires after 7 days. Portal writes to `documents` table — same as GC dashboard. GC sees portal uploads immediately.
- **My Code Audit:** `CODE_PASS` — Bugs #010, #012, #013, #014, #015, #016 all `FIXED`.
- **Your UI Test:** `PENDING`
- **Bugs:** All fixed. See bug registry for details.
- **Red Flags:** —

---

### 2.4 Logged-in Subcontractor Portal
- **Route:** `/subcontractor/portal`
- **Files:** `app/(dashboard)/subcontractor/portal/page.tsx`, `app/(dashboard)/subcontractor/portal/actions.ts`, `app/(dashboard)/subcontractor/portal/safety-pass.tsx`, `app/(dashboard)/subcontractor/portal/invoice-upload.tsx`
- **What it does:** Sub views their own compliance status, safety pass (QR code), uploads invoices, sees their document state.
- **My Code Audit:** `PENDING`
- **Your UI Test:** `PENDING`
- **Bugs:** —
- **Red Flags:** —

---

### 2.5 Gate Scanning / QR Safety Pass
- **Route:** `/gate/verify/[token]` (public), `/gc/scan`
- **Files:** `app/gate/verify/[token]/page.tsx`, `app/gate/verify/[token]/camera-capture.tsx`, `app/api/gate/verify-face/route.ts`, `lib/gate-readiness.ts`, `lib/site-pass-token.ts`
- **What it does:** Sub presents QR code at site gate. Scanner reads QR, verifies HMAC token, checks compliance state. Optional face match via camera. Logs result to `site_access_logs`. Grants or denies entry.
- **My Code Audit:** `PENDING`
- **Your UI Test:** `PENDING`
- **Bugs:** —
- **Red Flags:** —

---

### 2.6 Safety Induction
- **Route:** `/gc/risk/[id]`
- **Files:** `app/(dashboard)/gc/risk/[id]/induction-panel.tsx`, `app/(dashboard)/gc/risk/[id]/induction-actions.ts`
- **What it does:** GC marks sub as safety-inducted. Sets `safety_induction_complete = true` and `induction_date`. Required for site access in some gate configs.
- **My Code Audit:** `PENDING`
- **Your UI Test:** `PENDING`
- **Bugs:** —
- **Red Flags:** —

---

### 2.7 Pre-Qualification Submissions
- **Route:** `/gc/risk/[id]`
- **Files:** `app/(dashboard)/gc/risk/[id]/prequal-review.tsx`, `app/(dashboard)/gc/risk/[id]/prequal-actions.ts`
- **What it does:** Sub submits pre-qual form (incident history, bonding capacity, trade accreditation). GC reviews and approves/rejects.
- **My Code Audit:** `CODE_BUG` → Bug #003 partially FIXED
- **Your UI Test:** `PENDING`
- **Bugs:** Bug #003 (types + UI fixed; `prequal_status` hardcoded to 'pending' in UI since col doesn't exist)
- **Red Flags:** `prequal_actions.ts` calls `fn_review_prequal` DB function — verify this function exists in Supabase before testing. The review approve/reject flow depends on it.

---

## TIER 3 — Operational Features

---

### 3.1 Expiry Nudge Notifications
- **Files:** `lib/expiry-engine.ts`, `lib/notifications.ts`, `app/api/compliance/expiry-nudge/route.ts`, `app/api/cron/expiry-check/route.ts`
- **What it does:** Detects documents expiring in 7 days or 48 hours. Sends email/SMS nudge to sub. Logs to `nudge_logs`.
- **My Code Audit:** `PENDING`
- **Your UI Test:** `PENDING`
- **Bugs:** —
- **Red Flags:** `nudge_logs.recipient` in types file — column is actually `recipient_contact` in DB. Any insert using the types file field name will fail.

---

### 3.2 In-App Notifications
- **Route:** Notification bell in dashboard header
- **Files:** `components/notification-bell.tsx`, `app/(dashboard)/gc/notifications/actions.ts`
- **What it does:** Real-time in-app alerts for document rejections, gate denials, expiry warnings, prequal submissions.
- **My Code Audit:** `PENDING`
- **Your UI Test:** `PENDING`
- **Bugs:** —
- **Red Flags:** Types file has `event_type` enum, `body`, `subcontractor_id` for `in_app_notifications`. DB has `type` (text, default 'info'), `message` (not `body`), no `subcontractor_id`. Column name mismatches will cause runtime failures.

---

### 3.3 PWA / Push Notifications
- **Files:** `app/api/push/subscribe/route.ts`, `lib/push-notification.ts`, `components/pwa-register.tsx`, `public/sw.js`
- **What it does:** Browser subscribes to Web Push. Subscription stored in `push_subscriptions`. Server sends push via Web Push protocol.
- **My Code Audit:** `PENDING`
- **Your UI Test:** `PENDING`
- **Bugs:** —
- **Red Flags:** Types file expects `endpoint`, `p256dh`, `auth` columns. DB stores everything in a single `subscription_json` JSONB column. Any code using the old column names will fail to read or write subscriptions.

---

### 3.4 Compliance Watchdog (Cron)
- **Files:** `app/api/cron/compliance-watchdog/route.ts`, `lib/watchdog-engine.ts`
- **What it does:** Scheduled job scans all documents, flags expired ones, triggers escalations. Writes to `system_logs`.
- **My Code Audit:** `PENDING`
- **Your UI Test:** `PENDING`
- **Bugs:** —
- **Red Flags:** —

---

### 3.5 Risk Snapshot (Cron)
- **Files:** `app/api/cron/risk-snapshot/route.ts`
- **What it does:** Scheduled job calls `fn_take_risk_snapshot()`. Writes to `project_risk_history` for trend analytics.
- **My Code Audit:** `PENDING`
- **Your UI Test:** `PENDING`
- **Bugs:** —
- **Red Flags:** —

---

### 3.6 Hard Stop Escalation
- **Files:** `app/api/compliance/hard-stop-check/route.ts`
- **What it does:** Triggers `create_hard_stop_escalation()` DB function. Escalates non-compliant sub to hard-stop status blocking all access.
- **My Code Audit:** `PENDING`
- **Your UI Test:** `PENDING`
- **Bugs:** —
- **Red Flags:** —

---

### 3.7 Audit Trail
- **Route:** `/gc/audit`
- **Files:** `app/(dashboard)/gc/audit/page.tsx`, `components/audit-timeline.tsx`, `components/audit-export-button.tsx`
- **What it does:** Displays `audit_events` and `document_events` in a timeline. GC can export as PDF/CSV.
- **My Code Audit:** `PENDING`
- **Your UI Test:** `PENDING`
- **Bugs:** —
- **Red Flags:** `audit_events` check constraint in DB only has 6 event types. Types file defines 10. Any code inserting an event type not in the DB constraint will fail silently.

---

### 3.8 Reports & PDF Export
- **Route:** `/gc/reports`
- **Files:** `app/(dashboard)/gc/reports/page.tsx`, `app/(dashboard)/gc/reports/report-actions.ts`, `app/(dashboard)/gc/reports/report-client.tsx`
- **What it does:** GC generates compliance reports per project or org. PDF export via jsPDF + jspdf-autotable.
- **My Code Audit:** `PENDING`
- **Your UI Test:** `PENDING`
- **Bugs:** —
- **Red Flags:** —

---

### 3.9 Safety Documents
- **Route:** `/gc/risk/[id]` (insurance tab) or `/gc/insurance`
- **Files:** `app/(dashboard)/gc/insurance/page.tsx`, `app/api/compliance/verify-safety/route.ts`
- **What it does:** Sub uploads RAMS / Safety Policy / Training Records. AI reviews for risk level and hazard identification.
- **My Code Audit:** `CODE_BUG` → Bug #008 `FIXED`
- **Your UI Test:** `PENDING`
- **Bugs:** Bug #008 (FIXED — types + verify-safety route column names corrected)
- **Red Flags:** —

---

### 3.10 Team Management / RBAC
- **Route:** `/gc/settings/team`
- **Files:** `app/(dashboard)/gc/settings/team/page.tsx`, `app/(dashboard)/gc/settings/team/actions.ts`, `app/(dashboard)/gc/settings/team/team-client.tsx`
- **What it does:** GC admin invites team members and assigns roles (`admin`, `project_manager`, `auditor`, `finance`). DB function `get_my_app_role()` enforces role checks.
- **My Code Audit:** `PENDING`
- **Your UI Test:** `PENDING`
- **Bugs:** —
- **Red Flags:** —

---

### 3.11 GC Settings
- **Route:** `/gc/settings`
- **Files:** `app/(dashboard)/gc/settings/page.tsx`, `app/(dashboard)/gc/settings/settings-actions.ts`, `app/(dashboard)/gc/settings/settings-tabs.tsx`
- **What it does:** GC updates org profile, company details, notification preferences.
- **My Code Audit:** `PENDING`
- **Your UI Test:** `PENDING`
- **Bugs:** —
- **Red Flags:** —

---

## TIER 4 — Analytics & Visibility

---

### 4.1 Executive Dashboard
- **Route:** `/gc/executive`
- **Files:** `app/(dashboard)/gc/executive/page.tsx`, `components/global-compliance-status.tsx`
- **What it does:** High-level org-wide compliance summary. Key metrics: total subs, critical/elevated/low risk counts, overall compliance rate.
- **My Code Audit:** `PENDING`
- **Your UI Test:** `PENDING`
- **Bugs:** —
- **Red Flags:** —

---

### 4.2 Subcontractor Directory
- **Route:** `/gc/subcontractors`
- **Files:** `app/(dashboard)/gc/subcontractors/page.tsx`, `app/(dashboard)/gc/subcontractors/subcontractor-directory.tsx`
- **What it does:** Cross-project view of all subcontractors in the org with compliance status.
- **My Code Audit:** `PENDING`
- **Your UI Test:** `PENDING`
- **Bugs:** —
- **Red Flags:** —

---

### 4.3 Document Vault
- **Route:** `/gc/documents`
- **Files:** `app/(dashboard)/gc/documents/page.tsx`, `app/(dashboard)/gc/documents/document-vault.tsx`, `app/(dashboard)/gc/documents/vault-actions.ts`
- **What it does:** Org-wide view of all documents across all projects and subs. Filter by type, status, expiry.
- **My Code Audit:** `PENDING`
- **Your UI Test:** `PENDING`
- **Bugs:** —
- **Red Flags:** —

---

### 4.4 Compliance Leaderboard
- **Route:** `/gc/leaderboard`
- **Files:** `app/(dashboard)/gc/leaderboard/page.tsx`, `components/compliance-leaderboard.tsx`
- **What it does:** Ranks subcontractors by compliance score using the `subcontractor_leaderboard` DB view.
- **My Code Audit:** `PENDING`
- **Your UI Test:** `PENDING`
- **Bugs:** —
- **Red Flags:** —

---

### 4.5 Attendance Tracking
- **Route:** `/gc/attendance`
- **Files:** `app/(dashboard)/gc/attendance/page.tsx`, `components/attendance-heatmap-chart.tsx`
- **What it does:** Visualises daily site access grant/deny counts from `attendance_daily_summary` view. Heatmap chart per sub.
- **My Code Audit:** `PENDING`
- **Your UI Test:** `PENDING`
- **Bugs:** —
- **Red Flags:** —

---

### 4.6 Labor Analytics
- **Route:** `/gc/labor`
- **Files:** `app/(dashboard)/gc/labor/page.tsx`, `components/labor-chart.tsx`, `lib/labor-analytics.ts`
- **What it does:** Analyses workforce hours and attendance patterns. Chart visualisation.
- **My Code Audit:** `PENDING`
- **Your UI Test:** `PENDING`
- **Bugs:** —
- **Red Flags:** —

---

### 4.7 Site Monitor
- **Route:** `/gc/site-monitor`
- **Files:** `app/(dashboard)/gc/site-monitor/page.tsx`, `components/monitor-client.tsx`, `components/last-seen-workers.tsx`, `components/weather-watchdog.tsx`
- **What it does:** Live site overview — last seen workers (from `last_seen_workers` view), weather conditions, active alerts.
- **My Code Audit:** `PENDING`
- **Your UI Test:** `PENDING`
- **Bugs:** —
- **Red Flags:** —

---

### 4.8 Site Journal (AI Photo Log)
- **Route:** `/gc/journal`
- **Files:** `app/(dashboard)/gc/journal/page.tsx`, `app/(dashboard)/gc/journal/journal-upload.tsx`, `app/api/journal/generate/route.ts`, `components/latest-journal-card.tsx`
- **What it does:** GC uploads site photo. Gemini analyses it and generates an AI summary with caveats and quality rating. Stored in `site_journals`.
- **My Code Audit:** `PENDING`
- **Your UI Test:** `PENDING`
- **Bugs:** —
- **Red Flags:** Types file has `work_phase`, `attendance_context`, `project_id`, `photo_quality`, `caveats`. DB has `ai_caveats`, `ai_quality_rating` — no `work_phase`, no `project_id`, no `attendance_context`. Code using wrong column names will fail.

---

### 4.9 Project Insights
- **Route:** `/gc/projects/[id]/insights`
- **Files:** `app/(dashboard)/gc/projects/[id]/insights/page.tsx`, `app/(dashboard)/gc/projects/[id]/insights/insights-client.tsx`
- **What it does:** Per-project analytics — risk trend, compliance rate over time using `project_risk_analytics` view.
- **My Code Audit:** `PENDING`
- **Your UI Test:** `PENDING`
- **Bugs:** —
- **Red Flags:** —

---

## TIER 5 — Supporting Systems

---

### 5.1 Profile Photo Enrollment
- **Route:** `/subcontractor/onboarding/photo`
- **Files:** `app/(dashboard)/subcontractor/onboarding/photo/page.tsx`, `app/(dashboard)/subcontractor/onboarding/photo/enrollment-client.tsx`, `app/api/portal/enroll-photo/route.ts`
- **What it does:** Sub enrolls their face photo for gate face-match verification.
- **My Code Audit:** `PENDING`
- **Your UI Test:** `PENDING`
- **Bugs:** —
- **Red Flags:** —

---

### 5.2 i18n / Language Switching
- **Files:** `lib/i18n.ts`, `components/language-provider.tsx`, `components/language-switcher.tsx`, `messages/en.json`, `messages/ar.json`
- **What it does:** English and Arabic language support.
- **My Code Audit:** `PENDING`
- **Your UI Test:** `PENDING`
- **Bugs:** —
- **Red Flags:** —

---

### 5.3 Subcontractor Settings
- **Route:** `/subcontractor/settings`
- **Files:** `app/(dashboard)/subcontractor/settings/page.tsx`, `app/(dashboard)/subcontractor/settings/sub-settings-tabs.tsx`
- **What it does:** Sub updates their own profile details.
- **My Code Audit:** `PENDING`
- **Your UI Test:** `PENDING`
- **Bugs:** —
- **Red Flags:** —

---

## Bug Registry
*All confirmed bugs logged here regardless of whether fixed.*

| # | Feature | Type | Description | Status |
|---|---|---|---|---|
| 001 | 1.8 Document Versioning | `DB_BUG` | `document_events` CHECK constraint missing `'superseded'` — all supersede inserts silently failed | `FIXED 2026-05-19` |
| 002 | 2.2 Payment Certificates | `DB_BUG` | Types file column names differ from live DB (`amount_claimed` vs `amount`, `period_from/to` vs `period_start/end`) — code using types will break | `PENDING` |
| 003 | 2.7 Pre-qual Submissions | `DB_BUG` | Types file has `bonding_capacity`, `trade_accreditation`, `notes`, `prequal_status` — none exist in DB | `PARTIAL FIX 2026-05-19` — types file corrected, prequal-review.tsx updated to use correct column names; `prequal_status` hardcoded to 'pending' in UI since col doesn't exist; `prequal_actions.ts` calls `fn_review_prequal` — verify this DB function exists |
| 004 | 3.1 Expiry Nudges | `DB_BUG` | `nudge_logs.recipient` in types — DB column is `recipient_contact` | `PENDING` |
| 005 | 3.2 In-App Notifications | `DB_BUG` | Types has `event_type` enum + `body` + `subcontractor_id` — DB has `type` text + `message` + no `subcontractor_id` | `PENDING` |
| 006 | 3.3 PWA Push | `DB_BUG` | Types expects `endpoint/p256dh/auth` columns — DB uses single `subscription_json` JSONB | `PENDING` |
| 007 | 3.7 Audit Trail | `DB_BUG` | Types defines 10 `audit_events` event types — DB CHECK only allows 6 | `PENDING` |
| 008 | 3.9 Safety Documents | `DB_BUG` | Types has `ai_feedback`, `doc_name`, `reviewed_by/at` — none exist in DB | `FIXED 2026-05-19` — types file corrected, verify-safety/route.ts and portal-actions.ts updated to use correct columns (`notes` not `ai_feedback`) |
| 009 | 4.8 Site Journal | `DB_BUG` | Types has `work_phase`, `project_id`, `attendance_context` — none exist in DB | `PENDING` |
| 010 | 1.1 Auth / Middleware | `CODE_BUG` | `/portal` in `PROTECTED_PREFIXES` blocked unauthenticated subs from accessing public token portal — `portal-actions.ts` uses service client, no auth needed | `FIXED 2026-05-19` |
| 011 | 1.4 Project Management | `CODE_BUG` | `deleteProject` didn't clean Supabase Storage files before cascade delete — orphaned files accumulated indefinitely | `FIXED 2026-05-19` |
| 012 | 2.3 Sub Portal | `CODE_BUG` | `submitPortal` inserted `bonding_capacity` + `trade_accreditation` (wrong names) and `organization_id` (no such column) into `prequal_submissions` — DB columns are `bonding_capacity_usd` (numeric) + `trade_accreditation_no` | `FIXED 2026-05-19` |
| 013 | 2.3 Sub Portal | `CODE_BUG` | `submitPortal` inserted `subcontractor_id` into `gc_notifications` — column does not exist in DB | `FIXED 2026-05-19` |
| 014 | 2.3 Sub Portal | `ARCHITECTURAL` | Portal pipeline (`uploadAndVerify`, `reAuditDoc`) writes to `compliance_docs` (dead table, 0 rows). GC dashboard reads `documents` table. Sub portal uploads are completely invisible to GC. | `FIXED 2026-05-19` — Decision: Option A (migrate to `documents`). Portal now writes to `documents` with full Golden Rule versioning. Doc types aligned to 'COI'/'Certified Payroll'/'W9'. Portal uploads visible to GC immediately. |
| 015 | 2.3 Sub Portal | `CODE_BUG` | `safety_documents` column mismatches throughout portal-actions.ts: `doc_name` (no column), `ai_feedback` (DB has `notes`), `high_risk_compliant` (no column) — fixed all INSERT/UPDATE/SELECT operations | `FIXED 2026-05-19` |
| 016 | 2.3 Sub Portal | `CONFIG` | Portal uses `gemini-2.0-flash` + `GEMINI_API_KEY` env var. Main engine uses `gemini-2.5-flash` + `GOOGLE_GENERATIVE_AI_API_KEY`. Either unify config or document as intentional split. | `FIXED 2026-05-19` — Decision: Unified. Portal now uses `gemini-2.5-flash` + `GOOGLE_GENERATIVE_AI_API_KEY`. `GEMINI_API_KEY` env var retired. |
