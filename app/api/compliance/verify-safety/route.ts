import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient, createServiceSupabaseClient } from '@/lib/supabase'
import type { SafetyApprovalStatus, SafetyRiskLevel } from '@/types/database.types'

export const runtime = 'nodejs'

// ── Gemini safety prompt ──────────────────────────────────────

const SAFETY_PROMPT = `You are a construction safety document analyst specialising in RAMS (Risk Assessment and Method Statements) and site safety compliance.
Analyse this document and extract safety compliance information.
Return ONLY a valid JSON object — no markdown, no explanation.

JSON schema:
{
  "has_risk_matrix": <boolean>,
  "has_emergency_procedures": <boolean>,
  "identified_hazards": ["<hazard>", ...],
  "risk_level": "<Low|Medium|High|Critical>",
  "high_risk_compliant": <boolean>,
  "rejection_reasons": ["<reason>", ...]
}

Rules:
- has_risk_matrix: true if a formal risk assessment matrix or table is present
- has_emergency_procedures: true if emergency response or rescue procedures are explicitly documented
- identified_hazards: list up to 8 specific hazards mentioned (e.g. "Working at height", "Electrical hazards", "Manual handling")
- risk_level: overall work risk classification based on activities described — Low/Medium/High/Critical
- high_risk_compliant: true only if has_risk_matrix=true AND has_emergency_procedures=true AND adequate hazard controls are documented for each identified hazard
- rejection_reasons: list specific compliance gaps; empty array if high_risk_compliant is true`

type SafetyExtracted = {
  has_risk_matrix: boolean
  has_emergency_procedures: boolean
  identified_hazards: string[]
  risk_level: SafetyRiskLevel
  high_risk_compliant: boolean
  rejection_reasons: string[]
}

function parseSafetyJson(raw: string): SafetyExtracted {
  const stripped = raw
    .replace(/^```json\s*/m, '').replace(/^```\s*/m, '').replace(/\n?```\s*$/m, '').trim()
  return JSON.parse(stripped)
}

async function runGeminiSafetyAnalysis(
  base64Data: string,
  mimeType: string,
): Promise<SafetyExtracted> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set')

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: { responseMimeType: 'application/json' },
  })

  const result = await model.generateContent([
    { inlineData: { mimeType, data: base64Data } },
    SAFETY_PROMPT,
  ])

  return parseSafetyJson(result.response.text())
}

// ── POST /api/compliance/verify-safety ───────────────────────

export async function POST(request: Request) {
  // ── Auth ──────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'gc' || !profile.organization_id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  // ── Parse body ────────────────────────────────────────────
  let safety_doc_id: string
  try {
    const body = await request.json() as { safety_doc_id?: string }
    if (!body.safety_doc_id) throw new Error('missing')
    safety_doc_id = body.safety_doc_id
  } catch {
    return Response.json({ error: 'safety_doc_id is required' }, { status: 400 })
  }

  // ── Fetch safety doc (must belong to this org) ────────────
  const serviceClient = createServiceSupabaseClient()

  const { data: doc } = await serviceClient
    .from('safety_documents')
    .select('id, file_path, doc_type, organization_id, subcontractor_id, approval_status')
    .eq('id', safety_doc_id)
    .single()

  if (!doc) return Response.json({ error: 'Document not found' }, { status: 404 })
  if (doc.organization_id !== profile.organization_id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!doc.file_path) {
    return Response.json({ error: 'No file uploaded for this document' }, { status: 422 })
  }

  // ── Download from storage ─────────────────────────────────
  const { data: fileBlob, error: downloadError } = await serviceClient.storage
    .from('compliance-docs')
    .download(doc.file_path)

  if (downloadError || !fileBlob) {
    return Response.json(
      { error: `Storage download failed: ${downloadError?.message ?? 'unknown'}` },
      { status: 502 },
    )
  }

  const arrayBuffer = await fileBlob.arrayBuffer()
  const base64Data = Buffer.from(arrayBuffer).toString('base64')

  const ext = doc.file_path.split('.').pop()?.toLowerCase() ?? 'pdf'
  const mimeType =
    ext === 'pdf' ? 'application/pdf'
    : ext === 'png' ? 'image/png'
    : 'image/jpeg'

  // ── AI safety analysis ────────────────────────────────────
  let extracted: SafetyExtracted
  try {
    extracted = await runGeminiSafetyAnalysis(base64Data, mimeType)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return Response.json({ error: `AI analysis failed: ${msg}` }, { status: 502 })
  }

  const approvalStatus: SafetyApprovalStatus = extracted.high_risk_compliant ? 'Approved' : 'Rejected'

  const aiFeedbackLines: string[] = [
    `AI safety analysis (${new Date().toISOString()}):`,
    `  risk_level: ${extracted.risk_level}`,
    `  has_risk_matrix: ${extracted.has_risk_matrix}`,
    `  has_emergency_procedures: ${extracted.has_emergency_procedures}`,
    `  high_risk_compliant: ${extracted.high_risk_compliant}`,
    ...(extracted.identified_hazards.length > 0
      ? ['', 'Identified hazards:', ...extracted.identified_hazards.map((h) => `  • ${h}`)]
      : []),
    ...(extracted.rejection_reasons.length > 0
      ? ['', 'Compliance gaps:', ...extracted.rejection_reasons.map((r) => `  • ${r}`)]
      : []),
  ]

  // ── Update safety_documents ───────────────────────────────
  await serviceClient
    .from('safety_documents')
    .update({
      approval_status:          approvalStatus,
      risk_level:               extracted.risk_level,
      has_risk_matrix:          extracted.has_risk_matrix,
      has_emergency_procedures: extracted.has_emergency_procedures,
      identified_hazards:       extracted.identified_hazards,
      notes:                    aiFeedbackLines.join('\n'),
    })
    .eq('id', safety_doc_id)

  // ── Log system event ──────────────────────────────────────
  await serviceClient.from('system_logs').insert({
    event: 'ai_safety_verification',
    level: approvalStatus === 'Approved' ? 'info' : 'warn',
    message:
      approvalStatus === 'Approved'
        ? `AI approved safety doc ${doc.id} — all safety compliance checks passed`
        : `AI rejected safety doc ${doc.id} — ${extracted.rejection_reasons.length} issue(s)`,
    metadata: {
      safety_doc_id,
      org_id: profile.organization_id,
      extracted,
    },
  })

  return Response.json({
    ok: true,
    approval_status: approvalStatus,
    risk_level: extracted.risk_level,
    has_risk_matrix: extracted.has_risk_matrix,
    has_emergency_procedures: extracted.has_emergency_procedures,
    high_risk_compliant: extracted.high_risk_compliant,
    identified_hazards: extracted.identified_hazards,
    rejection_reasons: extracted.rejection_reasons,
  })
}
