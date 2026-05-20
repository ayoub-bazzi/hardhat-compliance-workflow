'use client'

import { useLanguage } from '@/components/language-provider'
import { Badge } from '@/components/ui/badge'
import type { ComplianceStatus, PaymentStatus } from '@/types/database.types'

// ── Types ──────────────────────────────────────────────────────

type Analytics = {
  total_subs: number
  avg_risk_score: number
  site_ready_pct: number
  payment_blocked_pct: number
  critical_count: number
  elevated_count: number
}

type HistoryPoint = {
  snapshot_date: string
  avg_risk_score: number
}

type TopSub = {
  id: string
  company_name: string
  risk_score: number
  compliance_status: ComplianceStatus
  payment_status: PaymentStatus
}

type Hazard = {
  hazard: string
  count: number
}

// ── Health Dial (SVG radial gauge) ─────────────────────────────
// 270° sweep from 7:30 o'clock (135° SVG) clockwise to 4:30 o'clock (45° SVG).
// health = 100 − avg_risk_score — higher is better.

function HealthDial({ health, label, sublabel }: {
  health: number
  label: string
  sublabel: string
}) {
  const cx = 150, cy = 140, r = 105
  const clamped = Math.max(0, Math.min(100, Math.round(health)))

  const toRad = (deg: number) => (deg * Math.PI) / 180

  const startDeg = 135
  const sx = cx + r * Math.cos(toRad(startDeg))
  const sy = cy + r * Math.sin(toRad(startDeg))

  // Full 270° track ends at 135 + 270 = 405 = 45°
  const endFullDeg = 45
  const efx = cx + r * Math.cos(toRad(endFullDeg))
  const efy = cy + r * Math.sin(toRad(endFullDeg))
  const trackD = `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${r} ${r} 0 1 1 ${efx.toFixed(2)} ${efy.toFixed(2)}`

  // Fill arc proportional to health (0-100 → 0-270°)
  let fillD = ''
  if (clamped > 0) {
    const sweepDeg  = (clamped / 100) * 270
    const endFillDeg = startDeg + sweepDeg
    const efillx = cx + r * Math.cos(toRad(endFillDeg))
    const efilly = cy + r * Math.sin(toRad(endFillDeg))
    const largeArc = sweepDeg > 180 ? 1 : 0
    fillD = `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${efillx.toFixed(2)} ${efilly.toFixed(2)}`
  }

  // Needle — shorter than r so it doesn't touch the track
  const needleR   = r - 18
  const needleDeg = startDeg + (clamped / 100) * 270
  const nx = cx + needleR * Math.cos(toRad(needleDeg))
  const ny = cy + needleR * Math.sin(toRad(needleDeg))

  // Tick marks at 0, 25, 50, 75, 100 %
  const ticks = [0, 25, 50, 75, 100].map((v) => {
    const d  = startDeg + (v / 100) * 270
    const ox = cx + r * Math.cos(toRad(d))
    const oy = cy + r * Math.sin(toRad(d))
    const ix = cx + (r - 14) * Math.cos(toRad(d))
    const iy = cy + (r - 14) * Math.sin(toRad(d))
    return { ox, oy, ix, iy, v }
  })

  const color =
    clamped >= 70 ? '#10b981'
    : clamped >= 40 ? '#f59e0b'
    : '#ef4444'

  return (
    <svg viewBox="0 0 300 245" className="w-full max-w-xs mx-auto" aria-label={`${label}: ${clamped}`}>
      {ticks.map(({ ox, oy, ix, iy, v }) => (
        <line key={v} x1={ox.toFixed(2)} y1={oy.toFixed(2)} x2={ix.toFixed(2)} y2={iy.toFixed(2)}
          stroke="#334155" strokeWidth="2.5" strokeLinecap="round" />
      ))}
      <path d={trackD} fill="none" stroke="#1e293b" strokeWidth="16" strokeLinecap="round" />
      {fillD && (
        <path d={fillD} fill="none" stroke={color} strokeWidth="16" strokeLinecap="round" />
      )}
      <line
        x1={cx} y1={cy}
        x2={nx.toFixed(2)} y2={ny.toFixed(2)}
        stroke="white" strokeWidth="3" strokeLinecap="round"
      />
      <circle cx={cx} cy={cy} r="6" fill="white" />
      <text x={cx} y={cy + 18} textAnchor="middle" fill="white"
        fontSize="52" fontWeight="900" fontFamily="monospace">
        {clamped}
      </text>
      <text x={cx} y={cy + 42} textAnchor="middle" fill={color}
        fontSize="13" fontWeight="700" fontFamily="sans-serif">
        {label}
      </text>
      <text x={cx} y={cy + 58} textAnchor="middle" fill="#475569"
        fontSize="10" fontFamily="sans-serif">
        {sublabel}
      </text>
      <text x={sx.toFixed(2)} y={(sy + 18).toFixed(2)} textAnchor="middle"
        fill="#475569" fontSize="9" fontFamily="sans-serif">0</text>
      <text x={efx.toFixed(2)} y={(efy + 18).toFixed(2)} textAnchor="middle"
        fill="#475569" fontSize="9" fontFamily="sans-serif">100</text>
    </svg>
  )
}

// ── Trend Chart (SVG line chart) ────────────────────────────────

function TrendChart({ history, tWeek, tRisk, tNoHistory }: {
  history: HistoryPoint[]
  tWeek: string
  tRisk: string
  tNoHistory: string
}) {
  const W = 320, H = 140
  const padL = 36, padR = 16, padT = 14, padB = 38
  const cW = W - padL - padR
  const cH = H - padT - padB

  if (history.length === 0) {
    return (
      <p className="flex items-center justify-center h-28 text-slate-600 text-xs text-center px-4">
        {tNoHistory}
      </p>
    )
  }

  const pts = history.map((h, i) => ({
    x: padL + (history.length === 1 ? cW / 2 : (i / (history.length - 1)) * cW),
    y: padT + cH - (h.avg_risk_score / 100) * cH,
    score: h.avg_risk_score,
    date: h.snapshot_date,
  }))

  const polyline = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaPoints = [
    `${pts[0].x.toFixed(1)},${(padT + cH).toFixed(1)}`,
    ...pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`),
    `${pts[pts.length - 1].x.toFixed(1)},${(padT + cH).toFixed(1)}`,
  ].join(' ')

  const yRefs = [0, 50, 100]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {yRefs.map((v) => {
        const yp = padT + cH - (v / 100) * cH
        return (
          <g key={v}>
            <line x1={padL} y1={yp.toFixed(1)} x2={W - padR} y2={yp.toFixed(1)}
              stroke="#1e293b" strokeWidth="1" strokeDasharray="4 3" />
            <text x={padL - 5} y={(yp + 3).toFixed(1)} textAnchor="end"
              fill="#475569" fontSize="8" fontFamily="sans-serif">{v}</text>
          </g>
        )
      })}
      <polygon points={areaPoints} fill="#f59e0b" fillOpacity="0.07" />
      <polyline points={polyline} fill="none" stroke="#f59e0b"
        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="4" fill="#f59e0b" />
          <text x={p.x.toFixed(1)} y={(padT + cH + 14).toFixed(1)} textAnchor="middle"
            fill="#64748b" fontSize="7.5" fontFamily="sans-serif">
            {tWeek} {i + 1}
          </text>
          <text x={p.x.toFixed(1)} y={(p.y - 7).toFixed(1)} textAnchor="middle"
            fill="#fbbf24" fontSize="8.5" fontFamily="monospace" fontWeight="bold">
            {p.score}
          </text>
        </g>
      ))}
      <text
        x={padL - 4}
        y={(padT + cH / 2).toFixed(1)}
        fill="#475569"
        fontSize="7.5"
        fontFamily="sans-serif"
        textAnchor="middle"
        transform={`rotate(-90, ${padL - 16}, ${padT + cH / 2})`}
      >
        {tRisk}
      </text>
    </svg>
  )
}

// ── Bottleneck Card ─────────────────────────────────────────────

function BottleneckCard({ subs, tSiteBlocked, tPaymentBlocked, tEmpty }: {
  subs: TopSub[]
  tSiteBlocked: string
  tPaymentBlocked: string
  tEmpty: string
}) {
  const highRisk = subs.filter((s) => s.risk_score >= 31 || s.payment_status === 'Compliance Hold')

  if (highRisk.length === 0) {
    return (
      <p className="text-slate-500 text-sm text-center py-6">{tEmpty}</p>
    )
  }

  return (
    <div className="space-y-3">
      {highRisk.map((sub, i) => {
        const isSiteBlocked  = sub.risk_score >= 71
        const isPaymentHeld  = sub.payment_status === 'Compliance Hold'
        const barColor =
          sub.risk_score >= 71 ? 'bg-red-500'
          : sub.risk_score >= 31 ? 'bg-amber-400'
          : 'bg-emerald-500'

        return (
          <div key={sub.id} className="flex items-center gap-3 rounded-lg border border-slate-700/50 bg-slate-800/50 p-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-slate-300">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-semibold text-white">{sub.company_name}</p>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="relative h-1.5 w-24 overflow-hidden rounded-full bg-slate-700">
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full ${barColor}`}
                    style={{ width: `${sub.risk_score}%` }}
                  />
                </div>
                <span className={`text-xs font-bold tabular-nums ${
                  sub.risk_score >= 71 ? 'text-red-400'
                  : sub.risk_score >= 31 ? 'text-amber-400'
                  : 'text-emerald-400'
                }`}>{sub.risk_score}</span>
              </div>
            </div>
            <div className="flex flex-col gap-1 items-end shrink-0">
              {isSiteBlocked && (
                <span className="rounded-full bg-red-950 px-2 py-0.5 text-[10px] font-semibold text-red-400 ring-1 ring-red-800">
                  {tSiteBlocked}
                </span>
              )}
              {isPaymentHeld && (
                <span className="rounded-full bg-amber-950 px-2 py-0.5 text-[10px] font-semibold text-amber-400 ring-1 ring-amber-800">
                  {tPaymentBlocked}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Executive Report Button ─────────────────────────────────────

function ExecutiveReportButton({
  projectName,
  analytics,
  top5Hazards,
  tButton,
  tReportTitle,
  tGenerated,
  tTotalSubs,
  tSiteReady,
  tPaymentBlocked,
  tTopHazards,
  tNoHazards,
  dir,
  locale,
}: {
  projectName: string
  analytics: Analytics
  top5Hazards: Hazard[]
  tButton: string
  tReportTitle: string
  tGenerated: string
  tTotalSubs: string
  tSiteReady: string
  tPaymentBlocked: string
  tTopHazards: string
  tNoHazards: string
  dir: 'ltr' | 'rtl'
  locale: string
}) {
  function generateReport() {
    const now = new Date().toLocaleString(locale === 'ar' ? 'ar-AE' : 'en-US', {
      dateStyle: 'full',
      timeStyle: 'short',
    })

    const hazardRows = top5Hazards.length > 0
      ? top5Hazards.map((h, i) => `
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;">${i + 1}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;">${h.hazard}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:13px;font-weight:700;">${h.count}</td>
          </tr>`).join('')
      : `<tr><td colspan="3" style="padding:16px 12px;color:#94a3b8;text-align:center;font-size:13px;">${tNoHazards}</td></tr>`

    const html = `<!DOCTYPE html>
<html lang="${locale}" dir="${dir}">
<head>
  <meta charset="UTF-8">
  <title>HardHat Compliance — ${tReportTitle}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @page { margin: 2.5cm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: #0f172a;
      background: #ffffff;
      font-size: 14px;
      line-height: 1.6;
    }
    .header { border-bottom: 3px solid #f59e0b; padding-bottom: 20px; margin-bottom: 28px; }
    .brand { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #f59e0b; margin-bottom: 6px; }
    h1 { font-size: 24px; font-weight: 900; color: #0f172a; }
    .meta { font-size: 12px; color: #64748b; margin-top: 4px; }
    .section { margin-bottom: 28px; }
    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .kpi-card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 20px; }
    .kpi-label { font-size: 11px; color: #64748b; font-weight: 600; margin-bottom: 4px; }
    .kpi-value { font-size: 32px; font-weight: 900; color: #0f172a; }
    .kpi-unit { font-size: 16px; color: #94a3b8; font-weight: 400; }
    table { width: 100%; border-collapse: collapse; }
    th { padding: 10px 12px; background: #f8fafc; text-align: ${dir === 'rtl' ? 'right' : 'left'}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; border-bottom: 2px solid #e2e8f0; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">HardHat Compliance</div>
    <h1>${tReportTitle}: ${projectName}</h1>
    <div class="meta">${tGenerated}: ${now}</div>
  </div>

  <div class="section">
    <div class="section-title">Project Summary</div>
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">${tTotalSubs}</div>
        <div class="kpi-value">${analytics.total_subs}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">${tSiteReady}</div>
        <div class="kpi-value">${analytics.site_ready_pct}<span class="kpi-unit">%</span></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">${tPaymentBlocked}</div>
        <div class="kpi-value">${analytics.payment_blocked_pct}<span class="kpi-unit">%</span></div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">${tTopHazards}</div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Hazard</th>
          <th style="text-align:center;">Count</th>
        </tr>
      </thead>
      <tbody>${hazardRows}</tbody>
    </table>
  </div>

  <div class="footer">
    HardHat Compliance · AI-powered subcontractor risk management ·
    Report generated automatically from live project data.
  </div>
</body>
</html>`

    const win = window.open('', '_blank', 'width=900,height=700')
    if (!win) return
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 400)
  }

  return (
    <button
      type="button"
      onClick={generateReport}
      className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition-colors hover:bg-amber-400 active:bg-amber-600"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
      </svg>
      {tButton}
    </button>
  )
}

// ── Stat pill ───────────────────────────────────────────────────

function StatPill({ label, value, unit = '', accent = false }: {
  label: string
  value: number
  unit?: string
  accent?: boolean
}) {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 px-5 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-black tabular-nums ${accent ? 'text-amber-400' : 'text-white'}`}>
        {value}<span className="text-base font-medium text-slate-500">{unit}</span>
      </p>
    </div>
  )
}

// ── Main exported component ─────────────────────────────────────

export function InsightsDashboard({
  projectName,
  analytics,
  history,
  topSubs,
  top5Hazards,
}: {
  projectId: string
  projectName: string
  analytics: Analytics
  history: HistoryPoint[]
  topSubs: TopSub[]
  top5Hazards: Hazard[]
}) {
  const { t, locale, dir } = useLanguage()
  const health = Math.max(0, 100 - analytics.avg_risk_score)

  const healthLabel =
    health >= 70 ? 'Healthy'
    : health >= 40 ? 'At Risk'
    : 'Critical'

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {t.insights.title}
          </h1>
          <p className="mt-0.5 text-sm text-slate-400">{t.insights.subtitle}</p>
        </div>
        <ExecutiveReportButton
          projectName={projectName}
          analytics={analytics}
          top5Hazards={top5Hazards}
          tButton={t.insights.report_button}
          tReportTitle={t.insights.report_title}
          tGenerated={t.insights.report_generated}
          tTotalSubs={t.insights.report_total_subs}
          tSiteReady={t.insights.report_site_ready}
          tPaymentBlocked={t.insights.report_payment_blocked}
          tTopHazards={t.insights.report_top_hazards}
          tNoHazards={t.insights.report_no_hazards}
          dir={dir}
          locale={locale}
        />
      </div>

      {/* KPI pills */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatPill label={t.insights.report_total_subs}   value={analytics.total_subs} />
        <StatPill label={t.insights.report_site_ready}   value={analytics.site_ready_pct} unit="%" />
        <StatPill label={t.insights.report_payment_blocked} value={analytics.payment_blocked_pct} unit="%" accent={analytics.payment_blocked_pct > 0} />
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Avg Risk</p>
          <p className={`mt-1 text-3xl font-black tabular-nums ${
            analytics.avg_risk_score >= 71 ? 'text-red-400'
            : analytics.avg_risk_score >= 31 ? 'text-amber-400'
            : 'text-emerald-400'
          }`}>
            {analytics.avg_risk_score}<span className="text-base font-medium text-slate-500">/100</span>
          </p>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Health Dial */}
        <div className="flex flex-col rounded-2xl border border-slate-700/50 bg-slate-900 p-6 shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {t.insights.health_dial_label}
          </p>
          <div className="mt-4 flex flex-1 items-center justify-center">
            <HealthDial
              health={health}
              label={healthLabel}
              sublabel={t.insights.health_basis}
            />
          </div>
          <div className="mt-4 flex justify-center gap-4 text-[10px] font-semibold">
            <span className="flex items-center gap-1.5 text-red-400">
              <span className="h-1.5 w-4 rounded-full bg-red-500 inline-block" />0–39 Critical
            </span>
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="h-1.5 w-4 rounded-full bg-amber-400 inline-block" />40–69 At Risk
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="h-1.5 w-4 rounded-full bg-emerald-500 inline-block" />70–100 Healthy
            </span>
          </div>
        </div>

        {/* Trend Chart */}
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900 p-6 shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {t.insights.trend_title}
          </p>
          <p className="mt-0.5 text-xs text-slate-600">{t.insights.trend_subtitle}</p>
          <div className="mt-4">
            <TrendChart
              history={history}
              tWeek={t.insights.week}
              tRisk={t.insights.risk_axis}
              tNoHistory={t.insights.no_history}
            />
          </div>
        </div>

        {/* Bottleneck Card */}
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900 p-6 shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {t.insights.bottleneck_title}
          </p>
          <p className="mt-0.5 text-xs text-slate-600">{t.insights.bottleneck_subtitle}</p>
          <div className="mt-4">
            <BottleneckCard
              subs={topSubs}
              tSiteBlocked={t.insights.site_blocked}
              tPaymentBlocked={t.insights.payment_blocked}
              tEmpty={t.insights.bottleneck_empty}
            />
          </div>
        </div>
      </div>

      {/* Risk distribution strip */}
      {analytics.total_subs > 0 && (
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900 p-6 shadow-xl">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Risk Distribution
          </p>
          <div className="flex items-center gap-4">
            <div className="flex-1 overflow-hidden rounded-full bg-slate-800 h-4 flex">
              {analytics.critical_count > 0 && (
                <div
                  className="h-full bg-red-500 transition-all duration-700"
                  style={{ width: `${(analytics.critical_count / analytics.total_subs) * 100}%` }}
                  title={`Critical: ${analytics.critical_count}`}
                />
              )}
              {analytics.elevated_count > 0 && (
                <div
                  className="h-full bg-amber-400 transition-all duration-700"
                  style={{ width: `${(analytics.elevated_count / analytics.total_subs) * 100}%` }}
                  title={`Elevated: ${analytics.elevated_count}`}
                />
              )}
              <div
                className="h-full bg-emerald-500 flex-1 transition-all duration-700"
                title={`Low: ${analytics.total_subs - analytics.critical_count - analytics.elevated_count}`}
              />
            </div>
            <div className="flex shrink-0 gap-4 text-[11px] font-semibold">
              <span className="text-red-400">{analytics.critical_count} Critical</span>
              <span className="text-amber-400">{analytics.elevated_count} Elevated</span>
              <span className="text-emerald-400">
                {analytics.total_subs - analytics.critical_count - analytics.elevated_count} Low
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
