# Project File Map — HardHat Compliance
# Use this to find the right file fast without searching

---

## Route Groups — Understanding the Structure
```
app/
├── (auth)/              → Login page only
├── (dashboard)/         → UI pages + client components for both GC and sub
│   ├── gc/              → GC dashboard pages (RSCs + client wrappers)
│   └── subcontractor/   → Sub dashboard pages
├── (marketing)/         → Public marketing site
├── gc/projects/[id]/    → SERVER ACTIONS only (no pages here)
├── app/gc/projects/     → Server actions for project list
├── gate/                → Public gate scanning flow (no auth)
├── portal/              → Public subcontractor upload portal (token-based)
├── onboarding/          → GC org setup flow
└── api/                 → API routes (cron, compliance checks, AI endpoints)
```

⚠️ Critical distinction: `app/(dashboard)/gc/projects/[id]/` = UI components
`app/gc/projects/[id]/` = server actions. Never confuse the two.

---

## Core Engines & Their Files

### Bouncer (AI Document Pipeline)
| What | File |
|---|---|
| Upload action + pre-extracted path | `app/gc/projects/[id]/actions.ts` |
| AI review (Gemini call + verdict) | `app/gc/projects/[id]/ai-actions.ts` |
| Force approve override | `app/gc/projects/[id]/audit-trail-actions.ts` |
| Upload dialog UI | `app/(dashboard)/gc/projects/[id]/upload-document-dialog.tsx` |
| AI review trigger button | `app/(dashboard)/gc/projects/[id]/ai-review-button.tsx` |
| Force approve button | `app/(dashboard)/gc/projects/[id]/force-approve-button.tsx` |

### Safe Vault (Versioning + Document History)
| What | File |
|---|---|
| Doc history drawer | `app/(dashboard)/gc/projects/[id]/doc-history-drawer.tsx` |
| Doc actions menu (delete, download) | `app/(dashboard)/gc/projects/[id]/doc-actions-menu.tsx` |
| Download signed URL action | `app/gc/projects/[id]/actions.ts` (`getDocumentDownloadUrl`) |
| Document vault (all-org view) | `app/(dashboard)/gc/documents/document-vault.tsx` |
| Vault actions | `app/(dashboard)/gc/documents/vault-actions.ts` |

### Risk Register (UI Heatmap)
| What | File |
|---|---|
| Risk overview page + classifyRisk engine | `app/(dashboard)/gc/risk/page.tsx` |
| Sub risk detail page | `app/(dashboard)/gc/risk/[id]/page.tsx` |
| Risk score bar component | `components/risk-score-bar.tsx` |
| Induction panel + actions | `app/(dashboard)/gc/risk/[id]/induction-panel.tsx` + `induction-actions.ts` |
| Pre-qual review + actions | `app/(dashboard)/gc/risk/[id]/prequal-review.tsx` + `prequal-actions.ts` |
| Profile photo management | `app/(dashboard)/gc/risk/[id]/photo-management.tsx` + `photo-actions.ts` |

### Payment Gate
| What | File |
|---|---|
| Finance dashboard page | `app/(dashboard)/gc/finance/page.tsx` |
| Finance actions (payment status) | `app/(dashboard)/gc/finance/finance-actions.ts` |
| Payment certificates page | `app/(dashboard)/gc/finance/certificates/page.tsx` |
| Certificate actions | `app/(dashboard)/gc/finance/certificates/certificate-actions.ts` |
| Release payment button | `app/(dashboard)/gc/finance/release-button.tsx` |
| PDF export button | `app/(dashboard)/gc/finance/export-button.tsx` |
| Invoice AI check API | `app/api/finance/check-invoice/route.ts` |

### Gate Scanning (Physical Site Entry)
| What | File |
|---|---|
| Public gate verify page (token) | `app/gate/verify/[token]/page.tsx` |
| Camera capture component | `app/gate/verify/[token]/camera-capture.tsx` |
| Face verify API | `app/api/gate/verify-face/route.ts` |
| Gate readiness lib | `lib/gate-readiness.ts` |
| Site readiness scan action | `app/(dashboard)/gc/scan/site-readiness-action.ts` |
| Scan dashboard page | `app/(dashboard)/gc/scan/page.tsx` |

### Subcontractor Portal (Token-based upload)
| What | File |
|---|---|
| Public portal page (token) | `app/portal/upload/[token]/page.tsx` |
| Portal actions | `app/portal/upload/[token]/portal-actions.ts` |
| Portal client UI | `app/portal/upload/[token]/portal-client.tsx` |
| Invite email action | `app/gc/projects/[id]/actions.ts` (`sendInviteEmail`) |
| Logged-in sub portal | `app/(dashboard)/subcontractor/portal/page.tsx` |
| Sub portal actions | `app/(dashboard)/subcontractor/portal/actions.ts` |
| Safety pass component | `app/(dashboard)/subcontractor/portal/safety-pass.tsx` |
| Invoice upload | `app/(dashboard)/subcontractor/portal/invoice-upload.tsx` |
| Photo enrollment page | `app/(dashboard)/subcontractor/onboarding/photo/page.tsx` |
| Photo enroll API | `app/api/portal/enroll-photo/route.ts` |

### Nudge & Notification Engine
| What | File |
|---|---|
| Expiry engine lib | `lib/expiry-engine.ts` |
| Notifications lib | `lib/notifications.ts` |
| Push notification lib | `lib/push-notification.ts` |
| Notification bell component | `components/notification-bell.tsx` |
| Notifications actions | `app/(dashboard)/gc/notifications/actions.ts` |
| Expiry nudge API route | `app/api/compliance/expiry-nudge/route.ts` |
| Hard stop check API | `app/api/compliance/hard-stop-check/route.ts` |

### Cron Jobs
| What | File |
|---|---|
| Compliance watchdog | `app/api/cron/compliance-watchdog/route.ts` |
| Expiry check | `app/api/cron/expiry-check/route.ts` |
| Risk snapshot | `app/api/cron/risk-snapshot/route.ts` |
| Watchdog engine lib | `lib/watchdog-engine.ts` |

### Site Journal (AI Photo Log)
| What | File |
|---|---|
| Journal page | `app/(dashboard)/gc/journal/page.tsx` |
| Journal upload component | `app/(dashboard)/gc/journal/journal-upload.tsx` |
| Journal generate API | `app/api/journal/generate/route.ts` |
| Latest journal card | `components/latest-journal-card.tsx` |

### Audit Trail
| What | File |
|---|---|
| Audit page | `app/(dashboard)/gc/audit/page.tsx` |
| Audit timeline component | `components/audit-timeline.tsx` |
| Audit export button | `components/audit-export-button.tsx` |
| Audit trail button (per doc) | `app/(dashboard)/gc/projects/[id]/audit-trail-button.tsx` |

### Projects & Command Center
| What | File |
|---|---|
| Projects list page | `app/(dashboard)/gc/projects/page.tsx` |
| Command center table | `app/(dashboard)/gc/projects/command-center-table.tsx` |
| Create project action | `app/(dashboard)/gc/projects/actions.ts` |
| Project detail page | `app/(dashboard)/gc/projects/[id]/page.tsx` |
| Project lifecycle (archive/delete) | `app/(dashboard)/gc/projects/[id]/project-lifecycle-actions.ts` |
| Expiry scan button | `app/(dashboard)/gc/projects/expiry-scan-button.tsx` |
| At-risk actions | `app/(dashboard)/gc/projects/at-risk-actions.ts` |

### Settings & Team
| What | File |
|---|---|
| GC settings page | `app/(dashboard)/gc/settings/page.tsx` |
| Settings actions | `app/(dashboard)/gc/settings/settings-actions.ts` |
| Team management page | `app/(dashboard)/gc/settings/team/page.tsx` |
| Team actions (RBAC) | `app/(dashboard)/gc/settings/team/actions.ts` |

### Analytics & Reporting
| What | File |
|---|---|
| Executive dashboard | `app/(dashboard)/gc/executive/page.tsx` |
| Reports page | `app/(dashboard)/gc/reports/page.tsx` |
| Report actions | `app/(dashboard)/gc/reports/report-actions.ts` |
| Leaderboard page | `app/(dashboard)/gc/leaderboard/page.tsx` |
| Compliance leaderboard component | `components/compliance-leaderboard.tsx` |
| Attendance page | `app/(dashboard)/gc/attendance/page.tsx` |
| Attendance heatmap chart | `components/attendance-heatmap-chart.tsx` |
| Labor analytics page | `app/(dashboard)/gc/labor/page.tsx` |
| Labor chart | `components/labor-chart.tsx` |
| Labor analytics lib | `lib/labor-analytics.ts` |
| Site monitor page | `app/(dashboard)/gc/site-monitor/page.tsx` |
| Last seen workers | `components/last-seen-workers.tsx` |
| Failure heatmap | `components/failure-heatmap.tsx` |

---

## Lib Files
| File | Purpose |
|---|---|
| `lib/supabase.ts` | All Supabase client constructors (`createClient`, `createBrowserClient`, `createServiceSupabaseClient`) |
| `lib/org.ts` | `getOrgId()` — cached org resolver, used in all page reads |
| `lib/expiry-engine.ts` | Document expiry detection logic |
| `lib/watchdog-engine.ts` | Compliance watchdog rules |
| `lib/gate-readiness.ts` | Gate access decision logic |
| `lib/notifications.ts` | Notification sending helpers |
| `lib/push-notification.ts` | Web Push sending helpers |
| `lib/site-pass-token.ts` | HMAC token generation for QR passes |
| `lib/labor-analytics.ts` | Labor data aggregation |
| `lib/i18n.ts` | Internationalisation helpers |
| `lib/weather.ts` | Weather API integration |
| `lib/utils.ts` | Tailwind merge + general utils |

---

## Types
| File | Purpose |
|---|---|
| `types/database.types.ts` | TypeScript DB types — ⚠️ partially out of sync with live DB, see database-schema.md for ground truth |

---

## Auth & Middleware
| File | Purpose |
|---|---|
| `middleware.ts` | Role-based redirects — GC without org → `/onboarding`, wrong role → `/unauthorized` |
| `app/auth/actions.ts` | Login / logout server actions |
| `app/onboarding/` | GC org creation flow |

---

## Key Components
| File | Purpose |
|---|---|
| `components/dashboard-sidebar.tsx` | Main nav sidebar |
| `components/global-compliance-status.tsx` | Org-wide compliance header badge |
| `components/qr-pass.tsx` | QR code Safety Pass renderer |
| `components/compliance-clearance-pdf.tsx` | PDF clearance certificate |
| `components/weather-watchdog.tsx` | Weather risk widget |
| `components/language-provider.tsx` | i18n context |
| `components/pwa-register.tsx` | Service worker registration |
