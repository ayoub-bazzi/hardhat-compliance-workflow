import { Wind, CloudRain, Zap, ShieldCheck, Thermometer } from 'lucide-react'
import { fetchWeatherReport, type RiskLevel } from '@/lib/weather'

const RISK_CONFIG: Record<RiskLevel, {
  bar:    string
  icon:   typeof Wind
  badge:  string
  title:  string
}> = {
  extreme:  { bar: 'bg-red-900',     icon: Zap,        badge: 'bg-red-900 text-red-200 ring-red-700',          title: 'Extreme Risk' },
  high:     { bar: 'bg-red-500',     icon: Wind,        badge: 'bg-red-100 text-red-700 ring-red-300',          title: 'High Risk'    },
  elevated: { bar: 'bg-amber-400',   icon: CloudRain,   badge: 'bg-amber-100 text-amber-700 ring-amber-300',    title: 'Elevated Risk' },
  clear:    { bar: 'bg-emerald-500', icon: ShieldCheck, badge: 'bg-emerald-100 text-emerald-700 ring-emerald-300', title: 'Clear'     },
}

function windBar(kmh: number): string {
  if (kmh > 40) return 'bg-red-500'
  if (kmh > 25) return 'bg-amber-400'
  return 'bg-emerald-500'
}

export async function WeatherWatchdog() {
  const report = await fetchWeatherReport()

  if (!report) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
        <p className="text-sm text-slate-400">Weather data unavailable — check connection.</p>
      </div>
    )
  }

  const { current, next24h, alerts, maxWindKmh, maxPrecipPct, city } = report
  const topAlert = alerts[0] ?? null
  const riskLevel: RiskLevel = topAlert?.risk ?? 'clear'
  const cfg = RISK_CONFIG[riskLevel]
  const AlertIcon = cfg.icon

  // Next 8 hourly slices for the mini forecast strip
  const strip = next24h.slice(0, 8)

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className={`h-1.5 w-full ${cfg.bar}`} />
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <Thermometer className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-700">
            Weather Watchdog — {city}
          </h2>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${cfg.badge}`}>
          <AlertIcon className="h-3 w-3" />
          {cfg.title}
        </span>
      </div>

      <div className="p-5 space-y-4">
        {/* Alert banners */}
        {alerts.map((alert, i) => {
          const ac = RISK_CONFIG[alert.risk]
          const AI = ac.icon
          return (
            <div key={i} className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${
              alert.risk === 'extreme' ? 'border-red-900 bg-red-950 text-red-200' :
              alert.risk === 'high'    ? 'border-red-200 bg-red-50' :
                                         'border-amber-200 bg-amber-50'
            }`}>
              <AI className={`mt-0.5 h-4 w-4 shrink-0 ${
                alert.risk === 'extreme' ? 'text-red-300' :
                alert.risk === 'high'    ? 'text-red-600' : 'text-amber-600'
              }`} />
              <div>
                <p className={`text-sm font-semibold ${
                  alert.risk === 'extreme' ? 'text-red-200' :
                  alert.risk === 'high'    ? 'text-red-800' : 'text-amber-900'
                }`}>
                  {alert.trigger}
                </p>
                <p className={`mt-0.5 text-xs ${
                  alert.risk === 'extreme' ? 'text-red-300' :
                  alert.risk === 'high'    ? 'text-red-700' : 'text-amber-800'
                }`}>
                  {alert.advice}
                </p>
              </div>
            </div>
          )
        })}

        {alerts.length === 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
            <p className="text-sm text-emerald-800">No weather alerts for the next 24 hours. Safe to proceed with all operations.</p>
          </div>
        )}

        {/* Current conditions row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Condition</p>
            <p className="text-xs font-semibold text-slate-700">{current.label}</p>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Wind (24h max)</p>
            <p className={`text-lg font-black tabular-nums ${maxWindKmh > 40 ? 'text-red-600' : maxWindKmh > 25 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {maxWindKmh.toFixed(0)}
            </p>
            <p className="text-[10px] text-slate-400">km/h</p>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Rain chance</p>
            <p className={`text-lg font-black tabular-nums ${maxPrecipPct >= 70 ? 'text-red-600' : maxPrecipPct >= 40 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {maxPrecipPct.toFixed(0)}%
            </p>
          </div>
        </div>

        {/* 8-hour forecast strip */}
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Next 8 Hours</p>
          <div className="grid grid-cols-8 gap-1">
            {strip.map((s, i) => {
              const hour = new Date(s.time).getHours()
              return (
                <div key={i} className="flex flex-col items-center gap-1">
                  <p className="text-[9px] text-slate-400">{String(hour).padStart(2, '0')}h</p>
                  <div className="h-8 w-full rounded-sm bg-slate-100 flex items-end overflow-hidden">
                    <div
                      className={`w-full rounded-sm ${windBar(s.wind_kmh)}`}
                      style={{ height: `${Math.min(100, (s.wind_kmh / 60) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[8px] text-slate-500">{s.wind_kmh.toFixed(0)}</p>
                </div>
              )
            })}
          </div>
          <p className="mt-1 text-[9px] text-slate-400 text-center">Wind speed (km/h) — thresholds: 25 amber, 40 red</p>
        </div>

        <p className="text-[10px] text-slate-400">
          Source: Open-Meteo (open-meteo.com) · {city} · Refreshes every 30 min
        </p>
      </div>
    </div>
  )
}
