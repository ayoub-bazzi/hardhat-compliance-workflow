import { computeAttendanceHeatmap, DOW_LABELS } from '@/lib/labor-analytics'

const HOURS = Array.from({ length: 14 }, (_, i) => i + 6) // 06:00 – 19:00

function heatColor(count: number, max: number): string {
  if (max === 0 || count === 0) return '#f8fafc'  // slate-50
  const pct = count / max
  if (pct < 0.2)  return '#fef3c7'  // amber-100
  if (pct < 0.45) return '#fcd34d'  // amber-300
  if (pct < 0.7)  return '#f59e0b'  // amber-500
  if (pct < 0.9)  return '#b45309'  // amber-700
  return '#ef4444'                   // red-500 (peak density)
}

export async function AttendanceHeatmapChart() {
  const cells = await computeAttendanceHeatmap()

  // Group by date
  const dateSet = [...new Set(cells.map((c) => c.date))].sort()
  const maxCount = Math.max(...cells.map((c) => c.count), 1)

  const cellMap: Record<string, number> = {}
  for (const c of cells) cellMap[`${c.date}:${c.hour}`] = c.count

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-100 bg-slate-50 px-5 py-3.5">
        <h2 className="text-sm font-semibold text-slate-700">Site Density Heatmap</h2>
        <p className="mt-0.5 text-xs text-slate-400">
          Gate entries by hour — last 7 days · Use to optimise security guard shifts
        </p>
      </div>

      <div className="p-5 overflow-x-auto">
        <table className="w-full border-collapse text-xs select-none">
          <thead>
            <tr>
              <th className="w-12 py-1 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400 pr-2">
                Day
              </th>
              {HOURS.map((h) => (
                <th key={h} className="px-px py-1 text-center text-[9px] font-medium text-slate-400 min-w-[26px]">
                  {String(h).padStart(2, '0')}h
                </th>
              ))}
              <th className="px-2 py-1 text-right text-[9px] font-medium text-slate-400">Total</th>
            </tr>
          </thead>
          <tbody>
            {dateSet.map((date) => {
              const dow  = new Date(date + 'T00:00:00').getDay()
              const label = DOW_LABELS[dow]
              const isFri = dow === 5
              const rowTotal = HOURS.reduce((s, h) => s + (cellMap[`${date}:${h}`] ?? 0), 0)
              const isToday  = date === new Date().toISOString().split('T')[0]

              return (
                <tr key={date} className={isFri ? 'opacity-70' : ''}>
                  <td className={`py-0.5 pr-2 text-right text-[10px] font-semibold ${isToday ? 'text-indigo-600' : 'text-slate-500'}`}>
                    {label}
                    {isToday && <span className="ml-1 text-[8px] text-indigo-400">today</span>}
                  </td>
                  {HOURS.map((h) => {
                    const count = cellMap[`${date}:${h}`] ?? 0
                    const bg    = heatColor(count, maxCount)
                    return (
                      <td key={h} className="px-px py-0.5">
                        <div
                          title={`${label} ${String(h).padStart(2,'0')}:00 — ${count} ${count === 1 ? 'entry' : 'entries'}`}
                          className="flex h-6 w-full items-center justify-center rounded-sm text-[9px] font-bold"
                          style={{ backgroundColor: bg, color: count > 0 ? '#1e293b' : 'transparent' }}
                        >
                          {count > 0 ? count : ''}
                        </div>
                      </td>
                    )
                  })}
                  <td className="pl-2 py-0.5 text-right">
                    <span className={`text-[10px] font-bold tabular-nums ${rowTotal > 0 ? 'text-slate-700' : 'text-slate-300'}`}>
                      {rowTotal}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-100">
              <td className="py-1 pr-2 text-right text-[9px] text-slate-400">Total</td>
              {HOURS.map((h) => {
                const colTotal = dateSet.reduce((s, d) => s + (cellMap[`${d}:${h}`] ?? 0), 0)
                return (
                  <td key={h} className="px-px py-1 text-center">
                    <span className={`text-[9px] font-bold tabular-nums ${colTotal > 0 ? 'text-slate-600' : 'text-slate-200'}`}>
                      {colTotal || ''}
                    </span>
                  </td>
                )
              })}
              <td />
            </tr>
          </tfoot>
        </table>

        {/* Legend */}
        <div className="mt-4 flex items-center gap-3">
          <span className="text-[10px] text-slate-400">Low</span>
          {['#f8fafc','#fef3c7','#fcd34d','#f59e0b','#b45309','#ef4444'].map((bg) => (
            <span key={bg} className="h-3 w-5 rounded-sm" style={{ backgroundColor: bg }} />
          ))}
          <span className="text-[10px] text-slate-400">Peak</span>
        </div>
      </div>
    </div>
  )
}
