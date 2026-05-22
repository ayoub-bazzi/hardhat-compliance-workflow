# Features Audit — HardHat Compliance
# Updated: 2026-05-22 — ALL TIERS COMPLETE, ALL BUGS FIXED

## Status: ALL UI_PASS / CODE_PASS
Every feature across Tiers 1–5 has passed both code audit and UI testing.
32 bugs found and fixed across all sessions.

---

## TIER 1 — Core Pipeline
| # | Feature | Status | Notes |
|---|---|---|---|
| 1.1 | Auth & Session | UI_PASS | — |
| 1.2 | GC Onboarding | UI_PASS | — |
| 1.3 | Multi-Tenancy / Org Isolation | UI_PASS | Some mutations use FK propagation instead of getOrgId() — valid pattern |
| 1.4 | Project Management | UI_PASS | audit_events + nudge_logs now CASCADE on project delete |
| 1.5 | Subcontractor Management | UI_PASS | — |
| 1.6 | Document Upload Pipeline | UI_PASS | — |
| 1.7 | AI Review Engine (Gemini) | UI_PASS | Certified Payroll needs explicit "EXPIRATION DATE" label — "Week Ending" alone not picked up by AI |
| 1.8 | Document Versioning (Safe Vault) | UI_PASS | — |
| 1.9 | Manual Document Entry | UI_PASS | `pending_verification` shown as "Needs GC Review" — intentional |
| 1.10 | Force Approve Override | UI_PASS | Blank/whitespace note hard-rejected — legal audit requirement, never remove |
| 1.11 | Risk Engine / Risk Register | UI_PASS | classifyRisk and DB risk_score now unified (same data source) |

## TIER 2 — Revenue-Critical
| # | Feature | Status | Notes |
|---|---|---|---|
| 2.1 | Payment Gate / Payment Status | UI_PASS | Fully automatic: doc → risk_score → payment_status |
| 2.2 | Payment Certificates | UI_PASS | DB cols: `amount`, `period_start`, `period_end` (not amount_claimed/period_from/to) |
| 2.3 | Sub Invite & Token Portal | UI_PASS | Portal writes to `documents` table (same as GC). Token expires 7 days. |
| 2.4 | Logged-in Sub Portal | UI_PASS | — |
| 2.5 | Gate Scanning / QR Safety Pass | UI_PASS | — |
| 2.6 | Safety Induction | UI_PASS | — |
| 2.7 | Pre-Qualification Submissions | UI_PASS | `prequal_submissions` has `status` + `review_notes` cols (added by migration) |

## TIER 3 — Operational
| # | Feature | Status | Notes |
|---|---|---|---|
| 3.1 | Expiry Nudge Notifications | UI_PASS | Query uses `is_current=true` filter |
| 3.2 | In-App Notifications | UI_PASS | DB cols: `type`/`message` (not event_type/body) |
| 3.3 | PWA / Push Notifications | UI_PASS | DB stores `subscription_json` JSONB (not endpoint/p256dh/auth) |
| 3.4 | Compliance Watchdog (Cron) | UI_PASS | Queries `documents`, records in `nudge_logs` |
| 3.5 | Risk Snapshot (Cron) | UI_PASS | — |
| 3.6 | Hard Stop Escalation | UI_PASS | Filters risk_score >= 71 — now live since dual-engine fixed |
| 3.7 | Audit Trail | UI_PASS | event_type CHECK: Audit/Gate Scan/Manual Override/Nudge Sent/Portal Submission/Payment Update |
| 3.8 | Reports & PDF Export | UI_PASS | — |
| 3.9 | Safety Documents | UI_PASS | DB cols: `notes` (not ai_feedback), no doc_name col |
| 3.10 | Team Management / RBAC | UI_PASS | — |
| 3.11 | GC Settings | UI_PASS | — |

## TIER 4 — Analytics
| # | Feature | Status | Notes |
|---|---|---|---|
| 4.1 | Executive Dashboard | UI_PASS | — |
| 4.2 | Subcontractor Directory | UI_PASS | — |
| 4.3 | Document Vault | UI_PASS | — |
| 4.4 | Compliance Leaderboard | UI_PASS | `subcontractor_leaderboard` view includes `project_name` via LEFT JOIN |
| 4.5 | Attendance Tracking | UI_PASS | — |
| 4.6 | Labor Analytics | UI_PASS | — |
| 4.7 | Site Monitor | UI_PASS | — |
| 4.8 | Site Journal (AI Photo Log) | UI_PASS | DB cols: `ai_caveats`, `ai_quality_rating` (no work_phase/project_id) |
| 4.9 | Project Insights | UI_PASS | — |

## TIER 5 — Supporting
| # | Feature | Status | Notes |
|---|---|---|---|
| 5.1 | Profile Photo Enrollment | UI_PASS | — |
| 5.2 | i18n / Language Switching | UI_PASS | LanguageSwitcher now wired in sidebar footer |
| 5.3 | Subcontractor Settings | UI_PASS | — |

---

## Bug Registry (all FIXED)
| # | Feature | Type | Fix Summary |
|---|---|---|---|
| 001 | 1.8 Versioning | DB_BUG | document_events CHECK constraint added 'superseded' |
| 002 | 2.2 Certs | DB_BUG | Types + code updated to amount/period_start/period_end |
| 003 | 2.7 Prequal | DB_BUG | Types corrected; status/review_notes cols added by migration |
| 004 | 3.1 Nudges | DB_BUG | nudge_logs column is recipient_contact (not recipient) |
| 005 | 3.2 Notifications | DB_BUG | in_app_notifications: type/message (not event_type/body) |
| 006 | 3.3 PWA | DB_BUG | push_subscriptions uses subscription_json JSONB |
| 007 | 3.7 Audit | DB_BUG | audit_events CHECK updated; 'Site Journal'→'Audit', 'Invite Sent'→'Audit' |
| 008 | 3.9 Safety | DB_BUG | safety_documents: notes not ai_feedback, no doc_name |
| 009 | 4.8 Journal | DB_BUG | site_journals: ai_caveats/ai_quality_rating; Gemini config unified |
| 010 | 1.1 Auth | CODE_BUG | /portal removed from PROTECTED_PREFIXES |
| 011 | 1.4 Projects | CODE_BUG | deleteProject cleans Storage files before cascade |
| 012 | 2.3 Portal | CODE_BUG | prequal_submissions: bonding_capacity_usd/trade_accreditation_no |
| 013 | 2.3 Portal | CODE_BUG | gc_notifications: no subcontractor_id column |
| 014 | 2.3 Portal | ARCH | Portal migrated to write documents table (not compliance_docs) |
| 015 | 2.3 Portal | CODE_BUG | safety_documents column fixes throughout portal-actions.ts |
| 016 | 2.3 Portal | CONFIG | Portal unified to gemini-2.5-flash + GOOGLE_GENERATIVE_AI_API_KEY |
| 017 | 2.4 Sub Portal | DB_BUG | payment_certificates: amount/period_start/period_end |
| 018 | 2.4 Sub Portal | CODE_BUG | invoice-upload type fixed to amount |
| 019 | 2.5 Gate | CODE_BUG | gate-readiness: is_current=true filter added; compliance_docs branch removed |
| 020 | 2.5 Gate | CONFIG | verify-face: GOOGLE_GENERATIVE_AI_API_KEY + gemini-2.5-flash |
| 021 | 2.2 Certs | CONFIG | check-invoice: same Gemini config fix |
| 022 | 2.5 Gate (GC) | CODE_BUG | site-readiness-action: documents + is_current, no scanned_by, added org_id |
| 023 | 5.1 Photo | CONFIG | enroll-photo + verify-safety + verify: Gemini config fix |
| 024 | 2.7 Prequal | DB_BUG | fn_review_prequal didn't exist; status/review_notes added by migration |
| 025 | 3.4 Watchdog | DB_BUG | Rewrote both passes: documents table, nudge_logs (not notification_logs) |
| 026 | 3.1 Nudges | CODE_BUG | expiry-engine: added is_current=true filter |
| 027 | 2.4 Sub Portal | DB_BUG | subcontractors RLS: added SELECT policy for user_id = auth.uid() |
| 028 | 2.4 Sub Portal | CODE_BUG | portal/page.tsx: added is_current=true to documents query |
| 029 | 2.4 Sub Portal | DB_BUG | projects RLS: added policy via subcontractors.user_id join |
| 030 | 2.7 Prequal | DB_BUG | prequal_submissions RLS: added read/write policies |
| 031 | 2.7 Prequal | CODE_BUG | prequal query: submitted_at not created_at |
| 032 | 4.4 Leaderboard | DB_BUG | subcontractor_leaderboard view: added project_name via LEFT JOIN |
