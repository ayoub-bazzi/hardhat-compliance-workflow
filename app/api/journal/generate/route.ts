import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient, createServiceSupabaseClient } from '@/lib/supabase'
import { fetchWeatherReport } from '@/lib/weather'

export const runtime = 'nodejs'

type RequestBody = {
  photoDataUrl: string
  projectId?: string | null
}

type GeminiJournalResponse = {
  quality: 'high' | 'medium' | 'low'
  work_phase: string
  summary: string
  caveats: string[]
}

function extractBase64(dataUrl: string): { base64: string; mimeType: string } {
  const [header, data] = dataUrl.split(',')
  const mimeType = header.replace('data:', '').replace(';base64', '')
  return { base64: data, mimeType }
}

function safeParseJson(raw: string): GeminiJournalResponse {
  const cleaned = raw
    .replace(/^```json\s*/m, '')
    .replace(/^```\s*/m, '')
    .replace(/\n?```\s*$/m, '')
    .trim()
  return JSON.parse(cleaned) as GeminiJournalResponse
}

async function analyzeProgressPhoto(
  base64: string,
  mimeType: string,
  attendanceContext: { grantedToday: number; uniqueCompanies: number },
  weatherContext: { label: string; windKmh: number; precipPct: number; hasAlert: boolean },
): Promise<GeminiJournalResponse> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not set')

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: { responseMimeType: 'application/json' },
  })

  const { grantedToday, uniqueCompanies } = attendanceContext
  const { label: weatherLabel, windKmh, precipPct, hasAlert } = weatherContext

  const weatherLine = `Weather conditions: ${weatherLabel}, wind ${windKmh.toFixed(0)} km/h, ${precipPct.toFixed(0)}% precipitation probability${hasAlert ? ' — WEATHER SAFETY ALERT ACTIVE' : ''}.`

  const result = await model.generateContent([
    { inlineData: { mimeType, data: base64 } },
    `You are an AI construction site analyst generating a Daily Site Journal entry.

Attendance context for today: ${grantedToday} worker entries recorded from ${uniqueCompanies} subcontractor compan${uniqueCompanies === 1 ? 'y' : 'ies'} on site.
${weatherLine}

Analyse the construction progress photo and generate a structured journal entry.

CRITICAL RULES — follow these exactly:
- Only describe what is VISUALLY EVIDENT in the photo. Never infer cure status, structural integrity, or safety compliance from a single image.
- Use hedged language for anything uncertain: "appears to show", "what looks like", "visible in the foreground".
- Do NOT state facts you cannot see (e.g., "concrete is cured", "rebar meets code").
- Keep the summary to exactly 3 paragraphs: (1) observed work phase and visible activities, (2) site conditions and workforce presence based on attendance data, (3) next likely steps based on visible progress.

Return ONLY a valid JSON object matching this exact schema:
{
  "quality": "high" | "medium" | "low",
  "work_phase": "A concise label, e.g. Foundation Excavation, Rebar Installation, Slab Pour, Structural Framing, Facade Work, Interior Fitout, Final Finishes",
  "summary": "Three paragraphs separated by \\n\\n describing the site in detail",
  "caveats": ["Array of specific uncertainty notes, e.g. 'Concrete finish not visible due to equipment obstruction'. Empty array if none."]
}

Set quality to "low" if the photo is blurry, extremely dark, or shows no construction activity. Set to "medium" if partially obstructed or low lighting. Set to "high" if the site is clearly visible with good lighting.`,
  ])

  return safeParseJson(result.response.text())
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: RequestBody
  try {
    body = await request.json() as RequestBody
    if (!body.photoDataUrl) {
      return Response.json({ error: 'Missing photoDataUrl' }, { status: 400 })
    }
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // Fetch org
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) {
    return Response.json({ error: 'No organisation found' }, { status: 403 })
  }
  const orgId = profile.organization_id

  // Fetch today's attendance context (granted gate entries + unique companies)
  const todayStart = new Date().toISOString().split('T')[0] + 'T00:00:00.000Z'
  const service = createServiceSupabaseClient()

  const { data: todayLogs } = await service
    .from('site_access_logs')
    .select('subcontractor_id')
    .eq('organization_id', orgId)
    .eq('result', 'GRANTED')
    .gte('created_at', todayStart)

  const grantedToday    = (todayLogs ?? []).length
  const uniqueCompanies = new Set((todayLogs ?? []).map((l) => l.subcontractor_id)).size

  // Fetch weather (best-effort — journal proceeds even if weather unavailable)
  const weatherReport = await fetchWeatherReport()
  const weatherContext = {
    label:      weatherReport?.current.label     ?? 'Unknown',
    windKmh:    weatherReport?.maxWindKmh        ?? 0,
    precipPct:  weatherReport?.maxPrecipPct      ?? 0,
    hasAlert:   (weatherReport?.alerts.length ?? 0) > 0,
  }

  // Call Gemini
  const { base64, mimeType } = extractBase64(body.photoDataUrl)
  let gemini: GeminiJournalResponse
  try {
    gemini = await analyzeProgressPhoto(base64, mimeType, { grantedToday, uniqueCompanies }, weatherContext)
  } catch {
    return Response.json({ error: 'AI analysis unavailable — please try again.' }, { status: 502 })
  }

  // Upload photo to site-progress-photos bucket
  const journalId   = crypto.randomUUID()
  const storagePath = `${orgId}/${journalId}.jpg`
  const buffer      = Buffer.from(base64, 'base64')

  const { error: uploadError } = await service.storage
    .from('site-progress-photos')
    .upload(storagePath, buffer, { contentType: 'image/jpeg', upsert: false })

  let photoUrl: string | null = null
  if (!uploadError) {
    const { data: urlData } = service.storage
      .from('site-progress-photos')
      .getPublicUrl(storagePath)
    photoUrl = urlData.publicUrl
  }

  // Insert journal record
  const { data: journal, error: insertError } = await service
    .from('site_journals')
    .insert({
      id:                  journalId,
      organization_id:     orgId,
      project_id:          body.projectId ?? null,
      photo_url:           photoUrl,
      work_phase:          gemini.work_phase,
      photo_quality:       gemini.quality,
      ai_summary:          gemini.summary,
      caveats:             gemini.caveats ?? [],
      attendance_context:  { grantedToday, uniqueCompanies },
    })
    .select()
    .single()

  if (insertError) {
    return Response.json({ error: `Failed to save journal: ${insertError.message}` }, { status: 500 })
  }

  // Log journal creation to the Golden Thread
  await supabase.rpc('fn_log_audit_event', {
    p_subcontractor_id: null,
    p_organization_id:  orgId,
    p_event_type:       'Site Journal',
    p_description:      `Daily site journal created — phase: "${gemini.work_phase}", quality: ${gemini.quality}, ${grantedToday} workers on site.`,
    p_actor:            user.email ?? 'GC User',
    p_metadata:         {
      journal_id:        journalId,
      work_phase:        gemini.work_phase,
      quality:           gemini.quality,
      caveats_count:     (gemini.caveats ?? []).length,
      granted_today:     grantedToday,
      weather_alert:     weatherContext.hasAlert,
    },
  })

  return Response.json({ ok: true, journal })
}
