import { GoogleGenerativeAI } from '@google/generative-ai'
import { createServiceSupabaseClient } from '@/lib/supabase'
import { sendImpersonationAlert } from '@/lib/push-notification'
import type { FaceMatchResult } from '@/types/database.types'

export const runtime = 'nodejs'

const IMPERSONATION_THRESHOLD = 80

type RequestBody = {
  logId:           string
  subcontractorId: string
  photoDataUrl:    string // data:image/jpeg;base64,...
}

type GeminiFaceResponse = {
  is_same_person: boolean
  confidence:     number
  reasoning:      string
}

function extractBase64(dataUrl: string): { base64: string; mimeType: string } {
  // data:<mimeType>;base64,<data>
  const [header, data] = dataUrl.split(',')
  const mimeType = header.replace('data:', '').replace(';base64', '')
  return { base64: data, mimeType }
}

function extractJson(raw: string): GeminiFaceResponse {
  const cleaned = raw
    .replace(/^```json\s*/m, '')
    .replace(/^```\s*/m, '')
    .replace(/\n?```\s*$/m, '')
    .trim()
  return JSON.parse(cleaned) as GeminiFaceResponse
}

async function runFaceMatch(
  profileBase64:  string,
  profileMime:    string,
  entryBase64:    string,
): Promise<GeminiFaceResponse> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not set')

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: { responseMimeType: 'application/json' },
  })

  const prompt = `You are a security identity verification system for construction site access control.

You will be shown two photos:
- Image 1 (PROFILE): The registered worker's photo on file
- Image 2 (LIVE): A photo just taken at the site gate

Task: Determine if both photos show the SAME person.

Return ONLY a valid JSON object, no other text:
{
  "is_same_person": true or false,
  "confidence": <integer 0-100>,
  "reasoning": "<one short sentence>"
}

Guidelines:
- confidence 80-100: High certainty the same person
- confidence 50-79: Uncertain, possible match
- confidence 0-49: Likely a different person
- Poor lighting, dust, or obscured face: confidence below 50
- Be conservative — it is better to flag a mismatch than to miss one`

  const result = await model.generateContent([
    { inlineData: { mimeType: profileMime, data: profileBase64 } },
    { inlineData: { mimeType: 'image/jpeg',  data: entryBase64  } },
    prompt,
  ])

  return extractJson(result.response.text())
}

export async function POST(request: Request) {
  let body: RequestBody
  try {
    body = await request.json() as RequestBody
    if (!body.logId || !body.subcontractorId || !body.photoDataUrl) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const service = createServiceSupabaseClient()

  // ── Validate the log entry exists and photo not already uploaded ──────────
  const { data: logRow } = await service
    .from('site_access_logs')
    .select('id, subcontractor_id, organization_id, photo_url')
    .eq('id', body.logId)
    .single()

  if (!logRow) {
    return Response.json({ error: 'Log entry not found' }, { status: 404 })
  }
  if (logRow.subcontractor_id !== body.subcontractorId) {
    return Response.json({ error: 'Subcontractor mismatch' }, { status: 403 })
  }
  if (logRow.photo_url) {
    // Idempotent — return existing result without re-processing
    const { data: existing } = await service
      .from('site_access_logs')
      .select('face_match_result, face_match_score')
      .eq('id', body.logId)
      .single()
    return Response.json({
      ok: true,
      result: existing?.face_match_result ?? 'error',
      score:  existing?.face_match_score  ?? null,
    })
  }

  // ── Upload entry photo to storage ─────────────────────────────────────────
  const { base64: entryBase64 } = extractBase64(body.photoDataUrl)
  const entryBuffer = Buffer.from(entryBase64, 'base64')
  const storagePath = `${logRow.organization_id ?? 'unknown'}/${body.logId}.jpg`

  const { error: uploadError } = await service.storage
    .from('site-entry-photos')
    .upload(storagePath, entryBuffer, { contentType: 'image/jpeg', upsert: false })

  if (uploadError) {
    return Response.json({ error: `Storage upload failed: ${uploadError.message}` }, { status: 502 })
  }

  const { data: publicUrlData } = service.storage
    .from('site-entry-photos')
    .getPublicUrl(storagePath)

  const photoUrl = publicUrlData.publicUrl

  // ── Fetch profile photo ───────────────────────────────────────────────────
  const { data: sub } = await service
    .from('subcontractors')
    .select('company_name, organization_id, profile_photo_url')
    .eq('id', body.subcontractorId)
    .single()

  // ── Determine face match result ───────────────────────────────────────────
  let faceMatchResult: FaceMatchResult = 'no_profile_photo'
  let faceMatchScore: number | null = null

  if (sub?.profile_photo_url) {
    try {
      // Fetch profile photo bytes
      const profileRes = await fetch(sub.profile_photo_url)
      if (!profileRes.ok) throw new Error('Profile photo fetch failed')

      const profileBuffer = Buffer.from(await profileRes.arrayBuffer())
      const profileBase64 = profileBuffer.toString('base64')
      const contentType   = profileRes.headers.get('content-type') ?? 'image/jpeg'

      const geminiResult = await runFaceMatch(profileBase64, contentType, entryBase64)
      faceMatchScore  = geminiResult.confidence
      faceMatchResult = geminiResult.confidence >= IMPERSONATION_THRESHOLD
        ? 'match'
        : 'suspected_impersonation'
    } catch {
      faceMatchResult = 'error'
    }
  }

  // ── Update audit log row ──────────────────────────────────────────────────
  await service
    .from('site_access_logs')
    .update({ photo_url: photoUrl, face_match_score: faceMatchScore, face_match_result: faceMatchResult })
    .eq('id', body.logId)

  // ── Fire impersonation alert ──────────────────────────────────────────────
  if (faceMatchResult === 'suspected_impersonation' && logRow.organization_id && sub) {
    sendImpersonationAlert(
      logRow.organization_id,
      sub.company_name,
      faceMatchScore ?? 0,
    ).catch(() => {})
  }

  return Response.json({ ok: true, result: faceMatchResult, score: faceMatchScore })
}
