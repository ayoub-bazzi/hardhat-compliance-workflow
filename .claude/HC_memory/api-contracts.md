# Server Actions API Contracts — HardHat Compliance
# Verified against source code 2026-05-19

## ⚠️ Path Note
Server action files live at `app/gc/projects/[id]/` — NOT inside the `(dashboard)` route group.
Page/UI components are in `app/(dashboard)/gc/projects/[id]/`.
These are different directories. Never mix them up.

---

## 1. Document Management

### uploadDocument
* **File:** `app/gc/projects/[id]/actions.ts`
* **Signature:** `uploadDocument(projectId: string, prevState: DocumentActionState, formData: FormData): Promise<DocumentActionState>`
* **FormData fields:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `subcontractor_id` | string (UUID) | YES | |
| `document_type` | string | YES | Must be: `COI`, `Certified Payroll`, or `W9` |
| `file` | File | YES | PDF, PNG, JPEG only |
| `company_name` | string | Conditional | Required when `verified_by === 'manual'` |
| `expiry_date` | string (YYYY-MM-DD) | Conditional | Required for manual non-W9 uploads |
| `verified_by` | string | NO | Send `'manual'` to bypass AI and force `pending_verification` |
| `pre_extracted_data` | string (JSON) | NO | Client-side pre-scan result — skips second AI call if provided |

* **Return:** `{ error: string | null; success?: boolean }`

**Three upload paths:**
1. `pre_extracted_data` present → server re-validates all rules inline, resolves to `approved/rejected/pending_verification` immediately
2. `verified_by === 'manual'` → status set to `pending_verification`, GC reviews later
3. Neither → falls back to `runAiReview()` background call

---

### runAiReview
* **File:** `app/gc/projects/[id]/ai-actions.ts`
* **Signature:** `runAiReview(documentId: string, projectId: string): Promise<AiReviewResult>`
* **Return:** `{ error: string | null; status?: 'approved' | 'rejected' | 'pending_verification'; message?: string }`
* Sends file as base64 to Gemini 2.5 Flash, evaluates company name + expiry + coverage, writes result to DB, sends email to subcontractor, logs `document_events` row.

---

### scanDocumentFile (pre-upload scan — no DB writes)
* **File:** `app/gc/projects/[id]/ai-actions.ts`
* **Signature:** `scanDocumentFile(formData: FormData): Promise<ScanResult>`
* Sends file to Gemini and returns extracted fields to the client before upload. The client passes the result back as `pre_extracted_data` on the actual upload call.

---

### forceApproveDocument (Manual Override)
* **File:** `app/gc/projects/[id]/audit-trail-actions.ts`
* **Signature:** `forceApproveDocument(documentId: string, projectId: string, note: string): Promise<...>`
* **Guard:** Note must not be blank or whitespace-only — throws hard error if empty. Required for legal audit trail.

---

## 2. Project Lifecycle

### archiveProject / deleteProject
* **File:** `app/(dashboard)/gc/projects/[id]/project-lifecycle-actions.ts`
* **Security:** Both call `getOrgId()` and verify the project belongs to the caller's org before acting. Hard-stops if org check fails.
* Delete cascades: project → subcontractors → documents → storage files.
* `audit_events` and `nudge_logs` are set to NO ACTION on project delete — known technical debt, can leave dangling rows.

---

## 3. Golden Rule — Versioning Invariant
When a document is uploaded or approved:
* If a new doc resolves to `approved` → all siblings of same (subcontractor_id, type) are set `is_current = false`, new doc gets `is_current = true`
* If an existing `approved` doc already holds the slot → new upload gets `is_current = false` (renewal-in-progress)
* On delete of a current doc → next best doc of same type is promoted (priority: approved > pending/pending_verification > rejected, newest first within tier)
