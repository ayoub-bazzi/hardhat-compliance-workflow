'use server'

import { createClient } from '@/lib/supabase'
import type { AccessResult } from '@/types/database.types'

export type SiteReadinessResult = {
  status: AccessResult
  subcontractorName: string
  reasons: string[]
}

/**
 * Hard-Stop brain: evaluates whether a subcontractor may access the site.
 * DENIED if they have any expired compliance_docs, any Flagged compliance_docs,
 * or (fallback) any expired/rejected documents in the legacy documents table.
 * Every call is logged to site_access_logs for audit.
 */
export async function calculateSiteReadiness(
  subcontractorId: string,
  gateLocation?: string,
  qrPayload?: string,
): Promise<SiteReadinessResult> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: sub } = await supabase
    .from('subcontractors')
    .select('company_name, compliance_status')
    .eq('id', subcontractorId)
    .single()

  if (!sub) {
    return {
      status: 'DENIED',
      subcontractorName: 'Unknown',
      reasons: ['Subcontractor record not found — access blocked.'],
    }
  }

  const reasons: string[] = []

  // Primary source: compliance_docs (Insurance Vault)
  const { data: complianceDocs } = await supabase
    .from('compliance_docs')
    .select('doc_name, doc_type, audit_status, expiry_date')
    .eq('subcontractor_id', subcontractorId)

  if (complianceDocs && complianceDocs.length > 0) {
    for (const doc of complianceDocs) {
      if (doc.audit_status === 'Flagged') {
        reasons.push(`${doc.doc_type} "${doc.doc_name}" is flagged for review`)
      } else if (doc.expiry_date && doc.expiry_date < today) {
        reasons.push(`${doc.doc_type} "${doc.doc_name}" expired ${doc.expiry_date}`)
      }
    }
  } else {
    // Fallback: legacy documents table
    const { data: docs } = await supabase
      .from('documents')
      .select('type, status, expiry_date')
      .eq('subcontractor_id', subcontractorId)

    if (!docs || docs.length === 0) {
      reasons.push('No compliance documents on file — access blocked until documents are uploaded and verified.')
    } else {
      for (const doc of docs) {
        if (doc.status === 'rejected') {
          reasons.push(`${doc.type} document is rejected`)
        } else if (doc.expiry_date && doc.expiry_date < today) {
          reasons.push(`${doc.type} expired ${doc.expiry_date}`)
        }
      }
    }
  }

  const status: AccessResult = reasons.length === 0 ? 'GRANTED' : 'DENIED'

  // Get current user for the log
  const { data: { user } } = await supabase.auth.getUser()

  // Append to immutable audit log — fire and forget, non-blocking
  supabase.from('site_access_logs').insert({
    subcontractor_id: subcontractorId,
    result: status,
    denial_reasons: reasons.length > 0 ? reasons : null,
    scanned_by: user?.id ?? null,
    gate_location: gateLocation ?? null,
    qr_payload: qrPayload ?? null,
  }).then(() => {})

  return { status, subcontractorName: sub.company_name, reasons }
}
