# Operational Current State — HardHat Compliance
# Updated: 2026-05-22

## Status
All 5 audit/testing tiers COMPLETE (32 bugs found and fixed). UX restructure COMPLETE. Dual-engine sync COMPLETE. All remaining debt resolved (2026-05-22).

## Remaining Debt — ALL RESOLVED (2026-05-22)
| Debt | Resolution |
|---|---|
| Raw AI rejection text shown to users | FIXED — `formatRejectionReason()` in `lib/utils.ts`, bullet lists at all 4 display sites |
| LanguageSwitcher not wired | FIXED — added to sidebar footer with `Languages` icon, uses `locale`/`setLocale` from `useLanguage()` |
| Orphaned logs on project delete | FIXED — migration `fix_orphaned_logs_cascade_delete`: `audit_events` + `nudge_logs` subcontractor_id FKs now ON DELETE CASCADE |
| No real Gemini timeout | FIXED — `callGeminiWithTimeout()` in `lib/utils.ts` (Promise.race, 30s), applied to all 10 generateContent call sites |

## Architecture — What's Live
- **Risk scoring:** `calculate_subcontractor_risk_score()` reads `documents (is_current=true)`. Triggers `trg_sync_risk_ins_del` + `trg_sync_risk_upd` keep `subcontractors.risk_score` live. Chain: doc change → risk_score → `sync_payment_status()` → payment_status.
- **Score bands:** 75 = critical (rejected/expired) → Compliance Hold; 50 = elevated (missing/unverified) → Manual Review; 10 = low (all approved) → Clear to Pay; +20 safety modifier (prequal incident, capped so 10+20=30 stays Clear to Pay).
- **UX:** 5 primary nav items (Dashboard, Compliance, Site Gate, Payments, Settings) + collapsible "More" (10 secondary). Risk table: 4 cols. Finance table: 5 cols.
- **Documents:** `documents` table is the live ledger. `compliance_docs` is dead (0 rows) — never write to it.
- **Rejection reasons:** Always pass through `formatRejectionReason()` before rendering — never render `rejection_reason` raw.
- **Gemini calls:** Always use `callGeminiWithTimeout(() => model.generateContent(...))` — never call generateContent directly.
