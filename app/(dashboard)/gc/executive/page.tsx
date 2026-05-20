import { Suspense } from 'react'
import Link from 'next/link'
import {
  TrendingUp, Users, Clock, DollarSign, ShieldCheck,
  Activity, ArrowRight, Trophy, BarChart3, Landmark,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase'
import { getOrgId } from '@/lib/org'

// ── SVG Compliance Activity Chart ──────────────────────────────

function ComplianceTrendChart({ weeklyData }: { weeklyData: number[] }) {
  const W = 640, H = 200
  const PAD = { top: 20, right: 20, bottom: 36, left: 44 }
  const cW = W - PAD.left - PAD.right
  const cH = H - PAD.top - PAD.bottom
  const n = weeklyData.length
  const maxV = Math.max(...weeklyData, 1)

  const px = (i: number) => PAD.left + (n > 1 ? (i / (n - 1)) * cW : cW / 2)
  const py = (v: number) => PAD.top + (1 - v / maxV) * cH

  const polyPts = weeklyData.map((v, i) => `${px(i)},${py(v)}`).join(' ')
  const areaPts = [
    `${px(0)},${PAD.top + cH}`,
    ...weeklyData.map((v, i) => `${px(i)},${py(v)}`),
    `${px(n - 1)},${PAD.top + cH}`,
  ].join(' ')

  const gridY = [0, 0.5, 1].map((f) => PAD.top + f * cH)
  const labelIdxs = [0, 4, 8, 12].filter((i) => i < n)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-label="Weekly compliance events over 90 days">
      <defs>
        <linearGradient id="execGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
      </defs>

      {gridY.map((y, i) => (
        <g key={i}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y}
            stroke="#e2e8f0" strokeWidth="1" />
          <text x={PAD.left - 6} y={y + 4} textAnchor="end"
            fontSize="9" fill="#94a3b8">
            {Math.round((1 - (y - PAD.top) / cH) * maxV)}
          </text>
        </g>
      ))}

      <polygon points={areaPts} fill="url(#execGrad)" />

      <polyline points={polyPts} fill="none" stroke="#6366f1"
        strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

      {weeklyData.map((v, i) => (
        <circle key={i} cx={px(i)} cy={py(v)} r={i === n - 1 ? 4 : 3}
          fill={i === n - 1 ? '#6366f1' : '#818cf8'}
          stroke="white" strokeWidth="1.5" />
      ))}

      {labelIdxs.map((i) => {
        const weeksAgo = n - 1 - i
        return (
          <text key={i} x={px(i)} y={H - 8} textAnchor="middle"
            fontSize="9" fill="#94a3b8">
            {weeksAgo === 0 ? 'Now' : `${weeksAgo}w ago`}
          </text>
        )
      })}
    </svg>
  )
}

// ── Fleet Risk Distribution ─────────────────────────────────────

function FleetRiskBar({ low, medium, high }: { low: number; medium: number; high: number }) {
  const total = low + medium + high || 1
  const segments = [
    { pct: (low / total) * 100, color: 'bg-emerald-500', label: `${low} low` },
    { pct: (medium / total) * 100, color: 'bg-amber-400', label: `${medium} medium` },
    { pct: (high / total) * 100, color: 'bg-red-500', label: `${high} high` },
  ]
  return (
    <div className="space-y-3">
      <div className="flex h-5 w-full overflow-hidden rounded-full bg-slate-100">
        {segments.map((s, i) => s.pct > 0 && (
          <div key={i} className={`${s.color} transition-all`} style={{ width: `${s.pct}%` }} />
        ))}
      </div>
      <div className="flex items-center justify-between text-xs text-slate-500">
        {segments.map((s, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <span className={`inline-block h-2 w-2 rounded-full ${s.color}`} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── KPI Card ───────────────────────────────────────────────────

function KpiCard({
  icon: Icon, label, value, sub, iconBg, iconFg, border,
}: {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
  iconBg: string
  iconFg: string
  border?: string
}) {
  return (
    <div className={`flex items-start gap-4 rounded-xl border bg-white p-6 shadow-sm ${border ?? 'border-slate-200'}`}>
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
        <Icon className={`h-6 w-6 ${iconFg}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
      </div>
    </div>
  )
}

// ── Async data ──────────────────────────────────────────────────

async function ExecData() {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return null

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

  const [certsRes, grantedRes, subsRes, auditRes, topSubsRes] = await Promise.all([
    supabase
      .from('payment_certificates')
      .select('amount_claimed')
      .eq('organization_id', orgId)
      .in('status', ['approved', 'released']),

    supabase
      .from('site_access_logs')
      .select('id', { count: 'exact', head: true })
      .eq('result', 'GRANTED')
      .eq('organization_id', orgId),

    supabase
      .from('subcontractors')
      .select('risk_score, compliance_status')
      .eq('organization_id', orgId),

    supabase
      .from('audit_events')
      .select('created_at')
      .eq('organization_id', orgId)
      .gte('created_at', ninetyDaysAgo)
      .order('created_at', { ascending: true }),

    supabase
      .from('subcontractors')
      .select('id, company_name, risk_score')
      .eq('compliance_status', 'compliant')
      .eq('organization_id', orgId)
      .order('risk_score', { ascending: true })
      .limit(5),
  ])

  // KPI: Total value secured
  const valueSecured = (certsRes.data ?? []).reduce((s, c) => s + c.amount_claimed, 0)

  // KPI: Man-hours (each GRANTED entry = 1 worker-day × 8h)
  const manHours = (grantedRes.count ?? 0) * 8

  // KPI: Fleet risk analysis
  const subs = subsRes.data ?? []
  const avgRisk = subs.length > 0
    ? Math.round(subs.reduce((s, c) => s + (c.risk_score ?? 0), 0) / subs.length)
    : 0
  const complianceRate = subs.length > 0
    ? Math.round((subs.filter((s) => s.compliance_status === 'compliant').length / subs.length) * 100)
    : 0

  const lowRisk    = subs.filter((s) => (s.risk_score ?? 0) <= 30).length
  const mediumRisk = subs.filter((s) => (s.risk_score ?? 0) > 30 && (s.risk_score ?? 0) <= 70).length
  const highRisk   = subs.filter((s) => (s.risk_score ?? 0) > 70).length

  // Compliance trend: bucket audit events into 13 weeks
  const weeklyData = Array<number>(13).fill(0)
  const startMs = Date.now() - 90 * 24 * 60 * 60 * 1000
  for (const row of auditRes.data ?? []) {
    const weekIdx = Math.floor((new Date(row.created_at).getTime() - startMs) / (7 * 24 * 60 * 60 * 1000))
    if (weekIdx >= 0 && weekIdx < 13) weeklyData[weekIdx]++
  }

  const topSubs = topSubsRes.data ?? []

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={DollarSign}
          label="Value Secured"
          value={valueSecured.toLocaleString('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 })}
          sub="Approved + released certificates"
          iconBg="bg-emerald-100"
          iconFg="text-emerald-600"
          border="border-emerald-200"
        />
        <KpiCard
          icon={Clock}
          label="Man-Hours Logged"
          value={manHours.toLocaleString()}
          sub={`${(grantedRes.count ?? 0).toLocaleString()} gate entries × 8h`}
          iconBg="bg-indigo-100"
          iconFg="text-indigo-600"
        />
        <KpiCard
          icon={Activity}
          label="Fleet Avg Risk"
          value={`${avgRisk}`}
          sub={`${complianceRate}% of fleet compliant`}
          iconBg={avgRisk <= 30 ? 'bg-emerald-100' : avgRisk <= 70 ? 'bg-amber-100' : 'bg-red-100'}
          iconFg={avgRisk <= 30 ? 'text-emerald-600' : avgRisk <= 70 ? 'text-amber-600' : 'text-red-600'}
          border={avgRisk > 70 ? 'border-red-200' : avgRisk > 30 ? 'border-amber-200' : 'border-slate-200'}
        />
        <KpiCard
          icon={Users}
          label="Contractors Managed"
          value={subs.length.toString()}
          sub={`${lowRisk} site-ready today`}
          iconBg="bg-slate-100"
          iconFg="text-slate-600"
        />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Chart + risk bar — left 2/3 */}
        <div className="xl:col-span-2 space-y-6">
          {/* Compliance activity trend */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-indigo-500" />
                <h2 className="text-sm font-semibold text-slate-700">Compliance Activity — 90 Days</h2>
              </div>
              <p className="mt-0.5 text-xs text-slate-400">
                Weekly count of compliance events logged to the Golden Thread.
              </p>
            </div>
            <div className="p-5">
              {weeklyData.every((v) => v === 0) ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <BarChart3 className="h-8 w-8 text-slate-300" />
                  <p className="text-sm text-slate-400">No events logged in the past 90 days yet.</p>
                </div>
              ) : (
                <ComplianceTrendChart weeklyData={weeklyData} />
              )}
            </div>
          </div>

          {/* Fleet risk distribution */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="h-4 w-4 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-700">Fleet Risk Distribution</h2>
            </div>
            <FleetRiskBar low={lowRisk} medium={mediumRisk} high={highRisk} />
            <div className="mt-4 grid grid-cols-3 divide-x divide-slate-100 text-center">
              {[
                { label: 'Site-Ready', value: lowRisk, fg: 'text-emerald-700', bg: 'bg-emerald-50' },
                { label: 'Watch List', value: mediumRisk, fg: 'text-amber-700', bg: 'bg-amber-50' },
                { label: 'Blocked', value: highRisk, fg: 'text-red-700', bg: 'bg-red-50' },
              ].map(({ label, value, fg, bg }) => (
                <div key={label} className={`rounded py-2 ${bg}`}>
                  <p className={`text-2xl font-bold tabular-nums ${fg}`}>{value}</p>
                  <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: top contractors + quick links */}
        <div className="space-y-6">
          {/* Top compliant contractors */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                <h2 className="text-sm font-semibold text-slate-700">Champion Contractors</h2>
              </div>
              <p className="mt-0.5 text-xs text-slate-400">Lowest risk, fully compliant.</p>
            </div>
            {topSubs.length === 0 ? (
              <p className="px-5 py-6 text-sm text-slate-400 text-center">No compliant contractors yet.</p>
            ) : (
              <ul className="divide-y divide-slate-50">
                {topSubs.map((sub, rank) => (
                  <li key={sub.id}>
                    <Link
                      href={`/gc/risk/${sub.id}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors group"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700">
                        {rank + 1}
                      </span>
                      <span className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                          {sub.company_name}
                        </p>
                        <p className="text-[10px] text-emerald-600 font-semibold">
                          Risk: {sub.risk_score ?? 0}
                        </p>
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-indigo-400 shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Quick links */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50 px-5 py-3.5">
              <h2 className="text-sm font-semibold text-slate-700">Quick Access</h2>
            </div>
            <div className="divide-y divide-slate-50">
              {[
                { href: '/gc/finance/certificates', label: 'Payment Certificates', Icon: Landmark, color: 'text-indigo-600' },
                { href: '/gc/reports',              label: 'Download PDF Report', Icon: BarChart3,  color: 'text-slate-600' },
                { href: '/gc/audit',                label: 'Golden Thread',        Icon: Activity,  color: 'text-slate-600' },
                { href: '/gc/leaderboard',          label: 'Compliance Leaderboard', Icon: Trophy, color: 'text-amber-600' },
              ].map(({ href, label, Icon, color }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors group"
                >
                  <Icon className={`h-4 w-4 shrink-0 ${color}`} />
                  <span className="flex-1 text-sm font-medium text-slate-700 group-hover:text-indigo-600 transition-colors">
                    {label}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-indigo-400 shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-slate-400">
        All data is live from the compliance ledger. Man-hours estimated at 8h per gate-granted entry.
        Financial data reflects certificates in <span className="font-semibold">Approved</span> or <span className="font-semibold">Released</span> status only.
      </p>
    </div>
  )
}

// ── Skeleton ───────────────────────────────────────────────────

function ExecSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-6">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-36 w-full rounded-xl" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────

export default function ExecutivePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Executive Overview</h1>
          <p className="mt-1 text-sm text-slate-500">
            Board-level view of compliance health, financial performance, and fleet risk.
          </p>
        </div>
        <Link href="/gc/projects" className="text-sm font-semibold text-indigo-600 hover:underline">
          ← Command Center
        </Link>
      </div>

      <Suspense fallback={<ExecSkeleton />}>
        <ExecData />
      </Suspense>
    </div>
  )
}
