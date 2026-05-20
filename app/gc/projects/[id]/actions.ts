'use server'

import { createClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { Resend } from 'resend'
import type { ComplianceStatus, DocumentStatus, DocumentType } from '@/types/database.types'
import { runAiReview } from './ai-actions'

// ── Pre-extracted data hand-off ───────────────────────────────

type PreExtractedData = {
  company_name: string
  expiry_date: string | null
  coverage_limit: number | null
}

const EXPIRY_REASONS_LOCAL: Partial<Record<DocumentType, string>> = {
  'COI':               'Insurance Coverage Expired',
  'Certified Payroll': 'Payroll Certification Expired',
}
const MIN_GENERAL_LIABILITY_USD = 1_000_000

function namesMatchLocal(a: string, b: string): boolean {
  const norm = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim()
  return norm(a) === norm(b)
}

export type SubcontractorActionState = {
  error: string | null
  success?: boolean
}

export type DocumentActionState = {
  error: string | null
  success?: boolean
}

export async function updateSubcontractor(
  subcontractorId: string,
  projectId: string,
  prevState: SubcontractorActionState,
  formData: FormData,
): Promise<SubcontractorActionState> {
  const supabase = await createClient()

  const companyName  = (formData.get('company_name') as string ?? '').trim()
  const contactEmail = (formData.get('contact_email') as string ?? '').trim()

  if (!companyName)  return { error: 'Company name is required.' }
  if (!contactEmail) return { error: 'Contact email is required.' }

  const { error } = await supabase
    .from('subcontractors')
    .update({ company_name: companyName, contact_email: contactEmail })
    .eq('id', subcontractorId)

  if (error) return { error: error.message }

  revalidatePath(`/gc/projects/${projectId}`)
  return { error: null, success: true }
}

export async function deleteSubcontractor(
  subcontractorId: string,
  projectId: string,
): Promise<SubcontractorActionState> {
  const supabase = await createClient()

  // Collect storage paths before deletion
  const { data: docs } = await supabase
    .from('documents')
    .select('file_path')
    .eq('subcontractor_id', subcontractorId)

  const paths = (docs ?? [])
    .map((d) => d.file_path)
    .filter((p): p is string => Boolean(p))

  if (paths.length > 0) {
    await supabase.storage.from('compliance-docs').remove(paths)
  }

  const { error } = await supabase
    .from('subcontractors')
    .delete()
    .eq('id', subcontractorId)

  if (error) return { error: error.message }

  revalidatePath(`/gc/projects/${projectId}`)
  return { error: null, success: true }
}

export async function deleteDocument(
  documentId: string,
  projectId: string,
): Promise<DocumentActionState> {
  const supabase = await createClient()

  const { data: doc } = await supabase
    .from('documents')
    .select('file_path, subcontractor_id, is_current, type')
    .eq('id', documentId)
    .single()

  if (!doc) return { error: 'Document not found.' }

  if (doc.file_path) {
    await supabase.storage.from('compliance-docs').remove([doc.file_path])
  }

  const { error: deleteError } = await supabase
    .from('documents')
    .delete()
    .eq('id', documentId)

  if (deleteError) return { error: deleteError.message }

  // If the deleted doc was current, promote the next best of same type.
  // Priority: Approved > Pending/PendingVerification > Rejected, newest first within each tier.
  if (doc.is_current) {
    let nextDocId: string | null = null
    const tiers: DocumentStatus[][] = [['approved'], ['pending', 'pending_verification'], ['rejected']]
    for (const statuses of tiers) {
      const { data } = await supabase
        .from('documents')
        .select('id')
        .eq('subcontractor_id', doc.subcontractor_id)
        .eq('type', doc.type)
        .in('status', statuses)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (data) { nextDocId = data.id; break }
    }
    if (nextDocId) {
      await supabase.from('documents').update({ is_current: true }).eq('id', nextDocId)
    }
  }

  // Recalculate compliance from current documents only.
  const { data: currentDocs } = await supabase
    .from('documents')
    .select('status')
    .eq('subcontractor_id', doc.subcontractor_id)
    .eq('is_current', true)

  const cur = currentDocs ?? []
  const newStatus: ComplianceStatus =
    cur.some((d) => d.status === 'rejected')              ? 'non_compliant' :
    cur.length > 0 && cur.every((d) => d.status === 'approved') ? 'compliant'     :
    cur.some((d) => d.status === 'pending_verification')  ? 'warning'       :
    'non_compliant'

  await supabase
    .from('subcontractors')
    .update({ compliance_status: newStatus })
    .eq('id', doc.subcontractor_id)

  revalidatePath(`/gc/projects/${projectId}`)
  return { error: null, success: true }
}

export async function addSubcontractor(
  projectId: string,
  prevState: SubcontractorActionState,
  formData: FormData
): Promise<SubcontractorActionState> {
  const supabase = await createClient()

  const companyName  = (formData.get('company_name') as string ?? '').trim()
  const contactEmail = (formData.get('contact_email') as string ?? '').trim()

  if (!companyName)  return { error: 'Company name is required.' }
  if (!contactEmail) return { error: 'Contact email is required.' }

  // Resolve the GC's organization_id so the new record is scoped correctly.
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user!.id)
    .single()

  const organizationId = profile?.organization_id
  if (!organizationId) return { error: 'Organization not found.' }

  const { error } = await supabase.from('subcontractors').insert({
    project_id:        projectId,
    company_name:      companyName,
    contact_email:     contactEmail,
    compliance_status: 'non_compliant',
    organization_id:   organizationId,
  })

  if (error) return { error: error.message }

  revalidatePath(`/gc/projects/${projectId}`)
  return { error: null, success: true }
}

export async function uploadDocument(
  projectId: string,
  prevState: DocumentActionState,
  formData: FormData
): Promise<DocumentActionState> {
  const supabase = await createClient()

  const subcontractorId = (formData.get('subcontractor_id') as string ?? '').trim()
  const documentType    = (formData.get('document_type')    as string ?? '').trim() as DocumentType
  const expiryDate      = (formData.get('expiry_date')      as string ?? '').trim()
  const file            = formData.get('file') as File | null
  const verifiedBy      = (formData.get('verified_by')      as string ?? '').trim()
  const companyName     = (formData.get('company_name')     as string ?? '').trim()
  const isManual        = verifiedBy === 'manual'

  // Parse the pre-extracted data handed off from the client-side scan preview.
  const preExtractedJson = (formData.get('pre_extracted_data') as string | null)?.trim() || null
  let preExtracted: PreExtractedData | null = null
  if (preExtractedJson) {
    try { preExtracted = JSON.parse(preExtractedJson) } catch { /* invalid JSON — fall through to runAiReview */ }
  }

  if (!subcontractorId) return { error: 'Please select a subcontractor.' }
  if (!documentType)    return { error: 'Please select a document type.' }
  if (!file || file.size === 0) return { error: 'Please attach a file.' }

  if (isManual && !companyName) {
    return { error: 'Company name is required for manual entry.' }
  }
  if (isManual && documentType !== 'W9' && !expiryDate) {
    return { error: 'Expiry date is required for manual entry.' }
  }

  const allowed = ['application/pdf', 'image/png', 'image/jpeg']
  if (!allowed.includes(file.type)) {
    return { error: 'Only PDF, PNG, and JPEG files are allowed.' }
  }

  const sanitized = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const filePath  = `${projectId}/${subcontractorId}/${Date.now()}-${sanitized}`

  const { error: uploadError } = await supabase.storage
    .from('compliance-docs')
    .upload(filePath, file, {
      contentType:  file.type,
      cacheControl: '3600',
      upsert:       false,
    })

  if (uploadError) return { error: `Upload failed: ${uploadError.message}` }

  // Fetch organization_id and company_name (needed for name-match check).
  const { data: subRecord } = await supabase
    .from('subcontractors')
    .select('organization_id, company_name')
    .eq('id', subcontractorId)
    .single()

  // ── Determine document status ──────────────────────────────────
  // Three paths:
  //   1. pre_extracted  → evaluate compliance inline; no second AI call
  //   2. manual         → pending_verification; GC reviews later
  //   3. neither        → pending; runAiReview called below (fallback)
  let docStatus    : DocumentStatus    = 'pending'
  let rejection    : string | null     = null
  let subCompliance: ComplianceStatus | null = null

  if (isManual) {
    docStatus = 'pending_verification'
  } else if (preExtracted) {
    // All business rules are re-evaluated server-side. The client cannot skip
    // checks by sending a favourable payload — dates are re-checked against the
    // server clock, coverage against the hard minimum, and the company name
    // against the DB record. The one value a determined GC could spoof is
    // coverage_limit (it isn't editable in the UI but could be tampered via
    // DevTools). The audit event records source:'ai_preextracted' as a paper trail.
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const isW9  = documentType === 'W9'
    const isCOI = documentType === 'COI'
    const reasons: string[] = []
    let coverageCheckFailed = false

    const subName = subRecord?.company_name ?? ''
    if (!preExtracted.company_name) {
      reasons.push('Company name could not be extracted from the document')
    } else if (!namesMatchLocal(preExtracted.company_name, subName)) {
      reasons.push(`Company mismatch: document belongs to "${preExtracted.company_name}"`)
    }

    if (!isW9) {
      if (!preExtracted.expiry_date) {
        reasons.push('No expiry date was provided')
      } else {
        const expiryMs = new Date(preExtracted.expiry_date)
        if (isNaN(expiryMs.getTime())) {
          reasons.push('Expiry date could not be parsed')
        } else if (expiryMs < today) {
          reasons.push(EXPIRY_REASONS_LOCAL[documentType] ?? 'Document Expired')
        }
      }
    }

    if (isCOI) {
      if (preExtracted.coverage_limit === null || preExtracted.coverage_limit === undefined) {
        coverageCheckFailed = true
      } else if (preExtracted.coverage_limit < MIN_GENERAL_LIABILITY_USD) {
        const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
        reasons.push(`Insufficient Coverage: ${fmt.format(preExtracted.coverage_limit)} extracted, minimum $1,000,000 required`)
      }
    }

    const nonCoverageCount = reasons.length - (coverageCheckFailed ? 1 : 0)
    const isPartial        = isCOI && coverageCheckFailed && nonCoverageCount === 0
    const isRejected       = reasons.length > 0 && !isPartial

    docStatus     = isPartial ? 'pending_verification' : (isRejected ? 'rejected' : 'approved')
    rejection     = isPartial
      ? 'Date and Name matched, but please manually verify the coverage limit'
      : isRejected ? reasons.join('; ') : null
    subCompliance = isPartial ? 'warning' : (isRejected ? 'non_compliant' : 'compliant')
  }

  const storedExpiry = preExtracted
    ? (preExtracted.expiry_date || null)
    : (expiryDate || null)

  // ── Golden Rule: determine is_current for the new document ────
  // An existing APPROVED current version holds the slot until the new doc
  // is itself approved. Any other status (rejected, pending, etc.) does not
  // protect the slot — the new upload takes over immediately.
  const { data: existingApprovedCurrent } = await supabase
    .from('documents')
    .select('id')
    .eq('subcontractor_id', subcontractorId)
    .eq('type', documentType)
    .eq('is_current', true)
    .eq('status', 'approved')
    .limit(1)

  const hasApprovedCurrent = (existingApprovedCurrent?.length ?? 0) > 0

  let initialIsCurrent: boolean
  let uploadArchivedIds: string[] = []

  if (preExtracted && docStatus === 'approved') {
    // New doc resolves to approved → claim current slot unconditionally.
    const { data: toArchive } = await supabase
      .from('documents').select('id')
      .eq('subcontractor_id', subcontractorId).eq('type', documentType)
    uploadArchivedIds = (toArchive ?? []).map((d) => d.id)
    await supabase.from('documents').update({ is_current: false })
      .eq('subcontractor_id', subcontractorId).eq('type', documentType)
    initialIsCurrent = true
  } else if (hasApprovedCurrent) {
    // Golden Rule: protect the safety — new upload is a renewal-in-progress.
    initialIsCurrent = false
  } else {
    // No approved doc to protect → new doc claims the current slot.
    const { data: toArchive } = await supabase
      .from('documents').select('id')
      .eq('subcontractor_id', subcontractorId).eq('type', documentType)
    uploadArchivedIds = (toArchive ?? []).map((d) => d.id)
    await supabase.from('documents').update({ is_current: false })
      .eq('subcontractor_id', subcontractorId).eq('type', documentType)
    initialIsCurrent = true
  }

  const { data: insertedDoc, error: dbError } = await supabase
    .from('documents')
    .insert({
      subcontractor_id: subcontractorId,
      type:             documentType,
      status:           docStatus,
      rejection_reason: rejection,
      expiry_date:      storedExpiry,
      file_path:        filePath,
      organization_id:  subRecord?.organization_id ?? null,
      is_current:       initialIsCurrent,
    })
    .select('id')
    .single()

  if (dbError) {
    await supabase.storage.from('compliance-docs').remove([filePath])
    return { error: dbError.message }
  }

  const { data: { user } } = await supabase.auth.getUser()

  const eventMeta = isManual
    ? { company_name: companyName, source: 'manual_entry' }
    : preExtracted
      ? { result: docStatus as 'approved' | 'rejected' | 'pending_verification', reason: rejection, source: 'ai_preextracted' }
      : {}

  const newDocId = insertedDoc!.id

  await supabase.from('document_events').insert({
    document_id: newDocId,
    event_type:  isManual ? 'manual_override' : 'uploaded',
    actor:       user?.email ?? null,
    metadata:    eventMeta,
  })

  if (uploadArchivedIds.length > 0) {
    await supabase.from('document_events').insert(
      uploadArchivedIds.map((id) => ({
        document_id: id,
        event_type:  'superseded' as const,
        actor:       'System',
        metadata:    { superseded_by: newDocId },
      })),
    )
  }

  if (isManual || preExtracted) {
    // Recalculate from current docs only — archived/superseded versions don't
    // affect the subcontractor's compliance standing.
    const { data: currentDocs } = await supabase
      .from('documents')
      .select('status')
      .eq('subcontractor_id', subcontractorId)
      .eq('is_current', true)

    const cur = currentDocs ?? []
    const newComplianceStatus: ComplianceStatus =
      cur.some((d) => d.status === 'rejected')                   ? 'non_compliant' :
      cur.length > 0 && cur.every((d) => d.status === 'approved') ? 'compliant'     :
      cur.some((d) => d.status === 'pending_verification')        ? 'warning'       :
      'non_compliant'

    await supabase
      .from('subcontractors')
      .update({ compliance_status: newComplianceStatus })
      .eq('id', subcontractorId)

    revalidatePath(`/gc/projects/${projectId}`)
    revalidatePath('/', 'layout')
  } else {
    // No pre-extracted data — fall back to full AI review.
    // This path is a safety net; the dialog always sends pre_extracted_data in review phase.
    try {
      await runAiReview(insertedDoc!.id, projectId)
    } catch {
      // AI unavailable — document stays 'pending'; GC can trigger review manually.
    } finally {
      revalidatePath(`/gc/projects/${projectId}`)
      revalidatePath('/', 'layout')
    }
  }

  return { error: null, success: true }
}

export async function getDocumentDownloadUrl(
  documentId: string
): Promise<{ url: string | null; error: string | null }> {
  const supabase = await createClient()

  const { data: doc } = await supabase
    .from('documents')
    .select('file_path')
    .eq('id', documentId)
    .single()

  if (!doc?.file_path) return { url: null, error: 'Document not found.' }

  const { data, error } = await supabase.storage
    .from('compliance-docs')
    .createSignedUrl(doc.file_path, 3600)

  if (error) return { url: null, error: error.message }

  return { url: data.signedUrl, error: null }
}

export type InviteActionState = {
  error: string | null
  success?: boolean
  sentTo?: string
}

export async function sendInviteEmail(
  projectId: string,
  subcontractorId: string,
): Promise<InviteActionState> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const [profileResult, subResult, projectResult] = await Promise.all([
    supabase.from('profiles').select('company_name, full_name').eq('id', user.id).single(),
    supabase.from('subcontractors').select('company_name, contact_email').eq('id', subcontractorId).single(),
    supabase.from('projects').select('name').eq('id', projectId).single(),
  ])

  if (!subResult.data) return { error: 'Subcontractor not found.' }
  if (!projectResult.data) return { error: 'Project not found.' }

  const gcName      = profileResult.data?.company_name ?? profileResult.data?.full_name ?? 'Your General Contractor'
  const subName     = subResult.data.company_name
  const subEmail    = subResult.data.contact_email
  const projectName = projectResult.data.name

  // ── Generate magic-link token ─────────────────────────────────
  const { randomBytes } = await import('crypto')
  const inviteToken   = randomBytes(32).toString('hex')
  const expiresAt     = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  const { error: tokenError } = await supabase
    .from('subcontractors')
    .update({ invite_token: inviteToken, invite_expires_at: expiresAt.toISOString() })
    .eq('id', subcontractorId)

  if (tokenError) return { error: `Could not create invite token: ${tokenError.message}` }

  const baseUrl   = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const portalUrl = `${baseUrl}/portal/upload/${inviteToken}`
  const expiryStr = expiresAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  const resend = new Resend(process.env.RESEND_API_KEY)

  const { error } = await resend.emails.send({
    from: 'HardHat Compliance <onboarding@resend.dev>',
    to: subEmail,
    subject: `Action Required: Compliance Verification for ${projectName}`,
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Compliance Verification Required — ${projectName}</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#1e293b;border-radius:12px 12px 0 0;padding:32px 40px;text-align:center;border:1px solid #334155;border-bottom:none;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align:center;">
                    <div style="display:inline-block;background:#334155;border-radius:10px;padding:10px 14px;margin-bottom:16px;">
                      <span style="font-size:22px;">🏗️</span>
                    </div>
                    <h1 style="margin:0 0 4px;color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-0.5px;">HardHat Compliance</h1>
                    <p style="margin:0;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Secure Document Portal</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Alert bar -->
          <tr>
            <td style="background:#b45309;padding:10px 40px;border-left:1px solid #334155;border-right:1px solid #334155;">
              <p style="margin:0;color:#fef3c7;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-align:center;">
                ⚠ Action Required — Site Access Depends on This
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#1e293b;padding:40px 40px 32px;border-left:1px solid #334155;border-right:1px solid #334155;">
              <h2 style="margin:0 0 6px;color:#f8fafc;font-size:22px;font-weight:700;line-height:1.3;">
                Compliance Verification<br/>for <span style="color:#f59e0b;">${projectName}</span>
              </h2>
              <p style="margin:0 0 28px;color:#94a3b8;font-size:14px;">Requested by <strong style="color:#cbd5e1;">${gcName}</strong></p>

              <p style="margin:0 0 20px;color:#94a3b8;font-size:15px;line-height:1.75;">
                Hi <strong style="color:#e2e8f0;">${subName}</strong>,<br/><br/>
                To work on <strong style="color:#e2e8f0;">${projectName}</strong>, you must submit your compliance documents. Our AI engine reviews each document instantly — the whole process takes less than 3 minutes.
              </p>

              <!-- Required documents list -->
              <div style="background:#0f172a;border-radius:8px;padding:20px 24px;margin:0 0 28px;border:1px solid #334155;">
                <p style="margin:0 0 12px;color:#f59e0b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Required Documents</p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:6px 0;border-bottom:1px solid #1e293b;">
                      <span style="color:#22c55e;font-size:14px;margin-right:8px;">✓</span>
                      <span style="color:#e2e8f0;font-size:14px;font-weight:600;">Certificate of Insurance (COI)</span>
                      <span style="color:#64748b;font-size:12px;margin-left:8px;">Min. $1M general liability</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;border-bottom:1px solid #1e293b;">
                      <span style="color:#22c55e;font-size:14px;margin-right:8px;">✓</span>
                      <span style="color:#e2e8f0;font-size:14px;font-weight:600;">Trade License</span>
                      <span style="color:#64748b;font-size:12px;margin-left:8px;">Current &amp; valid</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;">
                      <span style="color:#64748b;font-size:14px;margin-right:8px;">○</span>
                      <span style="color:#94a3b8;font-size:14px;">Golden Thread Document</span>
                      <span style="color:#475569;font-size:12px;margin-left:8px;">Optional</span>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
                <tr>
                  <td style="background:#f59e0b;border-radius:10px;box-shadow:0 4px 14px rgba(245,158,11,0.4);">
                    <a href="${portalUrl}" style="display:inline-block;padding:16px 40px;color:#0f172a;font-size:16px;font-weight:800;text-decoration:none;letter-spacing:-0.2px;">
                      Submit Documents Now →
                    </a>
                  </td>
                </tr>
              </table>

              <div style="background:#0f172a;border-radius:6px;padding:12px 16px;border-left:3px solid #f59e0b;">
                <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">
                  🔒 <strong style="color:#cbd5e1;">This is a unique, secure link.</strong> It expires on <strong style="color:#e2e8f0;">${expiryStr}</strong> and works only for your submission. Do not share it.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0f172a;border:1px solid #334155;border-top:none;border-radius:0 0 12px 12px;padding:24px 40px;text-align:center;">
              <p style="margin:0;color:#475569;font-size:12px;line-height:1.7;">
                Sent by <strong style="color:#64748b;">${gcName}</strong> via HardHat Compliance.<br/>
                Questions? Reply to this email or contact your GC directly.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  })

  if (error) return { error: error.message }

  return { error: null, success: true, sentTo: subEmail }
}
