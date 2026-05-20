import { Suspense } from 'react'
import { CalendarDays, Users, TrendingUp, ShieldX } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase'

// ── Helpers ──────────────────────────────────────────────────────

function formatDate(isoDate: string): string {
  return new Date(isoDate + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

function last7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().split('T')[0]
  })
}

// ── SVG Bar Chart ─────────────────────────────────────────────────

function PunchCardChart({
  days,
  maxGranted,
}: {
  days: { date: string; granted: number; denied: number }[]
  maxGranted: number
}) {
  const W = 600
  const H = 160
  const PADDING = { top: 12, bottom: 36, left: 8, right: 8 }
  const chartW = W - PADDING.left - PADDING.right
  const chartH = H - PADDING.top - PADDING.bottom
  const barW   = Math.floor(chartW / days.length) - 6
  const step   = Math.floor(chartW / days.length)

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label="Weekly attendance punch-card"
    >
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
        const y = PADDING.top + chartH * (1 - pct)
        return (
          <line
            key={pct}
            x1={PADDING.left}
            y1={y}
            x2={W - PADDING.right}
            y2={y}
            stroke="#e2e8f0"
            strokeWidth="1"
          />
        )
      })}

      {days.map((day, i) => {
        const cx = PADDING.left + i * step + step / 2
        const grantedH = maxGranted > 0 ? (day.granted / maxGranted) * chartH : 0
        const deniedH  = maxGranted > 0 ? (day.denied  / maxGranted) * chartH : 0
        const isToday  = day.date === new Date().toISOString().split('T')[0]

        return (
          <g key={day.date}>
            {/* Denied bar (underneath, red) */}
            {day.denied > 0 && (
              <rect
                x={cx - barW / 2}
                y={PADDING.top + chartH - deniedH}
                width={barW}
                height={deniedH}
                rx={3}
                className="fill-red-200"
              />
            )}

            {/* Granted bar (emerald) */}
            {day.granted > 0 && (
              <rect
                x={cx - barW / 2}
                y={PADDING.top + chartH - grantedH}
                width={barW}
                height={grantedH}
                rx={3}
                className={isToday ? 'fill-indigo-500' : 'fill-emerald-400'}
              />
            )}

            {/* Count label above bar */}
            {day.granted > 0 && (
              <text
                x={cx}
                y={PADDING.top + chartH - grantedH - 4}
                textAnchor="middle"
                fontSize="10"
                className="fill-slate-500 font-medium"
              >
                {day.granted}
              </text>
            )}

            {/* Day label */}
            <text
              x={cx}
              y={H - 4}
              textAnchor="middle"
              fontSize="10"
              className={isToday ? 'fill-indigo-600 font-semibold' : 'fill-slate-400'}
            >
              {new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ── Data component ────────────────────────────────────────────────

async function AttendanceData() {
  const supabase = await createClient()
  const days7    = last7Days()
  const rangeStart = days7[0]

  // Raw access logs for the last 7 days
  const { data: logs } = await supabase
    .from('site_access_logs')
    .select('subcontractor_id, result, created_at')
    .gte('created_at', rangeStart + 'T00:00:00.000Z')
    .order('created_at', { ascending: true })

  // Aggregate by date
  const byDate: Record<string, { granted: number; denied: number; uniqueSubs: Set<string> }> = {}
  for (const day of days7) {
    byDate[day] = { granted: 0, denied: 0, uniqueSubs: new Set() }
  }
  for (const log of logs ?? []) {
    const day = log.created_at.split('T')[0]
    if (!byDate[day]) continue
    if (log.result === 'GRANTED') {
      byDate[day].granted++
      byDate[day].uniqueSubs.add(log.subcontractor_id)
    } else {
      byDate[day].denied++
    }
  }

  const chartDays = days7.map((d) => ({
    date:    d,
    granted: byDate[d].granted,
    denied:  byDate[d].denied,
    unique:  byDate[d].uniqueSubs.size,
  }))

  const totalGranted = chartDays.reduce((s, d) => s + d.granted, 0)
  const totalDenied  = chartDays.reduce((s, d) => s + d.denied, 0)
  const peakDay      = chartDays.reduce((best, d) => d.granted > best.granted ? d : best, chartDays[0])
  const maxGranted   = Math.max(...chartDays.map((d) => d.granted), 1)

  // Detailed log table — last 20 entries
  const { data: recentLogs } = await supabase
    .from('site_access_logs')
    .select('id, result, created_at, gate_location, denial_reasons, subcontractors(company_name, profile_photo_url)')
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <div className="space-y-6">
      {/* Metric summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: '7-Day Entries', value: totalGranted, icon: Users,        bg: 'bg-emerald-100', fg: 'text-emerald-600' },
          { label: '7-Day Denied',  value: totalDenied,  icon: ShieldX,      bg: 'bg-red-100',     fg: 'text-red-600'     },
          { label: 'Avg / Day',     value: (totalGranted / 7).toFixed(1), icon: TrendingUp, bg: 'bg-indigo-100', fg: 'text-indigo-600' },
          { label: 'Peak Day',      value: peakDay.granted > 0 ? formatDate(peakDay.date) : '—', icon: CalendarDays, bg: 'bg-amber-100', fg: 'text-amber-600' },
        ].map(({ label, value, icon: Icon, bg, fg }) => (
          <div key={label} className="flex items-center gap-3.5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bg}`}>
              <Icon className={`h-5 w-5 ${fg}`} />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">{label}</p>
              <p className="text-xl font-bold text-slate-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Punch-card chart */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-700">Weekly Gate Activity</h2>
            <p className="mt-0.5 text-xs text-slate-400">Scans per day — green = granted, red = denied</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-400" /> Granted</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-red-200" /> Denied</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-indigo-500" /> Today</span>
          </div>
        </div>
        <PunchCardChart days={chartDays} maxGranted={maxGranted} />
      </div>

      {/* Recent log table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-700">Recent Gate Events</h2>
        </div>
        {(recentLogs ?? []).length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-400">No gate events yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                {['Company', 'Result', 'Location', 'Reason', 'Time'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 first:pl-5 last:pr-5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(recentLogs ?? []).map((log) => {
                const sub = log.subcontractors as { company_name: string } | null
                return (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 pl-5 pr-4 font-medium text-slate-800">
                      {sub?.company_name ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${
                        log.result === 'GRANTED'
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                          : 'bg-red-50 text-red-700 ring-red-200'
                      }`}>
                        {log.result}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{log.gate_location ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-[200px] truncate">
                      {log.denial_reasons?.[0] ?? '—'}
                    </td>
                    <td className="px-4 py-3 pr-5 text-xs text-slate-400">
                      {new Date(log.created_at).toLocaleString('en-US', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────

function AttendanceSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-52 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────

export default function AttendancePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
          <CalendarDays className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Attendance Analytics</h1>
          <p className="text-sm text-slate-500">
            Weekly gate activity and worker presence on site.
          </p>
        </div>
      </div>

      <Suspense fallback={<AttendanceSkeleton />}>
        <AttendanceData />
      </Suspense>
    </div>
  )
}
