import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient, createServiceSupabaseClient } from '@/lib/supabase'
import { callGeminiWithTimeout } from '@/lib/utils'

export const runtime = 'nodejs'

type RequestBody = {
  photoDataUrl: string
}

type GeminiQualityResponse = {
  face_visible: boolean
  lighting_sufficient: boolean
  feedback: string
}

function extractBase64(dataUrl: string): { base64: string; mimeType: string } {
  const [header, data] = dataUrl.split(',')
  const mimeType = header.replace('data:', '').replace(';base64', '')
  return { base64: data, mimeType }
}

function extractJson(raw: string): GeminiQualityResponse {
  const cleaned = raw
    .replace(/^```json\s*/m, '')
    .replace(/^```\s*/m, '')
    .replace(/\n?```\s*$/m, '')
    .trim()
  return JSON.parse(cleaned) as GeminiQualityResponse
}

async function validatePhotoQuality(base64: string, mimeType: string): Promise<GeminiQualityResponse> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) throw new Error('GOOGLE_GENERATIVE_AI_API_KEY not set')

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel(
    { model: 'gemini-2.5-flash', generationConfig: { responseMimeType: 'application/json' } },
    { apiVersion: 'v1beta' },
  )

  const result = await callGeminiWithTimeout(() =>
    model.generateContent([
      { inlineData: { mimeType, data: base64 } },
      `You are validating a worker identity photo for a construction site access pass.

Assess the photo for:
1. Is a human face clearly and fully visible? (not obscured, not a cartoon, not an object)
2. Is the lighting sufficient to see facial features clearly? (not too dark, not severely overexposed)

Return ONLY a valid JSON object:
{
  "face_visible": true or false,
  "lighting_sufficient": true or false,
  "feedback": "A short, friendly message explaining any issues. Empty string if the photo is good."
}`,
    ])
  )

  return extractJson(result.response.text())
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
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const service = createServiceSupabaseClient()

  // Verify this user has at least one claimed subcontractor record
  const { data: subs } = await service
    .from('subcontractors')
    .select('id, organization_id')
    .eq('user_id', user.id)

  if (!subs || subs.length === 0) {
    return Response.json({ error: 'No subcontractor record found' }, { status: 403 })
  }

  // Gemini quality check
  const { base64, mimeType } = extractBase64(body.photoDataUrl)
  let quality: GeminiQualityResponse
  try {
    quality = await validatePhotoQuality(base64, mimeType)
  } catch {
    return Response.json({ error: 'AI validation unavailable — please try again.' }, { status: 502 })
  }

  if (!quality.face_visible || !quality.lighting_sufficient) {
    const feedback = quality.feedback || (
      !quality.face_visible
        ? "We couldn't detect a face. Make sure you're facing the camera directly with nothing blocking your face."
        : "The lighting is too dim. Move to a brighter area and try again."
    )
    return Response.json({ ok: false, feedback })
  }

  // Upload photo — scoped by auth user ID so the path is stable and unique per person
  const orgId = subs[0].organization_id ?? 'unknown'
  const storagePath = `${orgId}/${user.id}.jpg`
  const buffer = Buffer.from(base64, 'base64')

  const { error: uploadError } = await service.storage
    .from('profile-photos')
    .upload(storagePath, buffer, { contentType: 'image/jpeg', upsert: true })

  if (uploadError) {
    return Response.json({ error: `Upload failed: ${uploadError.message}` }, { status: 502 })
  }

  // Store the storage path (not a public URL) — the bucket is private.
  // Display components generate short-lived signed URLs on the fly.
  const subIds = subs.map((s) => s.id)
  await service
    .from('subcontractors')
    .update({ profile_photo_url: storagePath })
    .in('id', subIds)

  return Response.json({ ok: true })
}
