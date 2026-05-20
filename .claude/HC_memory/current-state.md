# Operational Current State — HardHat Compliance
# Updated: 2026-05-19

## 1. Completed & Verified Systems
* **The Bouncer Pipeline:** Frontend upload triggers server-side base64 streaming to Gemini 2.5 Flash for metadata verification.
* **One Truth Version Control:** The system successfully handles multiple versions of W-9 and COI files, dynamically toggling `is_current` based on approval rules.
* **Project Danger Zone:** Hard delete and soft archiving mechanics are wired up with multi-tenant org safeguards using `getOrgId()`.
* **Next.js 16 Promise Pattern:** All server actions and routing structures correctly await native parameter promises (`params` and `searchParams`).

## 2. Active Structural Vulnerabilities & Debt
* **The Dual-Engine Sync Issue:** The UI risk engine (`classifyRisk`) evaluates data from the `documents` table, but the database risk triggers and payment holds are listening to `compliance_docs` (which has 0 rows). They are disconnected by design right now.
* **Orphaned Logs:** Deleting a project cascades beautifully through subcontractors and documents, but `audit_events` and `nudge_logs` are still set to `NO ACTION` on delete, which can cause dangling rows or block raw database cleanups.
* **The Custom Timeout Absence:** There is no functional `Promise.race` timeout on the backend; the 30-second error state is purely a caught text response mapping to Gemini 429/503 rate limits.

## 3. Immediate Active Priorities
* Finalizing the structural documentation matrix inside `.claude/HC_memory/`.
* Preparing a clean environment reset to stress-test the new `classifyRisk` engine logic using fresh test subcontractors.