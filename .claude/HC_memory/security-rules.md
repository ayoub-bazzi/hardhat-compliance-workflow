# Security Operating Standards — HardHat Compliance
# Verified against source code and live DB 2026-05-19

## 1. Multi-Tenant Organization Isolation

### The Rule
No data may be read, written, or deleted without being scoped to the caller's organization.

### How it is actually enforced (two patterns — know both)

**Pattern A — Page / read path:**
`getOrgId()` from `lib/org.ts` is called at the top of every server component that reads data.
It uses `React.cache` so it only hits the DB once per request.
All Supabase queries then append `.eq('organization_id', orgId)`.
Example: `app/(dashboard)/gc/risk/page.tsx`, `app/(dashboard)/gc/projects/page.tsx`.

**Pattern B — Mutation / server action path:**
Most server actions (`uploadDocument`, `deleteDocument`, `deleteSubcontractor`, `addSubcontractor`)
do NOT call `getOrgId()` directly. Instead they rely on:
- Fetching the subcontractor/project record (which is already RLS-scoped) and reading its `organization_id`
- Passing that org_id on INSERT to scope the new row
- RLS on the DB layer acting as the final safety net

**What this means when writing new code:**
- New page components → always use `getOrgId()` + `.eq('organization_id', orgId)`
- New server actions → either use `getOrgId()` explicitly, OR fetch the parent record (which RLS already scoped) and propagate its org_id — both are valid. Never use bare IDs without any org check.
- Never write a query that filters only by `id` or `projectId` without any org context.

## 2. RLS (Row Level Security)
Every table in the database has RLS enabled. The service-role client (`createServiceSupabaseClient()`) bypasses RLS — only use it for operations that legitimately need to act across tenants (e.g., cron jobs, system-level triggers). Never use it in regular server actions.

## 3. Server Clock Authority
Expiration dates and timestamps must be validated against the server clock (`new Date()` server-side or `now()` in SQL). Never trust datetime values sent from the client browser.

## 4. Manual Override Gate
`forceApproveDocument` enforces a non-blank note before approval. Whitespace-only strings are rejected. This is a legal audit trail requirement — never remove this check.

## 5. Invite Token Security
Invite tokens are generated server-side using `crypto.randomBytes(32)`. They expire after 7 days. The token is stored in `subcontractors.invite_token` and validated before any portal action is processed.
