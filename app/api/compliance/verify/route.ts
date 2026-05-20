import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase'
import { createServiceSupabaseClient } from '@/lib/supabase'
import { sendFlaggedAlert } from '@/lib/notifications'
import type { AuditStatus } from '@/types/database.types'

export const runtime = 'nodejs'

// Minimum acceptable general liability in USD — treat this as the org-level floor.
// Phase 2: stored per org. Today it's a constant until the settings UI ships.
const MIN_LIABILITY_USD = 1_000_000

type ExtractedFields = {
  expiry_date: string | null       // YYYY-MM-DD
  liability_limit_usd: number | null
  policy_number: string | null
  document_type: string | null
}

function extractJson(raw: string): ExtractedFields {
  const stripped = raw
    .replace(/^```json\s*/m, '')
    .replace(/^```\s*/m, '')
    .replace(/\n?```\s*$/m, '')
    .trim()
  return JSON.parse(stripped)
}

async function runGeminiExtraction(
  base64Data: string,
  mimeType: string,
): Promise<ExtractedFields> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set')

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: { responseMimeType: 'application/json' },
  })

  const prompt = `You are an insurance document analyst.
Analyse this document and extract the following fields exactly.
Return ONLY a valid JSON object — no markdown, no explanation.

Required JSON schema:
{
  "expiry_date": "YYYY-MM-DD or null if not found",
  "liability_limit_usd": <number (numeric USD amount) or null>,
  "policy_number": "<string> or null",
  "document_type": "<e.g. Certificate of Insurance, General Liability Policy, License, etc.>"
}

Important:
- expiry_date must be the policy END / EXPIRATION date, formatted as YYYY-MM-DD
- liability_limit_usd must be the GENERAL AGGREGATE limit in USD as a plain integer (e.g. 1000000)
- If a field cannot be determined, use null`

  const result = await model.generateContent([
    { inlineData: { mimeType, data: base64Data } },
    prompt,
  ])

  return extractJson(result.response.text())
}

function buildFlagReasons(
  fields: ExtractedFields,
  today: string,
): string[] {
  const reasons: string[] = []

  if (!fields.expiry_date) {
    reasons.push('Could not extract policy expiration date')
  } else if (fields.expiry_date < today) {
    reasons.push(`Policy expired on ${fields.expiry_date}`)
  }

  if (fields.liability_limit_usd === null) {
    reasons.push('Could not extract liability limit')
  } else if (fields.liability_limit_usd < MIN_LIABILITY_USD) {
    const fmt = (n: number) =>
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
    reasons.push(
      `Liability limit ${fmt(fields.liability_limit_usd)} is below the required minimum of ${fmt(MIN_LIABILITY_USD)}`
    )
  }

  if (!fields.policy_number) {
    reasons.push('Could not extract policy number')
  }

  return reasons
}

export async function POST(request: Request) {
  // ── Auth check ────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'gc' || !profile.organization_id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  // ── Parse body ────────────────────────────────────────────────
  let compliance_doc_id: string
  try {
    const body = await request.json() as { compliance_doc_id?: string }
    if (!body.compliance_doc_id) throw new Error('missing')
    compliance_doc_id = body.compliance_doc_id
  } catch {
    return Response.json({ error: 'compliance_doc_id is required' }, { status: 400 })
  }

  // ── Fetch compliance doc (must belong to this org) ────────────
  const serviceClient = createServiceSupabaseClient()

  const { data: doc } = await serviceClient
    .from('compliance_docs')
    .select('id, file_path, doc_type, doc_name, organization_id, audit_status, subcontractor_id')
    .eq('id', compliance_doc_id)
    .single()

  if (!doc) {
    return Response.json({ error: 'Document not found' }, { status: 404 })
  }
  if (doc.organization_id !== profile.organization_id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!doc.file_path) {
    return Response.json({ error: 'No file uploaded for this document' }, { status: 422 })
  }

  // ── Download from Supabase Storage ───────────────────────────
  const { data: fileBlob, error: downloadError } = await serviceClient.storage
    .from('compliance-docs')
    .download(doc.file_path)

  if (downloadError || !fileBlob) {
    return Response.json({ error: `Storage download failed: ${downloadError?.message ?? 'unknown'}` }, { status: 502 })
  }

  const arrayBuffer = await fileBlob.arrayBuffer()
  const base64Data = Buffer.from(arrayBuffer).toString('base64')

  // Detect MIME from file extension
  const ext = doc.file_path.split('.').pop()?.toLowerCase() ?? 'pdf'
  const mimeType = ext === 'pdf' ? 'application/pdf'
    : ext === 'png' ? 'image/png'
    : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
    : 'application/pdf'

  // ── AI extraction ─────────────────────────────────────────────
  let extracted: ExtractedFields
  try {
    extracted = await runGeminiExtraction(base64Data, mimeType)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return Response.json({ error: `AI extraction failed: ${msg}` }, { status: 502 })
  }

  const today = new Date().toISOString().split('T')[0]
  const flagReasons = buildFlagReasons(extracted, today)
  const newAuditStatus: AuditStatus = flagReasons.length === 0 ? 'Verified' : 'Flagged'

  // Build a notes summary
  const notesLines: string[] = [
    `AI extracted (${new Date().toISOString()}):`,
    `  expiry_date: ${extracted.expiry_date ?? 'not found'}`,
    `  liability_limit_usd: ${extracted.liability_limit_usd ?? 'not found'}`,
    `  policy_number: ${extracted.policy_number ?? 'not found'}`,
    `  document_type: ${extracted.document_type ?? 'not found'}`,
  ]
  if (flagReasons.length > 0) {
    notesLines.push('', 'Flagged reasons:', ...flagReasons.map((r) => `  • ${r}`))
  }

  // ── Update compliance_docs ────────────────────────────────────
  await serviceClient
    .from('compliance_docs')
    .update({
      audit_status: newAuditStatus,
      expiry_date: extracted.expiry_date ?? undefined,
      notes: notesLines.join('\n'),
      ...(newAuditStatus === 'Verified'
        ? { verified_by: user.id, verified_at: new Date().toISOString() }
        : {}),
    })
    .eq('id', compliance_doc_id)

  // ── Log the event ─────────────────────────────────────────────
  await serviceClient.from('system_logs').insert({
    event: 'ai_compliance_verification',
    level: newAuditStatus === 'Verified' ? 'info' : 'warn',
    message: newAuditStatus === 'Verified'
      ? `AI verified compliance doc "${doc.doc_name}" — all checks passed`
      : `AI flagged compliance doc "${doc.doc_name}" — ${flagReasons.length} issue(s)`,
    metadata: {
      compliance_doc_id,
      org_id: profile.organization_id,
      extracted,
      flag_reasons: flagReasons,
    },
  })

  // ── Fire flagged alert if document was flagged ─────────────────
  if (newAuditStatus === 'Flagged' && doc.subcontractor_id) {
    const { data: sub } = await serviceClient
      .from('subcontractors')
      .select('id, organization_id, company_name, contact_email, primary_contact_phone, invite_token')
      .eq('id', doc.subcontractor_id)
      .single()

    if (sub) {
      // Fire-and-forget — don't block the response
      sendFlaggedAlert(serviceClient, {
        subId:        sub.id,
        orgId:        sub.organization_id,
        companyName:  sub.company_name,
        contactEmail: sub.contact_email,
        contactPhone: sub.primary_contact_phone,
        inviteToken:  sub.invite_token,
        docName:      doc.doc_name,
        docType:      doc.doc_type,
        flagReasons,
      }).catch(() => { /* alert failure must never crash the verify endpoint */ })
    }
  }

  return Response.json({
    ok: true,
    audit_status: newAuditStatus,
    extracted,
    flag_reasons: flagReasons,
  })
}
