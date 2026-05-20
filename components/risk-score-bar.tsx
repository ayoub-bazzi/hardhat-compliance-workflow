type Band = {
  label: string
  sublabel: string
  bar: string
  badgeBg: string
  badgeRing: string
  text: string
}

function getBand(score: number): Band {
  if (score >= 71) return {
    label:     'Critical Risk',
    sublabel:  'Hard-Stop Active',
    bar:       'bg-red-500',
    badgeBg:   'bg-red-950',
    badgeRing: 'ring-red-800',
    text:      'text-red-400',
  }
  if (score >= 31) return {
    label:     'Elevated Risk',
    sublabel:  'Review Required',
    bar:       'bg-amber-400',
    badgeBg:   'bg-amber-950',
    badgeRing: 'ring-amber-800',
    text:      'text-amber-400',
  }
  return {
    label:     'Low Risk',
    sublabel:  'Site Ready',
    bar:       'bg-emerald-500',
    badgeBg:   'bg-emerald-950',
    badgeRing: 'ring-emerald-800',
    text:      'text-emerald-400',
  }
}

// Compact inline bar — for table rows
export function RiskScoreBar({ score }: { score: number }) {
  const band = getBand(score)
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-1.5 w-20 overflow-hidden rounded-full bg-slate-700">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${band.bar}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`min-w-[2ch] tabular-nums text-xs font-bold ${band.text}`}>{score}</span>
    </div>
  )
}

// Pill badge — for table risk-level column (score-based)
export function RiskBadge({ score }: { score: number }) {
  const band = getBand(score)
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${band.badgeBg} ${band.badgeRing} ${band.text}`}
    >
      {band.label}
    </span>
  )
}

// Pill badge — for table risk-level column (document-status-based)
export function RiskLevelBadge({ level }: { level: 'critical' | 'elevated' | 'low' }) {
  const bands = {
    critical: { label: 'Critical Risk', badgeBg: 'bg-red-950',     badgeRing: 'ring-red-800',     text: 'text-red-400'     },
    elevated: { label: 'Elevated Risk', badgeBg: 'bg-amber-950',   badgeRing: 'ring-amber-800',   text: 'text-amber-400'   },
    low:      { label: 'Low Risk',      badgeBg: 'bg-emerald-950', badgeRing: 'ring-emerald-800', text: 'text-emerald-400' },
  }
  const band = bands[level]
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${band.badgeBg} ${band.badgeRing} ${band.text}`}
    >
      {band.label}
    </span>
  )
}

// Full-width labeled bar — for detail pages / cards
export function RiskDetailBar({ score }: { score: number }) {
  const band = getBand(score)
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold ${band.text}`}>
          {band.label} — {band.sublabel}
        </span>
        <span className={`text-sm font-black tabular-nums ${band.text}`}>{score}<span className="text-xs font-medium opacity-60">/100</span></span>
      </div>
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-700">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ${band.bar}`}
          style={{ width: `${score}%` }}
        />
        {/* Band threshold markers */}
        <div className="pointer-events-none absolute inset-y-0 left-[30%] w-px bg-white/20" />
        <div className="pointer-events-none absolute inset-y-0 left-[70%] w-px bg-white/20" />
      </div>
      <div className="flex justify-between px-0.5 text-[10px] font-medium text-slate-600">
        <span>0</span>
        <span className="text-emerald-700">30</span>
        <span className="text-amber-700">70</span>
        <span className="text-red-700">100</span>
      </div>
    </div>
  )
}
