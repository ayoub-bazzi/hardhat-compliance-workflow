import { computeLaborProjection, DOW_LABELS, type DailyCount } from '@/lib/labor-analytics'

const W = 680
const H = 220
const PAD = { top: 16, right: 16, bottom: 44, left: 32 }
const CW  = W - PAD.left - PAD.right
const CH  = H - PAD.top  - PAD.bottom

function toX(i: number, total: number): number {
  return PAD.left + (i / (total - 1)) * CW
}

function toY(v: number, maxV: number): number {
  if (maxV === 0) return PAD.top + CH
  return PAD.top + CH - (v / maxV) * CH
}

function polyline(points: [number, number][]): string {
  return points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
}

const TREND_LABEL: Record<string, string> = {
  good:         'Good data (28 days)',
  limited:      'Limited data — projection approximate',
  insufficient: 'Insufficient data — projection is illustrative only',
}

export async function LaborChart() {
  const { history, projection, trendFactor, dataQuality, dowAverages } = await computeLaborProjection()

  const todayStr = new Date().toISOString().split('T')[0]

  // Last 14 actual days + 7 projected = 21 points total
  const actual   = history.slice(-14)
  const all: (DailyCount & { projected?: true })[] = [
    ...actual,
    ...projection.map((d) => ({ ...d, projected: true as true })),
  ]

  const maxV = Math.max(...all.map((d) => d.count), 1)

  // Today separator x position
  const todayIdx = all.findIndex((d) => d.date === todayStr)
  const todaySepX = todayIdx >= 0 ? toX(todayIdx, all.length) : null

  // Build actual line (solid) and projected line (dashed)
  const actualPts  = actual.map((d, i)  => [toX(i, all.length), toY(d.count, maxV)] as [number, number])
  const projStart  = actual.length - 1
  const projPts    = [actual[actual.length - 1], ...projection].map((d, i) =>
    [toX(projStart + i, all.length), toY(d.count, maxV)] as [number, number])

  // Y-axis grid lines
  const gridVals = [0, Math.round(maxV * 0.25), Math.round(maxV * 0.5), Math.round(maxV * 0.75), maxV]

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3.5">
        <div>
          <h2 className="text-sm font-semibold text-slate-700">Labor Projection — Actual vs Forecast</h2>
          <p className="mt-0.5 text-xs text-slate-400">{TREND_LABEL[dataQuality]}</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-6 bg-indigo-500 inline-block" /> Actual
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-6 border-t-2 border-dashed border-amber-400 inline-block" /> Projected
          </span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${
            trendFactor >= 1.1 ? 'bg-emerald-100 text-emerald-700 ring-emerald-200' :
            trendFactor <= 0.9 ? 'bg-red-100 text-red-700 ring-red-200' :
                                  'bg-slate-100 text-slate-600 ring-slate-200'
          }`}>
            Trend {trendFactor >= 1 ? '+' : ''}{((trendFactor - 1) * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      <div className="p-5">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Labor projection chart">
          {/* Grid lines + Y labels */}
          {gridVals.map((v, i) => {
            const y = toY(v, maxV)
            return (
              <g key={`grid-line-${v}-${i}`}>
                <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#e2e8f0" strokeWidth="1" />
                <text x={PAD.left - 4} y={y + 3.5} textAnchor="end" fontSize="9" fill="#94a3b8">{v}</text>
              </g>
            )
          })}

          {/* Today separator */}
          {todaySepX !== null && (
            <line
              x1={todaySepX} y1={PAD.top}
              x2={todaySepX} y2={PAD.top + CH}
              stroke="#6366f1" strokeWidth="1.5" strokeDasharray="4,3"
            />
          )}

          {/* Actual area fill */}
          {actualPts.length > 1 && (
            <polygon
              points={[
                ...actualPts,
                [actualPts[actualPts.length - 1][0], PAD.top + CH],
                [actualPts[0][0], PAD.top + CH],
              ].map(([x, y]) => `${x},${y}`).join(' ')}
              fill="#6366f1"
              fillOpacity="0.08"
            />
          )}

          {/* Projected area fill */}
          {projPts.length > 1 && (
            <polygon
              points={[
                ...projPts,
                [projPts[projPts.length - 1][0], PAD.top + CH],
                [projPts[0][0], PAD.top + CH],
              ].map(([x, y]) => `${x},${y}`).join(' ')}
              fill="#f59e0b"
              fillOpacity="0.07"
            />
          )}

          {/* Actual line */}
          {actualPts.length > 1 && (
            <polyline
              points={polyline(actualPts)}
              fill="none"
              stroke="#6366f1"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Projected dashed line */}
          {projPts.length > 1 && (
            <polyline
              points={polyline(projPts)}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="6,4"
            />
          )}

          {/* Data points */}
          {all.map((d, i) => {
            const x = toX(i, all.length)
            const y = toY(d.count, maxV)
            return (
              <circle
                key={`point-${d.date}-${i}`}
                cx={x} cy={y} r={d.projected ? 3 : 3.5}
                fill={d.projected ? '#f59e0b' : '#6366f1'}
                stroke="white"
                strokeWidth="1.5"
              />
            )
          })}

          {/* X-axis labels — show every 3rd label to avoid crowding */}
          {all.map((d, i) => {
            if (i % 3 !== 0 && i !== all.length - 1) return null
            const x = toX(i, all.length)
            const isToday = d.date === todayStr
            return (
              <text
                key={`label-${d.date}-${i}`}
                x={x} y={H - 4}
                textAnchor="middle"
                fontSize="9"
                fill={isToday ? '#6366f1' : d.projected ? '#f59e0b' : '#94a3b8'}
                fontWeight={isToday ? 'bold' : 'normal'}
              >
                {DOW_LABELS[d.dow]}
              </text>
            )
          })}

          {/* "Today" label */}
          {todaySepX !== null && (
            <text x={todaySepX} y={PAD.top - 4} textAnchor="middle" fontSize="8" fill="#6366f1" fontWeight="bold">
              Today
            </text>
          )}
        </svg>

        {/* DOW average summary */}
        <div className="mt-4 grid grid-cols-7 gap-1 border-t border-slate-100 pt-4">
          {DOW_LABELS.map((label, d) => (
            <div key={label} className="text-center">
              <p className="text-[9px] font-semibold uppercase text-slate-400">{label}</p>
              <p className={`text-sm font-bold tabular-nums ${
                d === 5 ? 'text-amber-600' : 'text-slate-700'
              }`}>
                {dowAverages[d].toFixed(1)}
              </p>
              {d === 5 && <p className="text-[8px] text-amber-500">Fri short</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
