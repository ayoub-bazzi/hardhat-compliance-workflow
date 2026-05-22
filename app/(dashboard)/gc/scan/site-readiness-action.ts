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
    .select('company_name, compliance_status, organization_id')
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

  // Check current documents only — is_current=true guards against superseded
  // rejected/expired docs causing false denials after a new version was approved.
  const { data: docs } = await supabase
    .from('documents')
    .select('type, status, expiry_date')
    .eq('subcontractor_id', subcontractorId)
    .eq('is_current', true)

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

  const status: AccessResult = reasons.length === 0 ? 'GRANTED' : 'DENIED'

  // Append to immutable audit log — fire and forget, non-blocking
  supabase.from('site_access_logs').insert({
    subcontractor_id: subcontractorId,
    organization_id:  sub.organization_id ?? undefined,
    result:           status,
    denial_reasons:   reasons.length > 0 ? reasons : null,
    gate_location:    gateLocation ?? null,
    qr_payload:       qrPayload ?? null,
  }).then(() => {})

  return { status, subcontractorName: sub.company_name, reasons }
}
