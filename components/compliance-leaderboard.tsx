import Link from 'next/link'
import { Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { getOrgId } from '@/lib/org'
import type { LeaderboardEntry } from '@/types/database.types'

const MEDALS = ['🥇', '🥈', '🥉']

const COMPLIANCE_COLORS: Record<string, string> = {
  compliant:     'bg-emerald-100 text-emerald-700',
  warning:       'bg-amber-100 text-amber-700',
  non_compliant: 'bg-red-100 text-red-700',
}
const COMPLIANCE_LABELS: Record<string, string> = {
  compliant:     'Compliant',
  warning:       'Warning',
  non_compliant: 'At Risk',
}

export async function ComplianceLeaderboard({ limit = 5 }: { limit?: number }) {
  const supabase = await createClient()
  const orgId = await getOrgId()

  const { data } = orgId
    ? await supabase
        .from('subcontractor_leaderboard')
        .select('id, company_name, compliance_status, risk_score, project_name, rank')
        .eq('organization_id', orgId)
        .order('rank', { ascending: true })
        .limit(limit)
    : { data: null }

  const entries = (data ?? []) as LeaderboardEntry[]

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          <h2 className="text-sm font-semibold text-slate-700">Compliance Leaderboard</h2>
        </div>
        <Link href="/gc/leaderboard" className="text-xs font-semibold text-indigo-600 hover:underline">
          Full board →
        </Link>
      </div>

      {entries.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-slate-400">
          No subcontractors yet.
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {entries.map((e, idx) => {
            const medal = MEDALS[idx] ?? null
            const badge = COMPLIANCE_COLORS[e.compliance_status] ?? 'bg-slate-100 text-slate-500'
            const label = COMPLIANCE_LABELS[e.compliance_status] ?? e.compliance_status
            const isTop3 = idx < 3

            return (
              <Link
                key={e.id}
                href={`/gc/risk/${e.id}`}
                className={`flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-slate-50 ${isTop3 ? 'hover:bg-amber-50/40' : ''}`}
              >
                {/* Rank + Medal */}
                <div className="flex w-8 shrink-0 items-center justify-center">
                  {medal ? (
                    <span className="text-xl leading-none">{medal}</span>
                  ) : (
                    <span className="text-sm font-bold tabular-nums text-slate-400">
                      #{e.rank}
                    </span>
                  )}
                </div>

                {/* Company info */}
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-semibold ${isTop3 ? 'text-slate-900' : 'text-slate-700'}`}>
                    {e.company_name}
                  </p>
                  <p className="truncate text-xs text-slate-400">{e.project_name}</p>
                </div>

                {/* Status badge */}
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge}`}>
                  {label}
                </span>

                {/* Risk score */}
                <div className="shrink-0 text-right">
                  <p className={`text-sm font-bold tabular-nums ${
                    e.risk_score < 31 ? 'text-emerald-600' :
                    e.risk_score < 71 ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {e.risk_score}
                  </p>
                  <p className="text-[10px] text-slate-400">risk</p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
