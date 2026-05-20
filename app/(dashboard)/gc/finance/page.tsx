import { Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Landmark, ShieldCheck, ShieldX, AlertTriangle, Users, Loader2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { RiskScoreBar } from '@/components/risk-score-bar'
import { ReleaseButton } from './release-button'
import { ExportLedgerButton } from './export-button'
import type { PaymentStatus } from '@/types/database.types'

// ── Payment status pill ────────────────────────────────────────

function PaymentStatusPill({ status }: { status: PaymentStatus }) {
  if (status === 'Clear to Pay') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-950 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400 ring-1 ring-emerald-800">
        <ShieldCheck className="h-3 w-3" />
        Clear to Pay
      </span>
    )
  }
  if (status === 'Compliance Hold') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-950 px-2.5 py-0.5 text-[11px] font-semibold text-red-400 ring-1 ring-red-800">
        <ShieldX className="h-3 w-3" />
        Compliance Hold
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-950 px-2.5 py-0.5 text-[11px] font-semibold text-amber-400 ring-1 ring-amber-800">
      <AlertTriangle className="h-3 w-3" />
      Manual Review
    </span>
  )
}

// ── Metric card ────────────────────────────────────────────────

function MetricCard({
  icon: Icon, label, value, iconBg, iconFg, border,
}: {
  icon: React.ElementType
  label: string
  value: number
  iconBg: string
  iconFg: string
  border?: string
}) {
  return (
    <div className={`flex items-center gap-4 rounded-xl border bg-white p-5 shadow-sm ${border ?? 'border-slate-200'}`}>
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
        <Icon className={`h-5 w-5 ${iconFg}`} />
      </div>
      <div>
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="text-3xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  )
}

// ── Skeleton ───────────────────────────────────────────────────

function FinanceSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-12" />
            </div>
          </div>
        ))}
      </div>
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  )
}

// ── Async data ─────────────────────────────────────────────────

async function FinanceData() {
  const supabase = await createClient()

  const [subsResult, flaggedResult, projectsResult] = await Promise.all([
    supabase
      .from('subcontractors')
      .select('id, company_name, contact_email, risk_score, compliance_status, payment_status, project_id')
      .order('risk_score', { ascending: false }),
    supabase
      .from('compliance_docs')
      .select('subcontractor_id')
      .eq('audit_status', 'Flagged'),
    supabase.from('projects').select('id, name'),
  ])

  const subs     = subsResult.data ?? []
  const projects = Object.fromEntries((projectsResult.data ?? []).map((p) => [p.id, p.name]))

  const flaggedCounts: Record<string, number> = {}
  for (const d of flaggedResult.data ?? []) {
    flaggedCounts[d.subcontractor_id] = (flaggedCounts[d.subcontractor_id] ?? 0) + 1
  }

  const clearCount   = subs.filter((s) => s.payment_status === 'Clear to Pay').length
  const holdCount    = subs.filter((s) => s.payment_status === 'Compliance Hold').length
  const reviewCount  = subs.filter((s) => s.payment_status === 'Manual Review').length

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard icon={Users}         label="Total Vendors"     value={subs.length} iconBg="bg-slate-100"    iconFg="text-slate-600" />
        <MetricCard icon={ShieldCheck}   label="Clear to Pay"      value={clearCount}  iconBg="bg-emerald-100" iconFg="text-emerald-600" border="border-emerald-200 ring-1 ring-emerald-100" />
        <MetricCard icon={ShieldX}       label="Compliance Hold"   value={holdCount}   iconBg="bg-red-100"     iconFg="text-red-600"    border={holdCount > 0 ? 'border-red-200 ring-1 ring-red-100' : 'border-slate-200'} />
        <MetricCard icon={AlertTriangle} label="Manual Review"     value={reviewCount} iconBg="bg-amber-100"   iconFg="text-amber-600"  border={reviewCount > 0 ? 'border-amber-200 ring-1 ring-amber-50' : 'border-slate-200'} />
      </div>

      {/* Finance table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3.5">
          <div>
            <h2 className="text-sm font-semibold text-slate-700">Payment Ledger</h2>
            <p className="text-xs text-slate-400">Sorted by highest risk. Compliance Hold requires manual release before payment.</p>
          </div>
          <ExportLedgerButton />
        </div>

        {subs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Landmark className="h-10 w-10 text-slate-300" />
            <p className="text-sm font-medium text-slate-500">No subcontractors yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Subcontractor', 'Project', 'Risk Score', 'Compliance', 'Payment Status', 'Flags', 'Action'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 first:pl-5 last:pr-5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {subs.map((sub) => {
                  const flags = flaggedCounts[sub.id] ?? 0
                  return (
                    <tr
                      key={sub.id}
                      className={`transition-colors hover:bg-slate-50/80 ${
                        sub.payment_status === 'Compliance Hold'
                          ? 'bg-red-50/40'
                          : sub.payment_status === 'Manual Review' && sub.risk_score >= 31
                          ? 'bg-amber-50/20'
                          : ''
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
                      <td className="px-4 py-3.5 text-sm text-slate-600">
                        {projects[(sub as { project_id?: string }).project_id ?? ''] ?? (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <RiskScoreBar score={sub.risk_score ?? 0} />
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${
                          sub.compliance_status === 'compliant'
                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                            : sub.compliance_status === 'non_compliant'
                            ? 'bg-red-50 text-red-700 ring-red-200'
                            : 'bg-amber-50 text-amber-700 ring-amber-200'
                        }`}>
                          {sub.compliance_status === 'compliant' ? 'Compliant' : sub.compliance_status === 'non_compliant' ? 'Non-Compliant' : 'Warning'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <PaymentStatusPill status={sub.payment_status as PaymentStatus} />
                      </td>
                      <td className="px-4 py-3.5 tabular-nums">
                        {flags > 0 ? (
                          <span className="font-semibold text-red-600">{flags} flagged</span>
                        ) : (
                          <span className="text-slate-400">None</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 pr-5">
                        {sub.payment_status === 'Compliance Hold' ? (
                          <ReleaseButton subId={sub.id} companyName={sub.company_name} />
                        ) : (
                          <Link
                            href={`/gc/risk/${sub.id}`}
                            className="text-xs font-medium text-indigo-600 hover:underline"
                          >
                            View Profile →
                          </Link>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Compliance First footer note */}
      <p className="text-center text-xs text-slate-400">
        Payment statuses are computed automatically by the HardHat Finance Engine based on live risk scores and document audit results.
        Manual overrides are permanently logged to the{' '}
        <Link href="/gc/audit" className="text-indigo-600 hover:underline">Golden Thread</Link>.
      </p>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────

export default function FinanceHubPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Finance Hub</h1>
          <p className="mt-1 text-sm text-slate-500">
            Compliance-to-payment ledger. Only subcontractors with verified docs and low risk are cleared.
          </p>
        </div>
        <Link
          href="/gc/finance/certificates"
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shrink-0"
        >
          <Landmark className="h-4 w-4" />
          Payment Certificates
        </Link>
      </div>

      <Suspense fallback={<FinanceSkeleton />}>
        <FinanceData />
      </Suspense>
    </div>
  )
}
