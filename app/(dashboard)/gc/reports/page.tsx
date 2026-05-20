import { Suspense } from 'react'
import { BarChart3, Users, ShieldCheck, AlertCircle, Clock } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase'
import { ReportClient } from './report-client'

// ── Live metric preview (server-rendered) ──────────────────────

async function MetricPreview() {
  const supabase = await createClient()
  const today    = new Date().toISOString().split('T')[0]
  const in30     = new Date(); in30.setDate(in30.getDate() + 30)
  const in30Str  = in30.toISOString().split('T')[0]

  const [subsRes, expiringRes, auditRes] = await Promise.all([
    supabase.from('subcontractors').select('compliance_status, safety_induction_complete'),
    supabase.from('documents').select('id').eq('status', 'approved').not('expiry_date', 'is', null)
      .gte('expiry_date', today).lte('expiry_date', in30Str),
    supabase.from('audit_events').select('id').limit(1),
  ])

  const subs        = subsRes.data ?? []
  const total       = subs.length
  const compliant   = subs.filter((s) => s.compliance_status === 'compliant').length
  const nonComp     = subs.filter((s) => s.compliance_status === 'non_compliant').length
  const inducted    = subs.filter((s) => s.safety_induction_complete).length
  const pct         = total > 0 ? Math.round((compliant / total) * 100) : 100
  const expiring    = (expiringRes.data ?? []).length

  const metrics = [
    { label: 'Total Subcontractors', value: total,     icon: Users,       bg: 'bg-indigo-100',  fg: 'text-indigo-600'  },
    { label: 'Global Compliance',    value: `${pct}%`, icon: ShieldCheck, bg: 'bg-emerald-100', fg: 'text-emerald-600' },
    { label: 'At Risk',              value: nonComp,   icon: AlertCircle, bg: 'bg-red-100',     fg: 'text-red-600'     },
    { label: 'Expiring (30d)',        value: expiring,  icon: Clock,       bg: 'bg-amber-100',   fg: 'text-amber-600'   },
    { label: 'Inducted Workers',     value: `${inducted}/${total}`, icon: ShieldCheck, bg: 'bg-slate-100', fg: 'text-slate-600' },
  ]

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">Live Fleet Snapshot</h2>
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
          Real-time
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {metrics.map(({ label, value, icon: Icon, bg, fg }) => (
          <div key={label} className="rounded-lg border border-slate-100 bg-slate-50 p-3.5 text-center">
            <div className={`mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full ${bg}`}>
              <Icon className={`h-4 w-4 ${fg}`} />
            </div>
            <p className="text-xl font-black text-slate-900">{value}</p>
            <p className="mt-0.5 text-[10px] font-medium text-slate-500 leading-tight">{label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function MetricPreviewSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
          <BarChart3 className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Report Center</h1>
          <p className="text-sm text-slate-500">
            Generate executive PDF reports and export audit data for legal review.
          </p>
        </div>
      </div>

      {/* Live metrics preview */}
      <Suspense fallback={<MetricPreviewSkeleton />}>
        <MetricPreview />
      </Suspense>

      {/* Client: date picker + generate/export buttons */}
      <ReportClient />
    </div>
  )
}
