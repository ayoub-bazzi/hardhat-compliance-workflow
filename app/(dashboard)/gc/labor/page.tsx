import { Suspense } from 'react'
import { TrendingUp, Wind } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { LaborChart } from '@/components/labor-chart'
import { AttendanceHeatmapChart } from '@/components/attendance-heatmap-chart'
import { WeatherWatchdog } from '@/components/weather-watchdog'

function CardSkeleton({ h = 'h-64' }: { h?: string }) {
  return <Skeleton className={`${h} w-full rounded-xl`} />
}

export default function LaborPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
          <TrendingUp className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Predictive Labor &amp; Weather
          </h1>
          <p className="text-sm text-slate-500">
            Day-of-week forecasting · Site density heatmap · Live weather safety alerts
          </p>
        </div>
      </div>

      {/* Weather watchdog — full width, highest priority */}
      <Suspense fallback={<CardSkeleton h="h-52" />}>
        <WeatherWatchdog />
      </Suspense>

      {/* Labor projection chart */}
      <Suspense fallback={<CardSkeleton h="h-72" />}>
        <LaborChart />
      </Suspense>

      {/* Density heatmap */}
      <Suspense fallback={<CardSkeleton h="h-56" />}>
        <AttendanceHeatmapChart />
      </Suspense>

      {/* Methodology note */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-5 py-4">
        <div className="flex items-start gap-3">
          <Wind className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <div className="text-xs text-slate-500 space-y-1">
            <p className="font-semibold text-slate-700">Projection methodology</p>
            <p>
              Forecasts use a day-of-week historical average (last 4 occurrences per weekday)
              blended with a 7-day trend factor. Friday attendance is tracked separately
              to account for Jumu&apos;ah prayer schedules. Projections are recalculated
              on each page load from live gate data.
            </p>
            <p>
              Weather data: Open-Meteo (open-meteo.com) · Free, no API key · Casablanca, Morocco ·
              Safety thresholds: wind &gt;25 km/h elevated, &gt;40 km/h high-risk crane suspension.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
