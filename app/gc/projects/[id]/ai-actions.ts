'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { callGeminiWithTimeout } from '@/lib/utils'
import type { DocumentType } from '@/types/database.types'

// ── Constants ─────────────────────────────────────────────────

const EXPIRY_REASONS: Partial<Record<DocumentType, string>> = {
  'COI':               'Insurance Coverage Expired',
  'Certified Payroll': 'Payroll Certification Expired',
}

const MIN_GENERAL_LIABILITY_USD = 1_000_000

const GEMINI_PROMPT =
  'You are a document extraction specialist for a construction compliance platform. ' +
  'Extract the following fields from this document.\n\n' +
  'FIELD 1 — company_name (MANDATORY): Find the primary business/company name. ' +
  'Search these locations in order: ' +
  '(1) "Insured", "Named Insured", or "Policyholder" on insurance/COI documents; ' +
  '(2) Line 1 "Name" or "Business name / disregarded entity name" on W-9 forms; ' +
  '(3) "Employer Name", "Company Name", or "Contractor" on payroll documents; ' +
  '(4) Any prominent organization name in the document header or title block. ' +
  'Extract the FULL legal company name exactly as written — do not abbreviate.\n\n' +
  'FIELD 2 — expiry_date: Find the document expiration or policy end date. ' +
  'On COI documents look for "POLICY EXP", "EXPIRATION DATE", or "EXP DATE" columns — return the LATEST date found. ' +
  'On W-9 forms there is no expiry date, so return "NOT_FOUND". ' +
  'Format as YYYY-MM-DD.\n\n' +
  'FIELD 3 — general_liability_each_occurrence: For COI/insurance documents, locate the ' +
  '"Commercial General Liability" or "General Liability" section (may be abbreviated CGL or GL). ' +
  'Use ALL of the following strategies to find the "Each Occurrence" limit:\n' +
  '  • Scan column headers for: "Each Occurrence", "Each Occ", "Occurrence Limit", "Per Occurrence", or "Limit"\n' +
  '  • Scan row labels for: "Occur", "Occurrence", "Each Occurrence", or "Policy Limit"\n' +
  '  • Look for the first dollar amount in the Limits column of the General Liability row\n' +
  '  • If multiple dollar amounts appear in the GL section, the Each Occurrence limit is typically ' +
  'the FIRST number listed (the aggregate is usually the second, larger number)\n' +
  '  • Common values are $500,000 / $1,000,000 / $2,000,000\n' +
  'Return as a plain integer (no $ or commas): "$1,000,000" → 1000000. ' +
  'Return "NOT_FOUND" if this is not a COI or no GL section exists at all.\n\n' +
  'CRITICAL — limits vs deductibles: The Limits column and the Deductible column are different. ' +
  'Deductibles are labeled "Deductible" or "Ded." and are typically small ($500–$10,000). ' +
  'Only extract the value from the LIMITS column, never the Deductible column.\n\n' +
  'FIELD 4 — coverage_extraction_detail: Exactly one of these four codes describing the GL extraction:\n' +
  '  • "success" — found and extracted the Each Occurrence limit\n' +
  '  • "section_found_no_amount" — found the GL/CGL section but no readable dollar amount\n' +
  '  • "amount_unclear" — found an amount but it was blurry, smudged, or illegible\n' +
  '  • "section_not_found" — not a COI, or no GL section present\n\n' +
  'Return ONLY valid JSON: {"company_name": "...", "expiry_date": "YYYY-MM-DD", ' +
  '"general_liability_each_occurrence": number_or_NOT_FOUND, ' +
  '"coverage_extraction_detail": "success|section_found_no_amount|amount_unclear|section_not_found"}. ' +
  'Use "NOT_FOUND" for any field you cannot locate.'

// ── Helpers ───────────────────────────────────────────────────

type CoverageExtractionDetail = 'success' | 'section_found_no_amount' | 'amount_unclear' | 'section_not_found'

type GeminiExtraction = {
  expiry_date: string | null
  company_name: string | null
  general_liability_each_occurrence: number | null
  coverage_extraction_detail: CoverageExtractionDetail | null
}

function parseCurrencyToNumber(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null
  const s = String(raw).trim()
  if (s === '' || s === 'NOT_FOUND' || s === 'null') return null
  const cleaned = s.replace(/[$,\s]/g, '')
  const mMatch = cleaned.match(/^(\d+(?:\.\d+)?)M$/i)
  if (mMatch) return Math.round(parseFloat(mMatch[1]) * 1_000_000)
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

const EMPTY_EXTRACTION: GeminiExtraction = {
  expiry_date: null,
  company_name: null,
  general_liability_each_occurrence: null,
  coverage_extraction_detail: null,
}

function parseGeminiResponse(text: string): GeminiExtraction {
  const stripped = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim()

  const match = stripped.match(/\{[\s\S]*\}/)
  if (!match) return EMPTY_EXTRACTION

  try {
    const parsed = JSON.parse(match[0])
    const notFound = (v: unknown) =>
      typeof v !== 'string' || v.trim() === '' || v === 'NOT_FOUND'

    const validDetails: CoverageExtractionDetail[] = ['success', 'section_found_no_amount', 'amount_unclear', 'section_not_found']
    const detail = parsed.coverage_extraction_detail

    return {
      expiry_date:  notFound(parsed.expiry_date)  ? null : (parsed.expiry_date  as string),
      company_name: notFound(parsed.company_name) ? null : (parsed.company_name as string),
      general_liability_each_occurrence: parseCurrencyToNumber(parsed.general_liability_each_occurrence),
      coverage_extraction_detail: validDetails.includes(detail) ? (detail as CoverageExtractionDetail) : null,
    }
  } catch {
    return EMPTY_EXTRACTION
  }
}

function mimeFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return 'application/pdf'
  if (ext === 'png') return 'image/png'
  return 'image/jpeg'
}

function namesMatch(a: string, b: string): boolean {
  const norm = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim()
  return norm(a) === norm(b)
}

// ── Types ─────────────────────────────────────────────────────

type DocWithSub = {
  id: string
  type: DocumentType
  file_path: string | null
  subcontractor_id: string
  subcontractors: { company_name: string; contact_email: string } | null
}

export type AiReviewResult = {
  error: string | null
  status?: 'approved' | 'rejected' | 'pending_verification'
  message?: string
}

// ── Email templates ────────────────────────────────────────────

function rejectionEmailHtml(subName: string, projectName: string, rejectionReason: string, portalUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Document Rejected</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="background:#0f172a;border-radius:12px 12px 0 0;padding:32px 40px;text-align:center;">
              <span style="font-size:28px;">🏗️</span>
              <h1 style="margin:8px 0 0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">HardHat Compliance</h1>
              <p style="margin:4px 0 0;color:#94a3b8;font-size:13px;">Construction compliance made simple</p>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;padding:40px 40px 32px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
              <p style="display:inline-block;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:8px 16px;color:#dc2626;font-size:13px;font-weight:600;margin:0 0 24px;">❌ Action Required</p>
              <h2 style="margin:0 0 20px;color:#0f172a;font-size:24px;font-weight:700;line-height:1.3;">Your document was rejected for<br/><span style="color:#dc2626;">${projectName}</span></h2>
              <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.7;">
                Hi <strong>${subName}</strong>,<br/><br/>
                Our compliance system reviewed your submission and identified an issue that requires your attention.
              </p>
              <div style="background:#fef2f2;border:1px solid #fecaca;border-left:4px solid #dc2626;border-radius:8px;padding:16px 20px;margin:24px 0;">
                <p style="margin:0 0 4px;color:#991b1b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Rejection Reason</p>
                <p style="margin:0;color:#dc2626;font-size:15px;font-weight:600;">${rejectionReason}</p>
              </div>
              <p style="margin:0 0 8px;color:#475569;font-size:15px;line-height:1.7;">Please log in to your portal to upload a corrected document.</p>
              <table cellpadding="0" cellspacing="0" style="margin:32px 0;">
                <tr>
                  <td style="background:#dc2626;border-radius:8px;">
                    <a href="${portalUrl}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:-0.1px;">Go to Your Portal →</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;color:#94a3b8;font-size:13px;line-height:1.6;">
                If the button doesn't work, copy and paste this link:<br/>
                <a href="${portalUrl}" style="color:#dc2626;word-break:break-all;">${portalUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:24px 40px;text-align:center;">
              <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">
                This is an automated compliance notification from HardHat Compliance.<br/>
                If you have questions, contact your general contractor directly.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function approvalEmailHtml(subName: string, projectName: string, portalUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Compliance Confirmed</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="background:#0f172a;border-radius:12px 12px 0 0;padding:32px 40px;text-align:center;">
              <span style="font-size:28px;">🏗️</span>
              <h1 style="margin:8px 0 0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">HardHat Compliance</h1>
              <p style="margin:4px 0 0;color:#94a3b8;font-size:13px;">Construction compliance made simple</p>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;padding:40px 40px 32px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
              <p style="display:inline-block;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:8px 16px;color:#16a34a;font-size:13px;font-weight:600;margin:0 0 24px;">✅ Compliance Confirmed</p>
              <h2 style="margin:0 0 20px;color:#0f172a;font-size:24px;font-weight:700;line-height:1.3;">You're cleared for<br/><span style="color:#16a34a;">${projectName}</span></h2>
              <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.7;">
                Hi <strong>${subName}</strong>,<br/><br/>
                Great news — your compliance documents have been reviewed and approved.
              </p>
              <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-left:4px solid #16a34a;border-radius:8px;padding:16px 20px;margin:24px 0;">
                <p style="margin:0;color:#15803d;font-size:15px;font-weight:600;">🟢 You are now cleared for the job site. Your Digital Safety Pass is now Green.</p>
              </div>
              <table cellpadding="0" cellspacing="0" style="margin:32px 0;">
                <tr>
                  <td style="background:#16a34a;border-radius:8px;">
                    <a href="${portalUrl}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:-0.1px;">View Your Portal →</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:24px 40px;text-align:center;">
              <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">
                This is an automated compliance notification from HardHat Compliance.<br/>
                If you have questions, contact your general contractor directly.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ── Actions ───────────────────────────────────────────────────

export async function runAiReview(
  documentId: string,
  projectId: string,
): Promise<AiReviewResult> {
  const supabase = await createClient()

  // 1. Fetch document + subcontractor info
  const { data, error: fetchError } = await supabase
    .from('documents')
    .select('id, type, file_path, subcontractor_id, subcontractors(company_name, contact_email)')
    .eq('id', documentId)
    .single()

  const doc = data as DocWithSub | null
  if (fetchError || !doc) return { error: 'Document not found.' }
  if (!doc.file_path)     return { error: 'No file is attached to this document.' }

  const subName = doc.subcontractors?.company_name
  if (!subName) return { error: 'Subcontractor record not found.' }

  // 2. Download file bytes from Supabase Storage
  const { data: blob, error: storageError } = await supabase.storage
    .from('compliance-docs')
    .download(doc.file_path)

  if (storageError || !blob) {
    return { error: `Storage download failed: ${storageError?.message ?? 'unknown'}` }
  }

  const base64   = Buffer.from(await blob.arrayBuffer()).toString('base64')
  const mimeType = mimeFromPath(doc.file_path)

  // 3. Send to Gemini 2.5 Flash
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) return { error: 'GOOGLE_GENERATIVE_AI_API_KEY is not set in .env.local.' }

  let extraction: GeminiExtraction = { ...EMPTY_EXTRACTION }
  try {
    const genAI  = new GoogleGenerativeAI(apiKey)
    const model  = genAI.getGenerativeModel(
      { model: 'gemini-2.5-flash' },
      { apiVersion: 'v1beta' },
    )
    const result = await callGeminiWithTimeout(() =>
      model.generateContent([{ inlineData: { data: base64, mimeType } }, GEMINI_PROMPT])
    )
    extraction = parseGeminiResponse(result.response.text())
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('429') || msg.includes('503') || msg.includes('timed out') || /quota|rate.?limit|service.?unavailable|overload/i.test(msg)) {
      return { error: 'The Inspector is currently busy. Please try again in 30 seconds.' }
    }
    console.error('[Gemini runAiReview]', msg)
    return { error: 'AI scan is currently unavailable. Please try again in a moment or fill in the details manually.' }
  }

  // 4. Evaluate AI findings
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const isW9  = doc.type === 'W9'
  const isCOI = doc.type === 'COI'
  const reasons: string[] = []

  if (!isW9) {
    if (!extraction.expiry_date) {
      reasons.push('AI could not extract an expiry date from the document')
    } else {
      const expiryDate = new Date(extraction.expiry_date)
      if (isNaN(expiryDate.getTime())) {
        reasons.push('AI returned an unrecognised date format')
      } else if (expiryDate < today) {
        reasons.push(EXPIRY_REASONS[doc.type] ?? 'Document Expired')
      }
    }
  }

  if (!extraction.company_name) {
    reasons.push('AI could not extract a company name from the document')
  } else if (!namesMatch(extraction.company_name, subName)) {
    reasons.push(`Company mismatch: document belongs to "${extraction.company_name}"`)
  }

  let coverageCheckFailed = false
  if (isCOI) {
    if (extraction.general_liability_each_occurrence === null) {
      coverageCheckFailed = true
      if (extraction.coverage_extraction_detail === 'section_found_no_amount') {
        reasons.push('AI found the Liability section but could not identify a dollar amount')
      } else if (extraction.coverage_extraction_detail === 'amount_unclear') {
        reasons.push('AI found a limit but the text was too blurry to verify')
      } else {
        reasons.push('AI could not locate the General Liability coverage section')
      }
    } else if (extraction.general_liability_each_occurrence < MIN_GENERAL_LIABILITY_USD) {
      const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
      reasons.push(
        `Insufficient Coverage Limits: ${fmt.format(extraction.general_liability_each_occurrence)} extracted, minimum $1,000,000 required`,
      )
    }
  }

  // "Near-miss": name and date passed but coverage limit could not be read — flag for manual review
  const nonCoverageReasonCount = reasons.length - (coverageCheckFailed ? 1 : 0)
  const isPartialExtraction    = isCOI && coverageCheckFailed && nonCoverageReasonCount === 0

  const isRejected          = reasons.length > 0 && !isPartialExtraction
  const newDocStatus        = isPartialExtraction ? 'pending_verification' : (isRejected ? 'rejected' : 'approved')
  const newComplianceStatus = isPartialExtraction ? 'warning'              : (isRejected ? 'non_compliant' : 'compliant')
  const rejectionReason     = isPartialExtraction
    ? 'Date and Name matched, but please manually verify the coverage limit'
    : (isRejected ? reasons.join('; ') : null)

  // 5. Persist AI findings
  const { error: docError } = await supabase
    .from('documents')
    .update(
      !isW9 && extraction.expiry_date
        ? { status: newDocStatus, rejection_reason: rejectionReason, expiry_date: extraction.expiry_date }
        : { status: newDocStatus, rejection_reason: rejectionReason },
    )
    .eq('id', documentId)

  if (docError) return { error: docError.message }

  // If approved, promote this document to current and archive all other versions
  // of the same type for this subcontractor (Golden Rule: only an approval displaces
  // the existing current version).
  if (newDocStatus === 'approved') {
    const { data: toArchive } = await supabase
      .from('documents').select('id')
      .eq('subcontractor_id', doc.subcontractor_id).eq('type', doc.type).neq('id', documentId)

    await supabase.from('documents').update({ is_current: false })
      .eq('subcontractor_id', doc.subcontractor_id).eq('type', doc.type).neq('id', documentId)
    await supabase.from('documents').update({ is_current: true }).eq('id', documentId)

    const archivedIds = (toArchive ?? []).map((d) => d.id)
    if (archivedIds.length > 0) {
      await supabase.from('document_events').insert(
        archivedIds.map((id) => ({
          document_id: id,
          event_type:  'superseded' as const,
          actor:       'System',
          metadata:    { superseded_by: documentId },
        })),
      )
    }
  }

  // Recalculate subcontractor compliance from current documents only.
  const { data: currentDocs } = await supabase
    .from('documents')
    .select('status')
    .eq('subcontractor_id', doc.subcontractor_id)
    .eq('is_current', true)

  const cur = currentDocs ?? []
  const recalcedCompliance =
    cur.some((d) => d.status === 'rejected')                   ? 'non_compliant' :
    cur.length > 0 && cur.every((d) => d.status === 'approved') ? 'compliant'     :
    cur.some((d) => d.status === 'pending_verification')        ? 'warning'       :
    'non_compliant'

  const { error: subError } = await supabase
    .from('subcontractors')
    .update({ compliance_status: recalcedCompliance })
    .eq('id', doc.subcontractor_id)

  if (subError) return { error: subError.message }

  // 6. Record AI review audit event (non-fatal)
  await supabase.from('document_events').insert({
    document_id: documentId,
    event_type:  'ai_review',
    actor:       'AI Inspector',
    metadata:    {
      result:            newDocStatus,
      reason:            rejectionReason,
      extracted_company: extraction.company_name ?? undefined,
      expiry_date:       extraction.expiry_date ?? undefined,
      coverage_amount:   extraction.general_liability_each_occurrence ?? undefined,
    },
  })

  // 7. Send verdict notification email + record last_notified_at
  // Partial extraction: GC sees the pending_verification status in the UI; sub did nothing wrong
  const subEmail = doc.subcontractors?.contact_email
  const resendKey = process.env.RESEND_API_KEY
  if (subEmail && resendKey && !isPartialExtraction) {
    try {
      const { data: project } = await supabase
        .from('projects')
        .select('name')
        .eq('id', projectId)
        .single()

      const projectName = project?.name ?? 'Your Project'
      const baseUrl    = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
      const portalUrl  = `${baseUrl}/subcontractor/portal`
      const resend     = new Resend(resendKey)

      const { error: emailError } = await resend.emails.send({
        from:    'HardHat Compliance <onboarding@resend.dev>',
        to:      subEmail,
        subject: isRejected
          ? `❌ Action Required: Your document was rejected for ${projectName}`
          : `✅ Compliance Confirmed: ${projectName}`,
        html: isRejected
          ? rejectionEmailHtml(subName, projectName, rejectionReason!, portalUrl)
          : approvalEmailHtml(subName, projectName, portalUrl),
      })

      if (!emailError) {
        const now = new Date().toISOString()
        await supabase
          .from('documents')
          .update({ last_notified_at: now })
          .eq('id', documentId)

        await supabase.from('document_events').insert({
          document_id: documentId,
          event_type:  'notification_sent',
          actor:       'System',
          metadata:    { recipient: subEmail },
        })
      }
    } catch {
      // Email failure is non-fatal — AI verdict is already persisted
    }
  }

  revalidatePath(`/gc/projects/${projectId}`)
  revalidatePath('/', 'layout')

  const message = isPartialExtraction
    ? 'Partial Match: Date and Name verified. Please manually confirm the coverage limit.'
    : isRejected
      ? `Document Rejected: ${rejectionReason}`
      : 'Document Approved: All checks passed.'

  return { error: null, status: newDocStatus, message }
}

// ── Notify (simulated) ────────────────────────────────────────

export type NotifyResult = { error: string | null; success?: boolean }

export async function notifySubcontractor(
  subcontractorId: string,
): Promise<NotifyResult> {
  await new Promise<void>((r) => setTimeout(r, 1000))
  return { error: null, success: true }
}

// ── Pre-upload scan (no DB writes) ────────────────────────────

export type ScanResult = {
  error: string | null
  expiry_date?: string | null
  company_name?: string | null
  general_liability_each_occurrence?: number | null
}

export async function scanDocumentFile(formData: FormData): Promise<ScanResult> {
  const file = formData.get('file') as File | null
  if (!file || file.size === 0) return { error: 'No file provided.' }

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) return { error: 'GOOGLE_GENERATIVE_AI_API_KEY is not set.' }

  const base64   = Buffer.from(await file.arrayBuffer()).toString('base64')
  const mimeType = file.type || 'application/pdf'

  try {
    const genAI  = new GoogleGenerativeAI(apiKey)
    const model  = genAI.getGenerativeModel(
      { model: 'gemini-2.5-flash' },
      { apiVersion: 'v1beta' },
    )
    const result = await callGeminiWithTimeout(() =>
      model.generateContent([{ inlineData: { data: base64, mimeType } }, GEMINI_PROMPT])
    )
    const extraction = parseGeminiResponse(result.response.text())
    return { error: null, ...extraction }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('429') || msg.includes('503') || msg.includes('timed out') || /quota|rate.?limit|service.?unavailable|overload/i.test(msg)) {
      return { error: 'AI Scanner is busy. Please try again in 30 seconds.' }
    }
    console.error('[Gemini scanDocumentFile]', msg)
    return { error: 'AI scan is currently unavailable. Please try again in a moment or fill in the details manually.' }
  }
}
