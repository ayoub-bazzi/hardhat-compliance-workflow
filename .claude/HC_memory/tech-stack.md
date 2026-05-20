# Core Technology Stack — HardHat Compliance
# Verified against package.json 2026-05-19

## 1. Application Runtime
* **Framework:** Next.js 16.2.4 (App Router)
* **Language:** TypeScript — strict mode enforced
* **Styling:** Tailwind CSS v4 + Shadcn UI (built on `@base-ui/react`, not raw Radix UI)

## 2. Database & Storage
* **Database:** PostgreSQL 15+ via Supabase
* **Primary client (server + browser):** `@supabase/ssr` — `createClient()` for server actions, `createBrowserClient()` for client components
* **Service-role client:** `@supabase/supabase-js` — `createServiceSupabaseClient()` only. Used in specific privileged operations, never in regular server actions.
* **Storage bucket:** `compliance-docs` (restricted access)
* **Storage path pattern:** `{projectId}/{subcontractorId}/{timestamp}-{filename}`

## 3. AI Engine
* **Model:** `gemini-2.5-flash`
* **SDK:** `@google/generative-ai` v0.24.1
* **API version:** `v1beta` (`{ apiVersion: 'v1beta' }` passed to `getGenerativeModel`)
* **Transport:** Files converted to base64 in-memory server-side and sent as inline payloads — no temporary public URLs

## 4. Communication Services
* **Transactional email:** Resend (`resend` v6.12.2) — sender: `onboarding@resend.dev`
* **SMS:** Twilio (`twilio` v6.0.0) — used for nudge alerts

## 5. Document & QR Libraries
* **PDF generation:** `jspdf` + `jspdf-autotable` — used in finance/certificates export
* **QR code generation:** `qrcode` — used for Safety Pass QR codes
* **QR code scanning:** `jsqr` — used in the gate verify camera flow

## 6. PWA
* **Push subscriptions:** stored in `push_subscriptions` table as a single `subscription_json` JSONB column (not separate endpoint/p256dh/auth columns — the types file is wrong on this)
* **Service worker:** `public/sw.js`
* **Manifest:** `app/manifest.ts`
