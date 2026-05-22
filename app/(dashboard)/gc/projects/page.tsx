import { Suspense } from 'react'
import Link from 'next/link'
import { Users, AlertCircle, ShieldCheck, TrendingUp, Clock, FolderPlus, UserPlus, ScanLine } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase'
import { getOrgId } from '@/lib/org'
import { AddProjectDialog } from './add-project-dialog'
import { CommandCenterTable, type ProjectEnriched } from './command-center-table'
import { ExpiryButton } from './expiry-scan-button'
import { NotificationStrip } from './notification-strip'
import { ShowArchivedToggle } from './show-archived-toggle'

type RiskLevel = 'critical' | 'elevated' | 'low'

const REQUIRED_DOC_TYPES = ['W9', 'COI'] as const

function classifyRisk(
  subId: string,
  docsBySub: Record<string, Array<{ type: string; status: string; expiry_date: string | null }>>,
  today: string,
): RiskLevel {
  const docs = docsBySub[subId] ?? []

  for (const doc of docs) {
    if (doc.status === 'rejected') return 'critical'
    if (doc.expiry_date && doc.expiry_date < today) return 'critical'
  }

  for (const type of REQUIRED_DOC_TYPES) {
    const doc = docs.find((d) => d.type === type)
    if (!doc) return 'elevated'
    if (doc.status === 'pending' || doc.status === 'pending_verification') return 'elevated'
  }

  return 'low'
}

// ── Metric card ────────────────────────────────────────────────

function MetricCard({
  icon: Icon, label, value, iconBg, iconFg, accentRed, accentAmber,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  iconBg: string
  iconFg: string
  accentRed?: boolean
  accentAmber?: boolean
}) {
  const borderClass = accentRed
    ? 'border-red-200 ring-1 ring-red-100'
    : accentAmber
    ? 'border-amber-200 ring-1 ring-amber-50'
    : 'border-slate-200'
  const textClass = accentRed ? 'text-red-600' : accentAmber ? 'text-amber-600' : 'text-slate-900'

  return (
    <div className={`flex items-center gap-4 rounded-xl border bg-white p-5 shadow-sm ${borderClass}`}>
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
        <Icon className={`h-5 w-5 ${iconFg}`} />
      </div>
      <div>
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className={`text-3xl font-bold ${textClass}`}>{value}</p>
      </div>
    </div>
  )
}

// ── Risk Distribution card ─────────────────────────────────────

function RiskDistributionCard({
  critical, elevated, low, total,
}: { critical: number; elevated: number; low: number; total: number }) {
  const critPct = total > 0 ? Math.round((critical / total) * 100) : 0
  const elevPct = total > 0 ? Math.round((elevated / total) * 100) : 0
  const lowPct  = 100 - critPct - elevPct

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500">Fleet Risk Distribution</p>
        <Link href="/gc/risk" className="text-xs font-semibold text-indigo-600 hover:underline">
          View Register →
        </Link>
      </div>
      {total === 0 ? (
        <p className="text-sm text-slate-400">No subcontractors yet.</p>
      ) : (
        <>
          <div className="flex h-3 w-full overflow-hidden rounded-full">
            {critPct > 0 && <div className="bg-red-500"     style={{ width: `${critPct}%` }} />}
            {elevPct > 0 && <div className="bg-amber-400"   style={{ width: `${elevPct}%` }} />}
            {lowPct  > 0 && <div className="bg-emerald-500" style={{ width: `${lowPct}%` }} />}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
            {[
              { label: 'Critical',   count: critical, pct: critPct, dot: 'bg-red-500',     text: 'text-red-600'     },
              { label: 'Elevated',   count: elevated, pct: elevPct, dot: 'bg-amber-400',   text: 'text-amber-600'   },
              { label: 'Site Ready', count: low,      pct: lowPct,  dot: 'bg-emerald-500', text: 'text-emerald-600' },
            ].map(({ label, count, pct, dot, text }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
                <span className={`text-xs font-bold tabular-nums ${text}`}>{count}</span>
                <span className="text-xs text-slate-500">{label}</span>
                <span className="text-xs text-slate-400">({pct}%)</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Compliance rate card ───────────────────────────────────────

function ComplianceRateCard({ pct }: { pct: number }) {
  const barColor =
    pct === 100 ? 'bg-emerald-500' :
    pct >= 70   ? 'bg-amber-400' :
                  'bg-red-500'
  const textColor =
    pct === 100 ? 'text-emerald-600' :
    pct >= 70   ? 'text-amber-600' :
                  'text-red-600'

  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100">
        <TrendingUp className={`h-5 w-5 ${textColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-500">Global Compliance</p>
        <p className={`text-3xl font-bold ${textColor}`}>{pct}%</p>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all duration-700 ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  )
}

// ── Skeleton ───────────────────────────────────────────────────

function CommandCenterSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="p-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Async data component ───────────────────────────────────────

async function CommandCenterData({ showArchived }: { showArchived: boolean }) {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return null

  const todayStr    = new Date().toISOString().split('T')[0]
  const in30Days    = new Date()
  in30Days.setDate(in30Days.getDate() + 30)
  const in30DaysStr = in30Days.toISOString().split('T')[0]

  // Build the projects query — filter archived unless toggled on
  let projectsQuery = supabase
    .from('projects')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
  if (!showArchived) {
    projectsQuery = projectsQuery.eq('status', 'active')
  }

  const [projectsResult, subsResult, rejectedResult, expiringResult, docsResult] = await Promise.all([
    projectsQuery,
    supabase.from('subcontractors').select('id, project_id, compliance_status, risk_score').eq('organization_id', orgId),
    supabase.from('documents').select('id').eq('status', 'rejected').eq('organization_id', orgId).eq('is_current', true),
    supabase
      .from('documents')
      .select('subcontractor_id, expiry_date')
      .eq('status', 'approved')
      .eq('organization_id', orgId)
      .not('expiry_date', 'is', null)
      .gte('expiry_date', todayStr)
      .lte('expiry_date', in30DaysStr),
    supabase
      .from('documents')
      .select('subcontractor_id, type, status, expiry_date')
      .eq('organization_id', orgId)
      .eq('is_current', true),
  ])

  const projects     = projectsResult.data ?? []
  const allSubs      = subsResult.data ?? []
  const actionCount  = (rejectedResult.data ?? []).length
  const expiringDocs = expiringResult.data ?? []

  // Only count subs that belong to the fetched (filtered) projects
  const projectIdSet = new Set(projects.map((p) => p.id))
  const subs = allSubs.filter((s) => projectIdSet.has(s.project_id))

  // Group current docs by sub for risk classification
  const docsBySub: Record<string, Array<{ type: string; status: string; expiry_date: string | null }>> = {}
  for (const d of docsResult.data ?? []) {
    if (!docsBySub[d.subcontractor_id]) docsBySub[d.subcontractor_id] = []
    docsBySub[d.subcontractor_id].push(d)
  }

  // Build subId → projectId map for expiry lookup
  const subToProject = Object.fromEntries(subs.map((s) => [s.id, s.project_id]))

  // Group expiring docs by project
  const todayUtc = new Date(todayStr)
  const expiringByProject: Record<string, { count: number; minDays: number }> = {}
  for (const doc of expiringDocs) {
    const projectId = subToProject[doc.subcontractor_id]
    if (!projectId) continue
    const daysUntil = Math.round(
      (new Date(doc.expiry_date!).getTime() - todayUtc.getTime()) / 86_400_000,
    )
    if (!expiringByProject[projectId]) expiringByProject[projectId] = { count: 0, minDays: 999 }
    expiringByProject[projectId].count++
    expiringByProject[projectId].minDays = Math.min(expiringByProject[projectId].minDays, daysUntil)
  }

  // Group subs by project
  const subsByProject = subs.reduce<Record<string, typeof subs>>((acc, sub) => {
    if (!acc[sub.project_id]) acc[sub.project_id] = []
    acc[sub.project_id].push(sub)
    return acc
  }, {})

  // Enrich each project
  const enriched: ProjectEnriched[] = projects.map((p) => {
    const ps               = subsByProject[p.id] ?? []
    const compliantSubs    = ps.filter((s) => s.compliance_status === 'compliant').length
    const nonCompliantSubs = ps.filter((s) => s.compliance_status === 'non_compliant').length
    const expiry           = expiringByProject[p.id]
    return {
      ...p,
      totalSubs: ps.length,
      compliantSubs,
      nonCompliantSubs,
      isAtRisk:          nonCompliantSubs > 0,
      expiringCount:     expiry?.count ?? 0,
      soonestExpiryDays: expiry?.minDays ?? null,
    }
  })

  // Global metrics (scoped to visible projects)
  const totalSubs           = subs.length
  const compliantTotal      = subs.filter((s) => s.compliance_status === 'compliant').length
  const globalCompliancePct = totalSubs > 0 ? Math.round((compliantTotal / totalSubs) * 100) : 100
  const totalExpiringDocs   = expiringDocs.filter((d) => subToProject[d.subcontractor_id]).length

  // Risk distribution using document-based classification
  const riskCritical = subs.filter((s) => classifyRisk(s.id, docsBySub, todayStr) === 'critical').length
  const riskElevated = subs.filter((s) => classifyRisk(s.id, docsBySub, todayStr) === 'elevated').length
  const riskLow      = subs.filter((s) => classifyRisk(s.id, docsBySub, todayStr) === 'low').length

  // Zero-state onboarding for brand-new GC accounts
  if (projects.length === 0 && !showArchived) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white px-8 py-14 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50">
          <FolderPlus className="h-8 w-8 text-indigo-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Welcome to HardHat Compliance</h2>
        <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">
          Get your first site running in three steps. It takes under two minutes.
        </p>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3 max-w-2xl mx-auto text-left">
          {[
            { step: '1', icon: FolderPlus,  title: 'Create a project',       body: 'Name your site or contract. All subcontractors and documents live here.' },
            { step: '2', icon: UserPlus,    title: 'Add subcontractors',      body: 'Add each sub by email. Send them an invite link to upload their own docs.' },
            { step: '3', icon: ScanLine,    title: 'Start gate scanning',     body: 'Use the Gate page to scan QR passes. Only compliant subs get through.' },
          ].map(({ step, icon: Icon, title, body }) => (
            <div key={step} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white border border-slate-200 text-sm font-bold text-indigo-600 shadow-sm">
                {step}
              </div>
              <p className="text-sm font-semibold text-slate-800">{title}</p>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
        <div className="mt-8">
          <AddProjectDialog />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Global metric cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={Users}
          label={showArchived ? 'Total Subs (All)' : 'Total Active Subs'}
          value={totalSubs}
          iconBg="bg-indigo-100"
          iconFg="text-indigo-600"
        />
        <MetricCard
          icon={actionCount > 0 ? AlertCircle : ShieldCheck}
          label="Action Required"
          value={actionCount}
          iconBg={actionCount > 0 ? 'bg-red-100' : 'bg-emerald-100'}
          iconFg={actionCount > 0 ? 'text-red-600' : 'text-emerald-600'}
          accentRed={actionCount > 0}
        />
        <MetricCard
          icon={Clock}
          label="Expiring in 30 Days"
          value={totalExpiringDocs}
          iconBg={totalExpiringDocs > 0 ? 'bg-amber-100' : 'bg-slate-100'}
          iconFg={totalExpiringDocs > 0 ? 'text-amber-600' : 'text-slate-400'}
          accentAmber={totalExpiringDocs > 0}
        />
        <ComplianceRateCard pct={globalCompliancePct} />
      </div>

      {/* Risk distribution */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RiskDistributionCard
          critical={riskCritical}
          elevated={riskElevated}
          low={riskLow}
          total={totalSubs}
        />
      </div>

      {/* Projects table */}
      <CommandCenterTable rows={enriched} />
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────

export default async function GCProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ showArchived?: string }>
}) {
  const sp = await searchParams
  const showArchived = sp.showArchived === '1'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Compliance status across all your active projects.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Suspense fallback={null}>
            <ShowArchivedToggle showArchived={showArchived} />
          </Suspense>
          <ExpiryButton />
          <AddProjectDialog />
        </div>
      </div>

      <Suspense fallback={null}>
        <NotificationStrip />
      </Suspense>

      <Suspense fallback={<CommandCenterSkeleton />}>
        <CommandCenterData showArchived={showArchived} />
      </Suspense>
    </div>
  )
}
