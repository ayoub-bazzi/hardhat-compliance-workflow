import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase'
import { getOrgId } from '@/lib/org'
import { ShieldAlert, ShieldCheck, AlertTriangle, Users, TrendingDown, QrCode } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { RiskScoreBar, RiskLevelBadge } from '@/components/risk-score-bar'

type RiskLevel = 'critical' | 'elevated' | 'low'

type SubWithRisk = {
  id: string
  company_name: string
  contact_email: string
  compliance_status: string
  risk_score: number
  primary_contact_name: string | null
  primary_contact_phone: string | null
  project_name: string | null
  expired_doc_count: number
  rejected_doc_count: number
  risk_level: RiskLevel
}

const REQUIRED_DOC_TYPES = ['W9', 'COI'] as const

function classifyRisk(
  subId: string,
  docsBySub: Record<string, Array<{ type: string; status: string; expiry_date: string | null }>>,
  today: string,
): RiskLevel {
  const docs = docsBySub[subId] ?? []

  // Critical: any current doc that is expired or rejected
  for (const doc of docs) {
    if (doc.status === 'rejected') return 'critical'
    if (doc.expiry_date && doc.expiry_date < today) return 'critical'
  }

  // Elevated: any required doc (W9/COI) missing, pending, or pending_verification
  for (const type of REQUIRED_DOC_TYPES) {
    const doc = docs.find((d) => d.type === type)
    if (!doc) return 'elevated'
    if (doc.status === 'pending' || doc.status === 'pending_verification') return 'elevated'
  }

  // Low: all required docs approved and current
  return 'low'
}

// ── Risk Heatmap strip ─────────────────────────────────────────

function RiskHeatmapStrip({
  critical, elevated, low, total,
}: { critical: number; elevated: number; low: number; total: number }) {
  if (total === 0) return null
  const critPct = Math.round((critical / total) * 100)
  const elevPct = Math.round((elevated / total) * 100)
  const lowPct  = 100 - critPct - elevPct

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Fleet Risk Heatmap</p>
      <div className="flex h-4 w-full overflow-hidden rounded-full">
        {critPct > 0 && (
          <div className="bg-red-500 transition-all duration-700" style={{ width: `${critPct}%` }} title={`Critical: ${critical}`} />
        )}
        {elevPct > 0 && (
          <div className="bg-amber-400 transition-all duration-700" style={{ width: `${elevPct}%` }} title={`Elevated: ${elevated}`} />
        )}
        {lowPct > 0 && (
          <div className="bg-emerald-500 transition-all duration-700" style={{ width: `${lowPct}%` }} title={`Low: ${low}`} />
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
        {[
          { label: 'Critical Risk — Expired or Rejected Doc', count: critical, pct: critPct, dot: 'bg-red-500',     text: 'text-red-600'     },
          { label: 'Elevated Risk — Missing or Unverified',   count: elevated, pct: elevPct, dot: 'bg-amber-400',   text: 'text-amber-600'   },
          { label: 'Low Risk — All Docs Approved',            count: low,      pct: lowPct,  dot: 'bg-emerald-500', text: 'text-emerald-600' },
        ].map(({ label, count, pct, dot, text }) => (
          <div key={label} className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} />
            <span className={`text-xs font-semibold tabular-nums ${text}`}>{count}</span>
            <span className="text-xs text-slate-500">{label}</span>
            <span className="text-xs font-medium text-slate-400">({pct}%)</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Skeleton ───────────────────────────────────────────────────

function RiskSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-12" />
            </div>
          </div>
        ))}
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  )
}

// ── Async data component ───────────────────────────────────────

async function RiskData() {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return null

  const today = new Date().toISOString().split('T')[0]

  const [subsResult, projectsResult, docsResult] = await Promise.all([
    supabase
      .from('subcontractors')
      .select('id, company_name, contact_email, compliance_status, risk_score, primary_contact_name, primary_contact_phone, project_id')
      .eq('organization_id', orgId),
    supabase.from('projects').select('id, name').eq('organization_id', orgId),
    supabase
      .from('documents')
      .select('subcontractor_id, type, status, expiry_date')
      .eq('organization_id', orgId)
      .eq('is_current', true),
  ])

  const subs     = subsResult.data ?? []
  const projects = projectsResult.data ?? []
  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p.name]))

  // Group current docs by sub
  const docsBySub: Record<string, Array<{ type: string; status: string; expiry_date: string | null }>> = {}
  for (const d of docsResult.data ?? []) {
    if (!docsBySub[d.subcontractor_id]) docsBySub[d.subcontractor_id] = []
    docsBySub[d.subcontractor_id].push(d)
  }

  // Build expired / rejected counts for table display
  const expiredCounts: Record<string, number>  = {}
  const rejectedCounts: Record<string, number> = {}
  for (const d of docsResult.data ?? []) {
    if (d.status === 'rejected') {
      rejectedCounts[d.subcontractor_id] = (rejectedCounts[d.subcontractor_id] ?? 0) + 1
    }
    if (d.expiry_date && d.expiry_date < today) {
      expiredCounts[d.subcontractor_id] = (expiredCounts[d.subcontractor_id] ?? 0) + 1
    }
  }

  const enriched: SubWithRisk[] = subs.map((s) => ({
    ...s,
    project_name:       projectMap[(s as { project_id?: string }).project_id ?? ''] ?? null,
    expired_doc_count:  expiredCounts[s.id]  ?? 0,
    rejected_doc_count: rejectedCounts[s.id] ?? 0,
    risk_level:         classifyRisk(s.id, docsBySub, today),
  }))

  // Sort: Critical → Elevated → Low; within each band, highest risk_score first
  const levelOrder: Record<RiskLevel, number> = { critical: 0, elevated: 1, low: 2 }
  enriched.sort((a, b) => {
    const diff = levelOrder[a.risk_level] - levelOrder[b.risk_level]
    return diff !== 0 ? diff : b.risk_score - a.risk_score
  })

  const critical = enriched.filter((s) => s.risk_level === 'critical').length
  const elevated = enriched.filter((s) => s.risk_level === 'elevated').length
  const low      = enriched.filter((s) => s.risk_level === 'low').length

  return (
    <div className="space-y-6">
      {/* Summary metric cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {([
          { label: 'Total Subs',    value: enriched.length, Icon: Users,         bg: 'bg-slate-100',   fg: 'text-slate-600'   },
          { label: 'Critical Risk', value: critical,        Icon: ShieldAlert,   bg: 'bg-red-100',     fg: 'text-red-600'     },
          { label: 'Elevated Risk', value: elevated,        Icon: AlertTriangle, bg: 'bg-amber-100',   fg: 'text-amber-600'   },
          { label: 'Low Risk',      value: low,             Icon: ShieldCheck,   bg: 'bg-emerald-100', fg: 'text-emerald-600' },
        ] as const).map(({ label, value, Icon, bg, fg }) => (
          <div key={label} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bg}`}>
              <Icon className={`h-5 w-5 ${fg}`} />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">{label}</p>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Fleet heatmap strip */}
      <RiskHeatmapStrip critical={critical} elevated={elevated} low={low} total={enriched.length} />

      {/* Risk register table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-700">
            Subcontractor Risk Register
            <span className="ml-2 text-xs font-normal text-slate-400">
              sorted by risk level — critical first
            </span>
          </h2>
        </div>

        {enriched.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <TrendingDown className="h-10 w-10 text-slate-300" />
            <p className="text-sm font-medium text-slate-500">No subcontractors yet</p>
            <p className="text-xs text-slate-400">Add subs to a project to track risk.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Company', 'Project', 'Risk Score', 'Risk Level', 'Expired', 'Rejected', 'Primary Contact', 'Pass'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 first:pl-5 last:pr-5"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {enriched.map((sub) => (
                  <tr
                    key={sub.id}
                    className={`transition-colors hover:bg-slate-50/80 ${
                      sub.risk_level === 'critical' ? 'bg-red-50/30' :
                      sub.risk_level === 'elevated' ? 'bg-amber-50/20' : ''
                    }`}
                  >
                    <td className="py-3.5 pl-5 pr-4">
                      <Link href={`/gc/risk/${sub.id}`} className="group">
                        <p className="font-medium text-slate-900 transition-colors group-hover:text-indigo-600">
                          {sub.company_name}
                        </p>
                        <p className="text-xs text-slate-400">{sub.contact_email}</p>
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      {sub.project_name ?? <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <RiskScoreBar score={sub.risk_score} />
                    </td>
                    <td className="px-4 py-3.5">
                      <RiskLevelBadge level={sub.risk_level} />
                    </td>
                    <td className="px-4 py-3.5 tabular-nums">
                      {sub.expired_doc_count > 0
                        ? <span className="font-semibold text-red-600">{sub.expired_doc_count}</span>
                        : <span className="text-slate-400">0</span>}
                    </td>
                    <td className="px-4 py-3.5 tabular-nums">
                      {sub.rejected_doc_count > 0
                        ? <span className="font-semibold text-amber-600">{sub.rejected_doc_count}</span>
                        : <span className="text-slate-400">0</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      {sub.primary_contact_name ? (
                        <div>
                          <p className="text-slate-700">{sub.primary_contact_name}</p>
                          {sub.primary_contact_phone && (
                            <p className="text-xs text-slate-400">{sub.primary_contact_phone}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Not set</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 pr-5">
                      <Link
                        href={`/gc/risk/${sub.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-slate-700"
                      >
                        <QrCode className="h-3 w-3" />
                        Pass
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────

export default function RiskOverviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Risk Overview</h1>
        <p className="mt-1 text-sm text-slate-500">
          Subcontractors ranked by live document status. Critical = expired or rejected doc. Elevated = missing or unverified.
        </p>
      </div>
      <Suspense fallback={<RiskSkeleton />}>
        <RiskData />
      </Suspense>
    </div>
  )
}
