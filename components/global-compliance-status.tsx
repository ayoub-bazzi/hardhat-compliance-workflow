import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { getOrgId } from '@/lib/org'
import { ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react'

async function fetchSiteReadinessPct(): Promise<{
  pct: number
  siteReady: number
  total: number
}> {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return { pct: 100, siteReady: 0, total: 0 }

  const { data: subs } = await supabase
    .from('subcontractors')
    .select('id, compliance_status')
    .eq('organization_id', orgId)

  if (!subs || subs.length === 0) return { pct: 100, siteReady: 0, total: 0 }

  const total     = subs.length
  const siteReady = subs.filter((s) => s.compliance_status === 'compliant').length
  const pct       = Math.round((siteReady / total) * 100)
  return { pct, siteReady, total }
}

export async function GlobalComplianceStatus() {
  const { pct, siteReady, total } = await fetchSiteReadinessPct()

  if (total === 0) return null

  const isGreen = pct === 100
  const isAmber = pct >= 70 && pct < 100
  const isRed   = pct < 70

  const StatusIcon = isGreen ? ShieldCheck : isAmber ? ShieldAlert : ShieldX
  const accentColor = isGreen
    ? 'text-emerald-400'
    : isAmber
    ? 'text-amber-400'
    : 'text-red-400'
  const barColor = isGreen
    ? 'bg-emerald-500'
    : isAmber
    ? 'bg-amber-400'
    : 'bg-red-500'
  const statusLabel = isGreen
    ? 'All Clear'
    : isAmber
    ? 'Attention Required'
    : 'Critical — Access Denied'

  return (
    <div className="border-b border-slate-800 bg-slate-900 px-6 py-3 lg:px-8">
      <div className="flex flex-wrap items-center gap-4">
        {/* Icon + label */}
        <div className="flex items-center gap-2">
          <StatusIcon className={`h-4 w-4 shrink-0 ${accentColor}`} />
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Global Compliance Status
          </span>
        </div>

        {/* Progress bar */}
        <div className="flex flex-1 items-center gap-3 min-w-[160px]">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-700">
            <div
              className={`h-full rounded-full transition-all duration-700 ${barColor}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className={`text-sm font-bold tabular-nums ${accentColor}`}>
            {pct}%
          </span>
        </div>

        {/* Counts */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className="font-semibold text-white">{siteReady}</span>
          <span>of</span>
          <span className="font-semibold text-white">{total}</span>
          <span>subs site-ready</span>
        </div>

        {/* Status pill — links to Risk Overview when not green */}
        {isGreen ? (
          <span className="rounded-full bg-emerald-950 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400 ring-1 ring-emerald-800">
            {statusLabel}
          </span>
        ) : (
          <Link
            href="/gc/risk"
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 transition-opacity hover:opacity-80 ${
              isAmber
                ? 'bg-amber-950 text-amber-400 ring-amber-800'
                : 'bg-red-950 text-red-400 ring-red-800'
            }`}
          >
            {statusLabel} →
          </Link>
        )}
      </div>
    </div>
  )
}
