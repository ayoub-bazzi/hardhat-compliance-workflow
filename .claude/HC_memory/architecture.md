# High-Level Technical Architecture — HardHat Compliance

## 1. System Topology Overview
The system utilizes a modern Next.js 16 App Router framework with React Server Components (RSC) backed by a PostgreSQL database managed via Supabase.

         [ Next.js 16 Web UI Client App ]
                       │
         (Awaited Server Actions Pipeline)
                       │
                       ▼
      [ Next.js Server / TS Logic Engine ]
        │                              │
        ▼ (Supabase Direct SDK)        ▼ (SDK v1beta)
  [ PostgreSQL DB ]            [ Gemini 2.5 Flash API ]

---

## 2. Core Execution Frameworks

### Data Isolation Layer
Multi-tenancy isolation is verified at the Application API boundary layer. The cached helper routine `getOrgId()` uses `React.cache` to look up the current organization identifier profile on every read/write action execution block, enforcing an explicit `.eq('organization_id', orgId)` condition filter constraint.

### Next.js 16 Server Components Architecture
Dynamic route parameters are parsed asynchronously following native compilation patterns:
* Layout parameters and URL parameters are processed explicitly as Native Promises.
* **The Rule:** You must use `await params` or `await searchParams` before interacting with state hooks or evaluation loops.

---

## 3. The Dual-Engine Split
* **UI Live Evaluation Engine:** Pure TypeScript running synchronously server-side inside `app/(dashboard)/gc/risk/page.tsx` using `is_current = true` rows from the `documents` table. Controls visual alerts and heatmaps.
* **Database Gating Engine:** Trigger-based operations residing in PL/pgSQL watching `compliance_docs`. Controls escrow holds and manual reviews.