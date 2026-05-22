# Database Intelligence Layer — HardHat Compliance
# Source: Live Supabase Query — Verified 2026-05-19
# Target Engine: PostgreSQL 15+ via Supabase

---

## ⚠️ Known Live Bug
`document_events.event_type` DB CHECK constraint only allows:
`'uploaded' | 'ai_review' | 'notification_sent' | 'manual_override'`
The code writes `'superseded'` events in both `uploadDocument` and `runAiReview`.
Those inserts **silently fail** every time. The constraint must be altered to include `'superseded'`.

## ⚠️ Types File Drift
`types/database.types.ts` is out of sync with the live DB on several tables.
Always trust this file (sourced from live Supabase) over the types file for schema truth.
Notable drifts: push_subscriptions, payment_certificates, site_journals,
in_app_notifications, prequal_submissions, nudge_logs, gc_notifications, audit_events.
`notification_logs` exists in the types file but does NOT exist in the live DB.

---

## 1. Tables

### organizations
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | gen_random_uuid() |
| name | text | NOT NULL |
| size | text | NULLABLE |
| owner_id | uuid | NOT NULL → auth.users.id |
| created_at | timestamptz | DEFAULT now() |

### profiles
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | → auth.users.id |
| full_name | text | NULLABLE |
| company_name | text | NULLABLE |
| role | user_role | ENUM: 'gc', 'subcontractor' |
| app_role | app_role | ENUM: 'admin','project_manager','auditor','finance','subcontractor' — DEFAULT 'project_manager' |
| organization_id | uuid | NULLABLE → organizations.id |
| created_at | timestamptz | DEFAULT now() |

### projects
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | gen_random_uuid() |
| name | text | NOT NULL |
| location | text | NULLABLE |
| status | project_status | ENUM: 'active','archived' — DEFAULT 'active' |
| organization_id | uuid | NULLABLE → organizations.id |
| created_at | timestamptz | DEFAULT now() |

### subcontractors
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | gen_random_uuid() |
| project_id | uuid | NOT NULL → projects.id ON DELETE CASCADE |
| organization_id | uuid | NULLABLE → organizations.id |
| user_id | uuid | NULLABLE → auth.users.id |
| company_name | text | NOT NULL |
| contact_email | text | NOT NULL |
| compliance_status | compliance_status | ENUM: 'compliant','warning','non_compliant' — DEFAULT 'compliant' |
| risk_score | smallint | NULLABLE — DEFAULT 0 |
| payment_status | payment_status | ENUM: 'Clear to Pay','Compliance Hold','Manual Review' — NULLABLE — DEFAULT 'Manual Review' |
| primary_contact_name | text | NULLABLE |
| primary_contact_phone | text | NULLABLE |
| invite_token | text | NULLABLE — UNIQUE |
| invite_expires_at | timestamptz | NULLABLE |
| portal_submitted_at | timestamptz | NULLABLE |
| profile_photo_url | text | NULLABLE |
| safety_induction_complete | boolean | DEFAULT false |
| induction_date | date | NULLABLE |
| created_at | timestamptz | DEFAULT now() |

### documents (Primary UI Compliance Ledger)
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | gen_random_uuid() |
| subcontractor_id | uuid | NOT NULL → subcontractors.id ON DELETE CASCADE |
| organization_id | uuid | NULLABLE → organizations.id — auto-populated by trigger |
| type | document_type | ENUM: 'COI','Certified Payroll','W9' |
| status | document_status | ENUM: 'pending','approved','rejected','pending_verification' — DEFAULT 'pending' |
| is_current | boolean | DEFAULT false — only one true per (subcontractor_id, type) |
| expiry_date | date | NULLABLE |
| file_path | text | NULLABLE |
| rejection_reason | text | NULLABLE |
| last_notified_at | timestamptz | NULLABLE |
| created_at | timestamptz | DEFAULT now() |

### document_events (Append-Only Audit Log)
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | gen_random_uuid() |
| document_id | uuid | NOT NULL → documents.id ON DELETE CASCADE |
| event_type | text | CHECK: 'uploaded','ai_review','notification_sent','manual_override' ⚠️ 'superseded' NOT in constraint — see bug above |
| actor | text | NULLABLE |
| metadata | jsonb | DEFAULT '{}' |
| created_at | timestamptz | DEFAULT now() |

### system_logs (Cron / Background Audit)
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | gen_random_uuid() |
| event | text | NOT NULL |
| level | text | CHECK: 'info','warn','error' |
| message | text | NOT NULL |
| metadata | jsonb | DEFAULT '{}' |
| created_at | timestamptz | DEFAULT now() |

### compliance_docs (Legacy / Decoupled Risk Engine)
⚠️ This table has 0 rows. The DB risk triggers watch it, but the UI pipeline writes to `documents`. They are intentionally decoupled — do not write to this table in new code.
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | gen_random_uuid() |
| organization_id | uuid | NULLABLE → organizations.id |
| subcontractor_id | uuid | NULLABLE → subcontractors.id |
| doc_type | compliance_doc_type | ENUM: 'COI','License','Golden Thread' |
| file_path | text | NOT NULL |
| expiry_date | date | NULLABLE |
| audit_status | audit_status | ENUM: 'Pending','Verified','Flagged' — NULLABLE — DEFAULT 'Pending' |
| notes | text | NULLABLE |
| created_at | timestamptz | NULLABLE — DEFAULT now() |
| updated_at | timestamptz | NULLABLE — DEFAULT now() |

### site_access_logs (Gate Scan Log)
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | gen_random_uuid() |
| organization_id | uuid | NULLABLE → organizations.id |
| subcontractor_id | uuid | NULLABLE → subcontractors.id |
| result | access_result | ENUM: 'GRANTED','DENIED' |
| denial_reasons | text[] | NULLABLE |
| gate_location | text | NULLABLE |
| qr_payload | text | NULLABLE |
| scanned_at | timestamptz | NULLABLE — DEFAULT now() |
| photo_url | text | NULLABLE |
| face_match_score | integer | NULLABLE |
| face_match_result | text | NULLABLE |
| created_at | timestamptz | NULLABLE — DEFAULT now() |

### prequal_submissions
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | gen_random_uuid() |
| subcontractor_id | uuid | NULLABLE → subcontractors.id |
| had_site_incident | boolean | NULLABLE — DEFAULT false |
| bonding_capacity_usd | numeric | NULLABLE |
| trade_accreditation_no | text | NULLABLE |
| submitted_at | timestamptz | NULLABLE — DEFAULT now() |

### gc_notifications
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | gen_random_uuid() |
| organization_id | uuid | NULLABLE → organizations.id |
| message | text | NOT NULL |
| is_read | boolean | NULLABLE — DEFAULT false |
| created_at | timestamptz | NULLABLE — DEFAULT now() |

### audit_events (Append-Only Event Log)
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | gen_random_uuid() |
| subcontractor_id | uuid | NULLABLE → subcontractors.id |
| organization_id | uuid | NULLABLE → organizations.id |
| user_id | uuid | NULLABLE → auth.users.id |
| event_type | text | CHECK: 'Audit','Gate Scan','Manual Override','Nudge Sent','Portal Submission','Payment Update' |
| description | text | NULLABLE |
| actor | text | NULLABLE — DEFAULT 'HardHat AI' |
| metadata | jsonb | NULLABLE |
| created_at | timestamptz | NULLABLE — DEFAULT now() |

### nudge_logs
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | gen_random_uuid() |
| organization_id | uuid | NULLABLE → organizations.id |
| subcontractor_id | uuid | NULLABLE → subcontractors.id |
| channel | text | NOT NULL |
| alert_type | text | NOT NULL |
| recipient_contact | text | NOT NULL — ⚠️ types file calls this 'recipient' — use 'recipient_contact' |
| status | text | NULLABLE — DEFAULT 'sent' |
| metadata | jsonb | NULLABLE |
| created_at | timestamptz | NULLABLE — DEFAULT now() |

### project_risk_history
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | gen_random_uuid() |
| project_id | uuid | NOT NULL → projects.id |
| organization_id | uuid | NULLABLE → organizations.id |
| snapshot_date | date | DEFAULT CURRENT_DATE |
| avg_risk_score | smallint | DEFAULT 0 |
| total_subs | integer | DEFAULT 0 |
| site_ready_pct | integer | DEFAULT 0 |
| payment_blocked_pct | integer | DEFAULT 0 |
| created_at | timestamptz | DEFAULT now() |

### safety_documents
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | gen_random_uuid() |
| subcontractor_id | uuid | NULLABLE → subcontractors.id |
| project_id | uuid | NULLABLE → projects.id |
| organization_id | uuid | NULLABLE → organizations.id |
| doc_type | text | NOT NULL |
| file_path | text | NOT NULL |
| risk_level | text | NULLABLE — DEFAULT 'Medium' |
| identified_hazards | jsonb | NULLABLE — DEFAULT '[]' |
| has_risk_matrix | boolean | NULLABLE — DEFAULT false |
| has_emergency_procedures | boolean | NULLABLE — DEFAULT false |
| approval_status | text | NULLABLE — DEFAULT 'Under Review' |
| notes | text | NULLABLE |
| created_at | timestamptz | NULLABLE — DEFAULT now() |
| updated_at | timestamptz | NULLABLE — DEFAULT now() |

### push_subscriptions
⚠️ DB stores the full Web Push subscription as a single JSONB blob. The types file incorrectly splits this into endpoint/p256dh/auth columns — those do not exist in the DB.
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | gen_random_uuid() |
| user_id | uuid | NULLABLE → auth.users.id |
| organization_id | uuid | NULLABLE → organizations.id |
| subscription_json | jsonb | NOT NULL — full Web Push subscription object |
| created_at | timestamptz | NULLABLE — DEFAULT now() |

### in_app_notifications
⚠️ Types file has `body`, `event_type` (enum), `subcontractor_id` — none of those exist in the DB.
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | gen_random_uuid() |
| user_id | uuid | NULLABLE → auth.users.id |
| organization_id | uuid | NULLABLE → organizations.id |
| title | text | NOT NULL |
| message | text | NOT NULL — ⚠️ types file calls this 'body' |
| type | text | NULLABLE — DEFAULT 'info' — ⚠️ types file calls this 'event_type' with specific enum values |
| is_read | boolean | NULLABLE — DEFAULT false |
| link | text | NULLABLE |
| created_at | timestamptz | NULLABLE — DEFAULT now() |

### site_journals
⚠️ Types file has work_phase, attendance_context, project_id, photo_quality, caveats — none exist in DB.
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | gen_random_uuid() |
| organization_id | uuid | NULLABLE → organizations.id |
| photo_url | text | NULLABLE |
| ai_summary | text | NULLABLE |
| ai_caveats | jsonb | NULLABLE — DEFAULT '[]' |
| ai_quality_rating | text | NULLABLE |
| created_at | timestamptz | NULLABLE — DEFAULT now() |

### payment_certificates
⚠️ Types file has 15+ columns (certificate_number, amount_claimed, invoice_url, etc.) — the actual DB is much simpler.
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | gen_random_uuid() |
| subcontractor_id | uuid | NULLABLE → subcontractors.id |
| organization_id | uuid | NULLABLE → organizations.id |
| amount | numeric | NOT NULL |
| period_start | date | NOT NULL — ⚠️ types file calls this 'period_from' |
| period_end | date | NOT NULL — ⚠️ types file calls this 'period_to' |
| compliance_snapshot_score | integer | NULLABLE |
| status | text | NULLABLE — DEFAULT 'pending_compliance_check' |
| rejection_reasons | jsonb | NULLABLE — DEFAULT '[]' |
| created_at | timestamptz | NULLABLE — DEFAULT now() |

---

## 2. Views

| View | Purpose |
|---|---|
| `subcontractor_leaderboard` | Ranks subs by compliance + risk_score within org |
| `project_risk_analytics` | Aggregates avg risk, site_ready_pct, payment_blocked_pct per project |
| `attendance_daily_summary` | Rolls up site_access_logs into daily granted/denied counts per sub |
| `last_seen_workers` | Latest site_access_log entry per sub with photo and company_name |

---

## 3. Triggers

| Trigger | Table | Timing | Purpose |
|---|---|---|---|
| `tr_documents_set_org_id` | documents | BEFORE INSERT | Auto-populates organization_id from parent subcontractor |
| `trg_sync_risk_ins_del` | documents | AFTER INSERT/DELETE | Recalculates risk_score on subcontractors when a doc is added or removed |
| `trg_sync_risk_upd` | documents | AFTER UPDATE OF status/expiry_date/is_current | Recalculates risk_score only when risk-relevant columns change (skips last_notified_at etc.) |
| `trg_compliance_risk` | compliance_docs | AFTER INSERT/UPDATE | Legacy — still exists but fires on dead table (0 rows), effectively inert |
| `trg_payment_gate` | subcontractors | BEFORE UPDATE | Sets payment_status based on risk_score thresholds |
| `trg_auto_payment_release` | subcontractors | BEFORE UPDATE | Auto-resets payment hold when risk drops |
| `trg_on_org_created` | organizations | AFTER INSERT | Bootstraps new org (admin role assignment via trg_bootstrap_org_admin) |
| `trg_sync_org_to_jwt` | profiles | AFTER UPDATE | Syncs organization_id into JWT claims via fn_sync_org_to_jwt |
| `trg_payment_compliance_check` | payment_certificates | BEFORE INSERT | Runs fn_process_payment_compliance on new cert |
| `trg_payment_block_audit` | payment_certificates | AFTER UPDATE | Logs audit event when cert status changes via fn_audit_payment_block |

**Payment Gate Logic (trg_payment_gate):**
* risk_score >= 71 → payment_status = 'Compliance Hold'
* risk_score <= 30 → payment_status = 'Clear to Pay'
* Else → payment_status = 'Manual Review'

---

## 4. Key Functions

| Function | Purpose |
|---|---|
| `handle_document_org_id()` | Called by tr_documents_set_org_id trigger |
| `trg_fn_sync_risk_from_documents()` | Called by trg_sync_risk_ins_del + trg_sync_risk_upd — recalculates risk_score from documents table |
| `trigger_update_risk_score()` | Legacy — called by inert trg_compliance_risk on compliance_docs |
| `calculate_subcontractor_risk_score()` | Core risk scoring engine — UPDATED 2026-05-21 to read from documents (is_current=true). Score: 75=critical, 50=elevated, 10=low, +20 for prequal incident |
| `fn_process_payment_compliance()` | Validates payment cert against compliance state |
| `fn_audit_payment_block()` | Writes audit_events on payment cert status change |
| `fn_auto_reset_payment_status()` | Resets hold when risk recovers |
| `fn_take_risk_snapshot()` | Cron-callable — writes to project_risk_history |
| `fn_log_audit_event()` | Central audit event writer |
| `fn_log_access_denied()` | Gate denial logger |
| `create_hard_stop_escalation()` | Escalates a subcontractor to hard-stop status |
| `get_my_app_role()` | RLS helper — returns calling user's app_role |
| `get_my_org_id()` | RLS helper — returns calling user's organization_id |
| `fn_sync_org_to_jwt()` | Syncs org_id into Supabase JWT on profile update |
| `fn_handle_new_user() / handle_new_user()` | Bootstraps profile on auth.users INSERT |
| `trg_bootstrap_org_admin()` | Assigns admin app_role when new org is created |

---

## 5. Performance Indexes
* `idx_documents_sub_type_current` ON `documents (subcontractor_id, type, is_current)` — critical for versioning engine lookups
