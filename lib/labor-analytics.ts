// Day-of-week historical average + trend-factor labor projection.
// Groups site_access_logs GRANTED entries by weekday,
// averages the last 4 occurrences per weekday, then blends with
// a 7-day trend factor to capture genuine project ramp-up/down.

import { createClient } from '@/lib/supabase'
import { getOrgId } from '@/lib/org'

export type DailyCount = {
  date:    string // YYYY-MM-DD
  count:   number
  dow:     number // 0=Sun … 6=Sat
  isActual: boolean
}

export type LaborProjection = {
  history:    DailyCount[]    // last 28 actual days
  projection: DailyCount[]    // next 7 projected days
  trendFactor: number         // >1 = ramping up, <1 = winding down
  dataQuality: 'good' | 'limited' | 'insufficient'
  // Per-DOW averages used in projection
  dowAverages: number[]
}

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export { DOW_LABELS }

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

export async function computeLaborProjection(): Promise<LaborProjection> {
  const supabase = await createClient()
  const orgId = await getOrgId()

  const emptyResult: LaborProjection = {
    history: [], projection: [], trendFactor: 1,
    dataQuality: 'insufficient', dowAverages: Array(7).fill(0) as number[],
  }
  if (!orgId) return emptyResult

  const today    = new Date().toISOString().split('T')[0]
  const from28   = addDays(today, -27)

  // Raw gate data — only GRANTED entries, last 28 days
  const { data: logs } = await supabase
    .from('site_access_logs')
    .select('subcontractor_id, created_at')
    .eq('result', 'GRANTED')
    .eq('organization_id', orgId)
    .gte('created_at', from28 + 'T00:00:00.000Z')
    .lte('created_at', today   + 'T23:59:59.999Z')
    .order('created_at', { ascending: true })

  // Count GRANTED entries per calendar day
  const countByDay: Record<string, number> = {}
  for (let i = 0; i < 28; i++) {
    countByDay[addDays(today, i - 27)] = 0
  }
  for (const log of logs ?? []) {
    const day = log.created_at.split('T')[0]
    if (day in countByDay) countByDay[day] = (countByDay[day] ?? 0) + 1
  }

  // Build history array
  const history: DailyCount[] = Object.entries(countByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({
      date,
      count,
      dow:      new Date(date + 'T00:00:00').getDay(),
      isActual: true,
    }))

  // Compute per-DOW averages from last 4 occurrences of each weekday
  const dowAverages = Array(7).fill(0) as number[]
  const dowSamples  = Array.from({ length: 7 }, () => [] as number[])

  // Walk history newest-first, collect up to 4 samples per DOW
  for (let i = history.length - 1; i >= 0; i--) {
    const { dow, count } = history[i]
    if (dowSamples[dow].length < 4) {
      dowSamples[dow].push(count)
    }
  }

  for (let d = 0; d < 7; d++) {
    const samples = dowSamples[d]
    dowAverages[d] = samples.length > 0
      ? samples.reduce((s, v) => s + v, 0) / samples.length
      : 0
  }

  // Trend factor: mean of last 7 days vs prior 7 days
  const last7  = history.slice(-7).map((d) => d.count)
  const prior7 = history.slice(-14, -7).map((d) => d.count)
  const mean7  = last7.length  > 0 ? last7.reduce((s, v)  => s + v, 0) / last7.length  : 0
  const mean14 = prior7.length > 0 ? prior7.reduce((s, v) => s + v, 0) / prior7.length : 1
  const trendFactor = mean14 > 0 ? Math.min(2.5, Math.max(0.3, mean7 / mean14)) : 1

  // Project next 7 days
  const projection: DailyCount[] = []
  for (let i = 1; i <= 7; i++) {
    const date = addDays(today, i)
    const dow  = new Date(date + 'T00:00:00').getDay()
    // Blend: 60% DOW average, 40% trend-adjusted DOW average
    const dowAvg      = dowAverages[dow]
    const trendAdj    = dowAvg * trendFactor
    const blended     = dowAvg * 0.6 + trendAdj * 0.4
    projection.push({
      date,
      count:    Math.max(0, Math.round(blended)),
      dow,
      isActual: false,
    })
  }

  // Data quality rating
  const totalSamples = dowSamples.reduce((s, arr) => s + arr.length, 0)
  const dataQuality: LaborProjection['dataQuality'] =
    totalSamples >= 14 ? 'good' :
    totalSamples >= 5  ? 'limited' :
                          'insufficient'

  return { history, projection, trendFactor, dataQuality, dowAverages }
}

// Attendance heatmap: last 7 days × working hours (06:00–20:00)
export type HeatmapCell = {
  date:  string
  hour:  number
  count: number
  dow:   number
}

export async function computeAttendanceHeatmap(): Promise<HeatmapCell[]> {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return []

  const today = new Date().toISOString().split('T')[0]
  const from7 = addDays(today, -6)

  const { data: logs } = await supabase
    .from('site_access_logs')
    .select('created_at')
    .eq('result', 'GRANTED')
    .eq('organization_id', orgId)
    .gte('created_at', from7 + 'T00:00:00.000Z')
    .lte('created_at', today + 'T23:59:59.999Z')

  // Count per date+hour
  const countMap: Record<string, number> = {}
  for (const log of logs ?? []) {
    const dt   = new Date(log.created_at)
    const date = log.created_at.split('T')[0]
    const hour = dt.getUTCHours() // Use UTC; adjust for Morocco (+1 or +0 depending on DST)
    // Morocco is UTC+1 (UTC+0 in winter) — approximate by adding 1
    const localHour = (hour + 1) % 24
    const key = `${date}:${localHour}`
    countMap[key] = (countMap[key] ?? 0) + 1
  }

  const cells: HeatmapCell[] = []
  for (let i = 0; i < 7; i++) {
    const date = addDays(today, i - 6)
    const dow  = new Date(date + 'T00:00:00').getDay()
    for (let h = 6; h <= 19; h++) {
      cells.push({
        date,
        hour:  h,
        count: countMap[`${date}:${h}`] ?? 0,
        dow,
      })
    }
  }

  return cells
}
