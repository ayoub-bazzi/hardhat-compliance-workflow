// Open-Meteo integration — no API key required, free tier.
// Default coordinates: Casablanca, Morocco (33.5731°N, 7.5898°W)

export const DEFAULT_COORDS = { lat: 33.5731, lon: -7.5898, city: 'Casablanca' }

// WMO Weather Interpretation Codes → human label
const WMO_LABELS: Record<number, string> = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Foggy', 48: 'Icy fog',
  51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
  61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
  71: 'Light snow', 73: 'Snow', 75: 'Heavy snow',
  80: 'Rain showers', 81: 'Heavy showers', 82: 'Violent showers',
  95: 'Thunderstorm', 96: 'Thunderstorm + hail', 99: 'Severe thunderstorm',
}

export type RiskLevel = 'clear' | 'elevated' | 'high' | 'extreme'

export type WeatherAlert = {
  risk:    RiskLevel
  trigger: string
  advice:  string
}

export type HourlySlice = {
  time:        string    // ISO hour string
  wind_kmh:    number
  precip_prob: number
  weathercode: number
  label:       string
}

export type WeatherReport = {
  fetchedAt:   string
  city:        string
  current:     HourlySlice
  next24h:     HourlySlice[]
  alerts:      WeatherAlert[]
  maxWindKmh:  number
  maxPrecipPct: number
}

function wmoLabel(code: number): string {
  return WMO_LABELS[code] ?? `Code ${code}`
}

function assessRisk(wind: number, precipPct: number, code: number): WeatherAlert[] {
  const alerts: WeatherAlert[] = []

  if (code >= 95) {
    alerts.push({
      risk:    'extreme',
      trigger: `Thunderstorm forecast (WMO ${code})`,
      advice:  'Suspend ALL outdoor operations. Evacuate elevated positions and scaffolding immediately.',
    })
  } else if (wind > 40) {
    alerts.push({
      risk:    'high',
      trigger: `Wind speed ${wind.toFixed(0)} km/h`,
      advice:  'Suspend crane operations and work at height. Secure all loose materials on site.',
    })
  } else if (wind > 25) {
    alerts.push({
      risk:    'elevated',
      trigger: `Wind speed ${wind.toFixed(0)} km/h`,
      advice:  'Exercise caution with crane lifts and overhead work. Monitor wind direction.',
    })
  }

  if (precipPct >= 70 && code >= 61) {
    alerts.push({
      risk:    'high',
      trigger: `${precipPct}% chance of rain (WMO ${code})`,
      advice:  'Delay fresh concrete pours and outdoor finishing work. Cover open excavations.',
    })
  } else if (precipPct >= 50 && code >= 51) {
    alerts.push({
      risk:    'elevated',
      trigger: `${precipPct}% chance of precipitation`,
      advice:  'Prepare weather covers for concrete work. Inspect site drainage.',
    })
  }

  return alerts
}

type OpenMeteoResponse = {
  hourly: {
    time:                  string[]
    wind_speed_10m:        number[]
    precipitation_probability: number[]
    weathercode:           number[]
  }
}

// Simple in-process cache — avoids hammering the free API on every SSR render.
let _cache: { report: WeatherReport; expiresAt: number } | null = null
const CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes

export async function fetchWeatherReport(
  lat = DEFAULT_COORDS.lat,
  lon = DEFAULT_COORDS.lon,
  city = DEFAULT_COORDS.city,
): Promise<WeatherReport | null> {
  if (_cache && Date.now() < _cache.expiresAt) return _cache.report

  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast')
    url.searchParams.set('latitude',  String(lat))
    url.searchParams.set('longitude', String(lon))
    url.searchParams.set('hourly',    'wind_speed_10m,precipitation_probability,weathercode')
    url.searchParams.set('wind_speed_unit', 'kmh')
    url.searchParams.set('forecast_days',   '2')
    url.searchParams.set('timezone',        'Africa/Casablanca')

    const res  = await fetch(url.toString(), { next: { revalidate: 1800 } })
    if (!res.ok) return null
    const data = await res.json() as OpenMeteoResponse

    const { time, wind_speed_10m, precipitation_probability, weathercode } = data.hourly

    const nowIso  = new Date().toISOString()
    const nowHour = nowIso.slice(0, 13) // "2024-05-06T14"

    // Find the index closest to current hour
    const idx = time.findIndex((t) => t.slice(0, 13) >= nowHour)
    const start = idx < 0 ? 0 : idx

    const slices: HourlySlice[] = time.slice(start, start + 24).map((t, i) => ({
      time:        t,
      wind_kmh:    wind_speed_10m[start + i] ?? 0,
      precip_prob: precipitation_probability[start + i] ?? 0,
      weathercode: weathercode[start + i] ?? 0,
      label:       wmoLabel(weathercode[start + i] ?? 0),
    }))

    const current    = slices[0] ?? { time: nowIso, wind_kmh: 0, precip_prob: 0, weathercode: 0, label: 'Unknown' }
    const next24h    = slices
    const maxWindKmh = Math.max(...slices.map((s) => s.wind_kmh))
    const maxPrecipPct = Math.max(...slices.map((s) => s.precip_prob))

    // Assess alerts for the worst conditions in the next 24h
    const worstWind  = slices.reduce((b, s) => s.wind_kmh > b.wind_kmh ? s : b, current)
    const alerts     = assessRisk(worstWind.wind_kmh, maxPrecipPct, worstWind.weathercode)

    const report: WeatherReport = {
      fetchedAt: nowIso,
      city,
      current,
      next24h,
      alerts,
      maxWindKmh,
      maxPrecipPct,
    }

    _cache = { report, expiresAt: Date.now() + CACHE_TTL_MS }
    return report
  } catch {
    return null
  }
}

export function topAlert(alerts: WeatherAlert[]): WeatherAlert | null {
  const order: RiskLevel[] = ['extreme', 'high', 'elevated', 'clear']
  return alerts.sort((a, b) => order.indexOf(a.risk) - order.indexOf(b.risk))[0] ?? null
}
