import { Suspense } from 'react'
import Link from 'next/link'
import { Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { getOrgId } from '@/lib/org'
import { Skeleton } from '@/components/ui/skeleton'
import type { LeaderboardEntry } from '@/types/database.types'

const MEDALS = ['🥇', '🥈', '🥉']

const STATUS_COLORS: Record<string, string> = {
  compliant:     'bg-emerald-50  text-emerald-700  ring-1 ring-emerald-200',
  warning:       'bg-amber-50    text-amber-700    ring-1 ring-amber-200',
  non_compliant: 'bg-red-50      text-red-700      ring-1 ring-red-200',
}
const STATUS_LABELS: Record<string, string> = {
  compliant:     'Compliant',
  warning:       'Warning',
  non_compliant: 'At Risk',
}

async function LeaderboardTable() {
  const supabase = await createClient()
  const orgId = await getOrgId()

  const { data } = orgId
    ? await supabase
        .from('subcontractor_leaderboard')
        .select('id, company_name, compliance_status, risk_score, project_name, rank')
        .eq('organization_id', orgId)
        .order('rank', { ascending: true })
    : { data: null }

  const entries = (data ?? []) as LeaderboardEntry[]

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white py-20 text-center">
        <Trophy className="mx-auto h-10 w-10 text-slate-200" />
        <p className="mt-4 text-sm font-medium text-slate-500">No subcontractors yet.</p>
        <p className="mt-1 text-xs text-slate-400">Add subcontractors to see the leaderboard.</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50">
            {['Rank', 'Subcontractor', 'Project', 'Status', 'Risk Score'].map((h) => (
              <th
                key={h}
                className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 first:pl-5 last:pr-5"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {entries.map((e, idx) => {
            const medal = MEDALS[idx]
            const isTop3 = idx < 3
            const statusClass = STATUS_COLORS[e.compliance_status] ?? 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
            const statusLabel = STATUS_LABELS[e.compliance_status] ?? e.compliance_status

            return (
              <tr
                key={e.id}
                className={`transition-colors hover:bg-slate-50 ${isTop3 ? 'hover:bg-amber-50/30' : ''}`}
              >
                {/* Rank */}
                <td className="py-3.5 pl-5 pr-3 w-16">
                  {medal ? (
                    <span className="text-xl leading-none">{medal}</span>
                  ) : (
                    <span className="text-sm font-semibold tabular-nums text-slate-400">#{e.rank}</span>
                  )}
                </td>

                {/* Company */}
                <td className="px-3 py-3.5">
                  <Link
                    href={`/gc/risk/${e.id}`}
                    className={`font-semibold hover:underline ${isTop3 ? 'text-slate-900' : 'text-slate-700'}`}
                  >
                    {e.company_name}
                  </Link>
                </td>

                {/* Project */}
                <td className="px-3 py-3.5 text-slate-500">{e.project_name}</td>

                {/* Status */}
                <td className="px-3 py-3.5">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClass}`}>
                    {statusLabel}
                  </span>
                </td>

                {/* Risk score with mini bar */}
                <td className="py-3.5 pl-3 pr-5">
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${
                          e.risk_score < 31 ? 'bg-emerald-500' :
                          e.risk_score < 71 ? 'bg-amber-400' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(100, e.risk_score)}%` }}
                      />
                    </div>
                    <span className={`text-sm font-bold tabular-nums ${
                      e.risk_score < 31 ? 'text-emerald-600' :
                      e.risk_score < 71 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {e.risk_score}
                    </span>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function LeaderboardSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-xl" />
      ))}
    </div>
  )
}

export default function LeaderboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
          <Trophy className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Compliance Leaderboard</h1>
          <p className="text-sm text-slate-500">
            Subcontractors ranked by risk score — lower is safer.
          </p>
        </div>
      </div>

      <Suspense fallback={<LeaderboardSkeleton />}>
        <LeaderboardTable />
      </Suspense>
    </div>
  )
}
