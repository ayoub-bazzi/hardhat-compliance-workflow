# HardHat Compliance (HC) — Session Bootstrap Template
# Purpose: Instant Context Alignment for Fresh Conversations

## 🚨 SYSTEM SUMMARY (CRITICAL ROOT RULES)
1. **The Dual Risk Engine Split:** Visual UI levels (`classifyRisk`) operate server-side via Next.js on the `documents` table (`is_current = true`). Numeric backend scores (`risk_score`) for payment holds run on a Postgres trigger watching `compliance_docs` (0 rows). Keep them isolated!
2. **The "Ghost" Timeout:** The 30-second processing delay rule is a text fallback mapping caught from Gemini rate limit errors (429/503), not a functional `Promise.race` loop.
3. **Data Isolation Law:** Multi-tenancy isolation is enforced at the API boundary using a cached `getOrgId()` helper loop. Every action query block must explicitly check `.eq('organization_id', orgId)`.

## 🗄️ CORE ENGINE SPECIFICATIONS
* **The "Golden Rule" Version Control:** Incoming files get `is_current = false` if an approved file already claims the active slot. Mutations like `forceApproveDocument` or valid pre-scans automatically set all siblings to `false` and promote the target file to `true`.
* **The Deletion Chain:** Deleting a project cascades down to subcontractors and documents, but `audit_events` and `nudge_logs` use `NO ACTION` and are currently a point of technical debt.
* **UI Risk Matrix Engine:** * CRITICAL: Any current file is rejected OR has a past expiry date (`expiry_date < today`).
  * ELEVATED: W9 or COI is missing, pending, or in `pending_verification`.
  * LOW: W9 and COI are both present, valid, and approved.

## 📡 CURRENT STATE & SPRINT FOCUS
* Core architecture documentation successfully mapped and stored in workspace files.
* Next up: Resolving database vulnerabilities, synchronizing tables, or proceeding to user-management testing suites based on product strategy.