'use server'

import { randomBytes } from 'crypto'
import QRCode from 'qrcode'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createServiceSupabaseClient } from '@/lib/supabase'
import { callGeminiWithTimeout } from '@/lib/utils'
import { createSitePassToken } from '@/lib/site-pass-token'
import type { DocumentType, DocumentStatus, SafetyDocType, SafetyApprovalStatus, SafetyRiskLevel } from '@/types/database.types'

export async function generateInviteToken(): Promise<string> {
  return randomBytes(32).toString('hex')
}

// ── Types ─────────────────────────────────────────────────────────

export type PortalDoc = {
  id: string
  doc_type: DocumentType
  audit_status: DocumentStatus
  expiry_date: string | null
  notes: string | null
}

export type PortalDashboardData = {
  subId: string
  companyName: string
  projectName: string
  riskScore: number
  complianceDocs: PortalDoc[]
  prequalSubmitted: boolean
  qrCodeDataUrl: string
  safetyDocs: SafetyDoc[]
}

export type UploadAndVerifyResult = {
  ok: boolean
  error?: string
  doc_id?: string
  doc_type?: DocumentType
  doc_name?: string
  audit_status?: DocumentStatus
  expiry_date?: string | null
  flag_reasons?: string[]
  updated_risk_score?: number
  updated_notes?: string
}

export type SubmitPortalResult = {
  ok: boolean
  error?: string
}

export type SafetyDoc = {
  id: string
  doc_type: SafetyDocType
  doc_name: string
  approval_status: SafetyApprovalStatus
  risk_level: SafetyRiskLevel | null
  identified_hazards: string[]
  has_risk_matrix: boolean
  has_emergency_procedures: boolean
  high_risk_compliant: boolean | null
  ai_feedback: string | null
}

export type UploadSafetyDocResult = {
  ok: boolean
  error?: string
  doc?: SafetyDoc
  updated_risk_score?: number
}

// ── AI helpers ────────────────────────────────────────────────────

const MIN_LIABILITY_USD = 1_000_000

type ExtractedFields = {
  expiry_date: string | null
  liability_limit_usd: number | null
  policy_number: string | null
  document_type: string | null
}

function parseGeminiJson(raw: string): ExtractedFields {
  const stripped = raw
    .replace(/^```json\s*/m, '').replace(/^```\s*/m, '').replace(/\n?```\s*$/m, '').trim()
  return JSON.parse(stripped)
}

function buildFlagReasons(f: ExtractedFields, today: string): string[] {
  const r: string[] = []
  if (!f.expiry_date) r.push('Could not extract policy expiration date')
  else if (f.expiry_date < today) r.push(`Policy expired on ${f.expiry_date}`)
  if (f.liability_limit_usd === null) r.push('Could not extract liability limit')
  else if (f.liability_limit_usd < MIN_LIABILITY_USD) {
    const fmt = (n: number) =>
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
    r.push(`Policy limit ${fmt(f.liability_limit_usd)} is below required minimum ${fmt(MIN_LIABILITY_USD)}`)
  }
  if (!f.policy_number) r.push('Could not extract policy number')
  return r
}

const SAFETY_GEMINI_PROMPT = `You are a construction safety document analyst specialising in RAMS (Risk Assessment and Method Statements) and site safety compliance.
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

type SafetyExtractedFields = {
  has_risk_matrix: boolean
  has_emergency_procedures: boolean
  identified_hazards: string[]
  risk_level: SafetyRiskLevel
  high_risk_compliant: boolean
  rejection_reasons: string[]
}

async function runGeminiSafetyAudit(file: File): Promise<{
  extracted: SafetyExtractedFields
  approvalStatus: SafetyApprovalStatus
  aiFeedback: string
}> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) throw new Error('GOOGLE_GENERATIVE_AI_API_KEY not configured')

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: 'application/json' },
  })

  const arrayBuffer = await file.arrayBuffer()
  const base64Data = Buffer.from(arrayBuffer).toString('base64')

  const geminiResult = await callGeminiWithTimeout(() =>
    model.generateContent([{ inlineData: { mimeType: file.type, data: base64Data } }, SAFETY_GEMINI_PROMPT])
  )

  const stripped = geminiResult.response.text()
    .replace(/^```json\s*/m, '').replace(/^```\s*/m, '').replace(/\n?```\s*$/m, '').trim()
  const extracted: SafetyExtractedFields = JSON.parse(stripped)

  const approvalStatus: SafetyApprovalStatus = extracted.high_risk_compliant ? 'Approved' : 'Rejected'

  const lines: string[] = [
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

  return { extracted, approvalStatus, aiFeedback: lines.join('\n') }
}

const GEMINI_PROMPT = `You are an insurance document analyst.
Analyse this document and extract the following fields.
Return ONLY a valid JSON object — no markdown, no explanation.

JSON schema:
{
  "expiry_date": "YYYY-MM-DD or null",
  "liability_limit_usd": <integer USD or null>,
  "policy_number": "<string> or null",
  "document_type": "<detected doc type>"
}

Rules:
- expiry_date = policy END / EXPIRATION date, formatted YYYY-MM-DD
- liability_limit_usd = GENERAL AGGREGATE limit, plain integer
- If a field cannot be found, use null`

async function runGeminiAudit(file: File): Promise<{
  extracted: ExtractedFields
  flagReasons: string[]
  auditStatus: DocumentStatus
  notes: string
}> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) throw new Error('GOOGLE_GENERATIVE_AI_API_KEY not configured')

  const today = new Date().toISOString().split('T')[0]
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: 'application/json' },
  })

  const arrayBuffer = await file.arrayBuffer()
  const base64Data = Buffer.from(arrayBuffer).toString('base64')

  const geminiResult = await callGeminiWithTimeout(() =>
    model.generateContent([{ inlineData: { mimeType: file.type, data: base64Data } }, GEMINI_PROMPT])
  )

  const extracted = parseGeminiJson(geminiResult.response.text())
  const flagReasons = buildFlagReasons(extracted, today)
  const auditStatus: DocumentStatus = flagReasons.length === 0 ? 'approved' : 'rejected'

  const notesLines = [
    `AI extracted (${new Date().toISOString()}):`,
    `  expiry_date: ${extracted.expiry_date ?? 'not found'}`,
    `  liability_limit_usd: ${extracted.liability_limit_usd ?? 'not found'}`,
    `  policy_number: ${extracted.policy_number ?? 'not found'}`,
    ...(flagReasons.length > 0
      ? ['', 'Flagged reasons:', ...flagReasons.map((r) => `  • ${r}`)]
      : []),
  ]

  return { extracted, flagReasons, auditStatus, notes: notesLines.join('\n') }
}

function validateUploadFile(file: File | null): string | null {
  if (!file || file.size === 0) return 'Please select a file.'
  if (!['application/pdf', 'image/png', 'image/jpeg'].includes(file.type)) {
    return 'Only PDF, PNG, and JPEG files are allowed.'
  }
  if (file.size > 50 * 1024 * 1024) return 'File exceeds 50 MB limit.'
  return null
}

// ── getPortalDashboardData ────────────────────────────────────────

export async function getPortalDashboardData(token: string): Promise<PortalDashboardData | null> {
  const supabase = createServiceSupabaseClient()

  const { data: sub } = await supabase
    .from('subcontractors')
    .select('id, company_name, organization_id, invite_expires_at, risk_score, projects(id, name)')
    .eq('invite_token', token)
    .single()

  if (!sub || !sub.organization_id) return null
  if (sub.invite_expires_at && new Date(sub.invite_expires_at) < new Date()) return null

  const project = sub.projects as { id: string; name: string } | null

  const [docsResult, prequalResult, safetyDocsResult] = await Promise.all([
    supabase
      .from('documents')
      .select('id, type, status, expiry_date, rejection_reason')
      .eq('subcontractor_id', sub.id)
      .eq('is_current', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('prequal_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('subcontractor_id', sub.id),
    supabase
      .from('safety_documents')
      .select('id, doc_type, approval_status, risk_level, identified_hazards, has_risk_matrix, has_emergency_procedures, notes')
      .eq('subcontractor_id', sub.id)
      .order('created_at', { ascending: false }),
  ])

  const sitePassToken = createSitePassToken(sub.id, sub.organization_id)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const gateUrl = `${appUrl}/gate/verify/${sitePassToken}`
  const qrCodeDataUrl = await QRCode.toDataURL(gateUrl, {
    width: 280,
    margin: 2,
    errorCorrectionLevel: 'H',
    color: { dark: '#1e293b', light: '#ffffff' },
  })

  const rawSafetyDocs = (safetyDocsResult.data ?? []) as Array<{
    id: string
    doc_type: SafetyDocType
    approval_status: SafetyApprovalStatus
    risk_level: SafetyRiskLevel | null
    identified_hazards: unknown
    has_risk_matrix: boolean
    has_emergency_procedures: boolean
    notes: string | null
  }>

  const safetyDocs: SafetyDoc[] = rawSafetyDocs.map((d) => ({
    ...d,
    doc_name: '',
    ai_feedback: d.notes,
    high_risk_compliant: null,
    identified_hazards: Array.isArray(d.identified_hazards) ? (d.identified_hazards as string[]) : [],
  }))

  return {
    subId: sub.id,
    companyName: sub.company_name,
    projectName: project?.name ?? 'Your Project',
    riskScore: sub.risk_score ?? 0,
    complianceDocs: (docsResult.data ?? []).map((d) => ({
      id: d.id,
      doc_type: d.type as DocumentType,
      audit_status: d.status as DocumentStatus,
      expiry_date: d.expiry_date,
      notes: d.rejection_reason,
    })),
    prequalSubmitted: (prequalResult.count ?? 0) > 0,
    qrCodeDataUrl,
    safetyDocs,
  }
}

// ── uploadAndVerify ───────────────────────────────────────────────
// For uploading brand-new doc types (INSERT path).

export async function uploadAndVerify(
  inviteToken: string,
  formData: FormData,
): Promise<UploadAndVerifyResult> {
  const supabase = createServiceSupabaseClient()

  const { data: sub } = await supabase
    .from('subcontractors')
    .select('id, organization_id, invite_expires_at')
    .eq('invite_token', inviteToken)
    .single()

  if (!sub?.organization_id) return { ok: false, error: 'Invalid invite link.' }
  if (sub.invite_expires_at && new Date(sub.invite_expires_at) < new Date()) {
    return { ok: false, error: 'Invite link has expired. Ask your GC to resend.' }
  }

  const file = formData.get('file') as File | null
  const docType = (formData.get('doc_type') as string ?? 'COI') as DocumentType
  const docName =
    (formData.get('doc_name') as string ?? '').trim() || `${docType} — ${sub.id.slice(0, 6)}`

  const fileErr = validateUploadFile(file)
  if (fileErr) return { ok: false, error: fileErr }

  const sanitized = file!.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const filePath = `portal/${sub.id}/${Date.now()}-${sanitized}`

  const { error: uploadError } = await supabase.storage
    .from('compliance-docs')
    .upload(filePath, file!, { contentType: file!.type, cacheControl: '3600', upsert: false })

  if (uploadError) return { ok: false, error: `Storage upload failed: ${uploadError.message}` }

  // Only set is_current = true if no approved current doc of this type already holds the slot.
  const { data: existingCurrent } = await supabase
    .from('documents')
    .select('id')
    .eq('subcontractor_id', sub.id)
    .eq('type', docType)
    .eq('is_current', true)
    .eq('status', 'approved')
    .maybeSingle()

  const { data: doc, error: docError } = await supabase
    .from('documents')
    .insert({
      subcontractor_id: sub.id,
      organization_id: sub.organization_id,
      type: docType,
      status: 'pending',
      is_current: !existingCurrent,
      file_path: filePath,
    })
    .select('id')
    .single()

  if (docError) {
    await supabase.storage.from('compliance-docs').remove([filePath])
    return { ok: false, error: docError.message }
  }

  try {
    const { extracted, flagReasons, auditStatus, notes } = await runGeminiAudit(file!)

    if (auditStatus === 'approved') {
      // Golden Rule: this doc takes the slot, archive all siblings.
      await supabase.from('documents')
        .update({ is_current: false })
        .eq('subcontractor_id', sub.id)
        .eq('type', docType)
        .neq('id', doc!.id)

      await supabase.from('documents')
        .update({ status: 'approved', expiry_date: extracted.expiry_date ?? null, is_current: true, rejection_reason: null })
        .eq('id', doc!.id)
    } else {
      await supabase.from('documents')
        .update({ status: auditStatus, expiry_date: extracted.expiry_date ?? null, rejection_reason: flagReasons.length > 0 ? notes : null })
        .eq('id', doc!.id)
    }

    const { data: updatedSub } = await supabase
      .from('subcontractors')
      .select('risk_score')
      .eq('id', sub.id)
      .single()

    return {
      ok: true,
      doc_id: doc!.id,
      doc_type: docType,
      doc_name: docName,
      audit_status: auditStatus,
      expiry_date: extracted.expiry_date,
      flag_reasons: flagReasons,
      updated_risk_score: updatedSub?.risk_score,
      updated_notes: flagReasons.length > 0 ? notes : undefined,
    }
  } catch {
    return { ok: true, doc_id: doc!.id, doc_type: docType, doc_name: docName, audit_status: 'pending', flag_reasons: [] }
  }
}

// ── reAuditDoc ────────────────────────────────────────────────────
// For the Fix List — replaces file on an existing doc and re-runs the AI.

export async function reAuditDoc(
  inviteToken: string,
  docId: string,
  formData: FormData,
): Promise<UploadAndVerifyResult> {
  const supabase = createServiceSupabaseClient()

  const { data: sub } = await supabase
    .from('subcontractors')
    .select('id, organization_id, invite_expires_at')
    .eq('invite_token', inviteToken)
    .single()

  if (!sub?.organization_id) return { ok: false, error: 'Invalid invite link.' }
  if (sub.invite_expires_at && new Date(sub.invite_expires_at) < new Date()) {
    return { ok: false, error: 'Invite link has expired. Ask your GC to resend.' }
  }

  const { data: existingDoc } = await supabase
    .from('documents')
    .select('id, type, file_path')
    .eq('id', docId)
    .eq('subcontractor_id', sub.id)
    .single()

  if (!existingDoc) return { ok: false, error: 'Document not found.' }

  const file = formData.get('file') as File | null
  const fileErr = validateUploadFile(file)
  if (fileErr) return { ok: false, error: fileErr }

  const sanitized = file!.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const filePath = `portal/${sub.id}/${Date.now()}-${sanitized}`

  const { error: uploadError } = await supabase.storage
    .from('compliance-docs')
    .upload(filePath, file!, { contentType: file!.type, cacheControl: '3600', upsert: false })

  if (uploadError) return { ok: false, error: `Storage upload failed: ${uploadError.message}` }

  if (existingDoc.file_path) {
    supabase.storage.from('compliance-docs').remove([existingDoc.file_path]).catch(() => {})
  }

  const docType = existingDoc.type as DocumentType

  try {
    const { extracted, flagReasons, auditStatus, notes } = await runGeminiAudit(file!)

    if (auditStatus === 'approved') {
      // Golden Rule: promote this doc, archive siblings.
      await supabase.from('documents')
        .update({ is_current: false })
        .eq('subcontractor_id', sub.id)
        .eq('type', docType)
        .neq('id', docId)

      await supabase.from('documents')
        .update({ status: 'approved', expiry_date: extracted.expiry_date ?? null, is_current: true, rejection_reason: null, file_path: filePath })
        .eq('id', docId)
    } else {
      await supabase.from('documents')
        .update({ status: auditStatus, expiry_date: extracted.expiry_date ?? null, rejection_reason: flagReasons.length > 0 ? notes : null, file_path: filePath })
        .eq('id', docId)
    }

    const { data: updatedSub } = await supabase
      .from('subcontractors')
      .select('risk_score')
      .eq('id', sub.id)
      .single()

    return {
      ok: true,
      doc_id: docId,
      doc_type: docType,
      doc_name: '',
      audit_status: auditStatus,
      expiry_date: extracted.expiry_date,
      flag_reasons: flagReasons,
      updated_risk_score: updatedSub?.risk_score,
      updated_notes: flagReasons.length > 0 ? notes : undefined,
    }
  } catch {
    await supabase.from('documents')
      .update({ status: 'pending', file_path: filePath })
      .eq('id', docId)

    const { data: updatedSub } = await supabase
      .from('subcontractors')
      .select('risk_score')
      .eq('id', sub.id)
      .single()

    return {
      ok: true,
      doc_id: docId,
      doc_type: docType,
      doc_name: '',
      audit_status: 'pending',
      flag_reasons: [],
      updated_risk_score: updatedSub?.risk_score,
    }
  }
}

// ── submitPortal ──────────────────────────────────────────────────

export async function submitPortal(
  inviteToken: string,
  hadSiteIncident: boolean,
  bondingCapacity: string,
  tradeAccreditation: string,
): Promise<SubmitPortalResult> {
  const supabase = createServiceSupabaseClient()

  const { data: sub } = await supabase
    .from('subcontractors')
    .select('id, company_name, organization_id')
    .eq('invite_token', inviteToken)
    .single()

  if (!sub?.organization_id) return { ok: false, error: 'Invalid invite.' }

  await supabase.from('prequal_submissions').insert({
    subcontractor_id: sub.id,
    had_site_incident: hadSiteIncident,
    bonding_capacity_usd: bondingCapacity.trim() ? (Number(bondingCapacity.trim()) || null) : null,
    trade_accreditation_no: tradeAccreditation.trim() || null,
  })

  await supabase
    .from('subcontractors')
    .update({ portal_submitted_at: new Date().toISOString() })
    .eq('id', sub.id)

  await supabase.from('gc_notifications').insert({
    organization_id: sub.organization_id,
    message: `${sub.company_name} has submitted their prequalification form.`,
  })

  return { ok: true }
}

// ── dismissNotification ───────────────────────────────────────────

export async function dismissNotification(notifId: string): Promise<void> {
  const supabase = createServiceSupabaseClient()
  await supabase.from('gc_notifications').update({ is_read: true }).eq('id', notifId)
}

// ── uploadSafetyDoc ───────────────────────────────────────────────
// Uploads a new safety document and runs AI safety analysis.

export async function uploadSafetyDoc(
  inviteToken: string,
  formData: FormData,
): Promise<UploadSafetyDocResult> {
  const supabase = createServiceSupabaseClient()

  const { data: sub } = await supabase
    .from('subcontractors')
    .select('id, organization_id, invite_expires_at')
    .eq('invite_token', inviteToken)
    .single()

  if (!sub?.organization_id) return { ok: false, error: 'Invalid invite link.' }
  if (sub.invite_expires_at && new Date(sub.invite_expires_at) < new Date()) {
    return { ok: false, error: 'Invite link has expired. Ask your GC to resend.' }
  }

  const file = formData.get('file') as File | null
  const docType = (formData.get('doc_type') as string ?? 'RAMS') as SafetyDocType
  const docName = (formData.get('doc_name') as string ?? '').trim() || `${docType} — ${sub.id.slice(0, 6)}`

  const fileErr = validateUploadFile(file)
  if (fileErr) return { ok: false, error: fileErr }

  const sanitized = file!.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const filePath = `safety/${sub.id}/${Date.now()}-${sanitized}`

  const { error: uploadError } = await supabase.storage
    .from('compliance-docs')
    .upload(filePath, file!, { contentType: file!.type, cacheControl: '3600', upsert: false })

  if (uploadError) return { ok: false, error: `Storage upload failed: ${uploadError.message}` }

  const { data: insertedDoc, error: insertError } = await supabase
    .from('safety_documents')
    .insert({
      subcontractor_id: sub.id,
      organization_id:  sub.organization_id,
      doc_type:         docType,
      approval_status:  'Under Review',
      file_path:        filePath,
    })
    .select('id')
    .single()

  if (insertError) {
    await supabase.storage.from('compliance-docs').remove([filePath])
    return { ok: false, error: insertError.message }
  }

  try {
    const { extracted, approvalStatus, aiFeedback } = await runGeminiSafetyAudit(file!)

    await supabase
      .from('safety_documents')
      .update({
        approval_status:          approvalStatus,
        risk_level:               extracted.risk_level,
        has_risk_matrix:          extracted.has_risk_matrix,
        has_emergency_procedures: extracted.has_emergency_procedures,
        identified_hazards:       extracted.identified_hazards,
        notes:                    aiFeedback,
      })
      .eq('id', insertedDoc!.id)

    const { data: updatedSub } = await supabase
      .from('subcontractors')
      .select('risk_score')
      .eq('id', sub.id)
      .single()

    const doc: SafetyDoc = {
      id:                       insertedDoc!.id,
      doc_type:                 docType,
      doc_name:                 docName,
      approval_status:          approvalStatus,
      risk_level:               extracted.risk_level,
      identified_hazards:       extracted.identified_hazards,
      has_risk_matrix:          extracted.has_risk_matrix,
      has_emergency_procedures: extracted.has_emergency_procedures,
      high_risk_compliant:      extracted.high_risk_compliant,
      ai_feedback:              aiFeedback,
    }

    return { ok: true, doc, updated_risk_score: updatedSub?.risk_score }
  } catch {
    return {
      ok: true,
      doc: {
        id: insertedDoc!.id, doc_type: docType, doc_name: docName,
        approval_status: 'Under Review', risk_level: null,
        identified_hazards: [], has_risk_matrix: false,
        has_emergency_procedures: false, high_risk_compliant: null, ai_feedback: null,
      },
    }
  }
}

// ── reAuditSafetyDoc ──────────────────────────────────────────────
// Replaces the file on a Rejected safety document and re-runs AI.

export async function reAuditSafetyDoc(
  inviteToken: string,
  docId: string,
  formData: FormData,
): Promise<UploadSafetyDocResult> {
  const supabase = createServiceSupabaseClient()

  const { data: sub } = await supabase
    .from('subcontractors')
    .select('id, organization_id, invite_expires_at')
    .eq('invite_token', inviteToken)
    .single()

  if (!sub?.organization_id) return { ok: false, error: 'Invalid invite link.' }
  if (sub.invite_expires_at && new Date(sub.invite_expires_at) < new Date()) {
    return { ok: false, error: 'Invite link has expired. Ask your GC to resend.' }
  }

  const { data: existingDoc } = await supabase
    .from('safety_documents')
    .select('id, doc_type, file_path')
    .eq('id', docId)
    .eq('subcontractor_id', sub.id)
    .single()

  if (!existingDoc) return { ok: false, error: 'Document not found.' }

  const file = formData.get('file') as File | null
  const fileErr = validateUploadFile(file)
  if (fileErr) return { ok: false, error: fileErr }

  const sanitized = file!.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const filePath = `safety/${sub.id}/${Date.now()}-${sanitized}`

  const { error: uploadError } = await supabase.storage
    .from('compliance-docs')
    .upload(filePath, file!, { contentType: file!.type, cacheControl: '3600', upsert: false })

  if (uploadError) return { ok: false, error: `Storage upload failed: ${uploadError.message}` }

  if (existingDoc.file_path) {
    supabase.storage.from('compliance-docs').remove([existingDoc.file_path]).catch(() => {})
  }

  try {
    const { extracted, approvalStatus, aiFeedback } = await runGeminiSafetyAudit(file!)

    await supabase
      .from('safety_documents')
      .update({
        approval_status:          approvalStatus,
        risk_level:               extracted.risk_level,
        has_risk_matrix:          extracted.has_risk_matrix,
        has_emergency_procedures: extracted.has_emergency_procedures,
        identified_hazards:       extracted.identified_hazards,
        notes:                    aiFeedback,
        file_path:                filePath,
      })
      .eq('id', docId)

    const { data: updatedSub } = await supabase
      .from('subcontractors')
      .select('risk_score')
      .eq('id', sub.id)
      .single()

    const doc: SafetyDoc = {
      id:                       docId,
      doc_type:                 existingDoc.doc_type as SafetyDocType,
      doc_name:                 '',
      approval_status:          approvalStatus,
      risk_level:               extracted.risk_level,
      identified_hazards:       extracted.identified_hazards,
      has_risk_matrix:          extracted.has_risk_matrix,
      has_emergency_procedures: extracted.has_emergency_procedures,
      high_risk_compliant:      extracted.high_risk_compliant,
      ai_feedback:              aiFeedback,
    }

    return { ok: true, doc, updated_risk_score: updatedSub?.risk_score }
  } catch {
    await supabase
      .from('safety_documents')
      .update({ approval_status: 'Under Review', file_path: filePath })
      .eq('id', docId)

    const { data: updatedSub } = await supabase
      .from('subcontractors')
      .select('risk_score')
      .eq('id', sub.id)
      .single()

    return {
      ok: true,
      doc: {
        id: docId, doc_type: existingDoc.doc_type as SafetyDocType,
        doc_name: '', approval_status: 'Under Review',
        risk_level: null, identified_hazards: [], has_risk_matrix: false,
        has_emergency_procedures: false, high_risk_compliant: null, ai_feedback: null,
      },
      updated_risk_score: updatedSub?.risk_score,
    }
  }
}
