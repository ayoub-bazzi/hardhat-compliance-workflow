import { createServiceSupabaseClient } from '@/lib/supabase'
import { sendCriticalScanAlert } from '@/lib/push-notification'
import type { AccessResult } from '@/types/database.types'

const CRITICAL_RISK_THRESHOLD = 71

export type GateReadinessResult = {
  status: AccessResult
  companyName: string
  reasons: string[]
  checkedAt: string
  logId: string | null
  subcontractorId: string
}

/**
 * Service-role readiness check used by the public gate page.
 * Bypasses RLS intentionally — the HMAC token has already been verified
 * by the caller, and we double-check org ownership here as defence in depth.
 */
export async function checkGateReadiness(
  subcontractorId: string,
  expectedOrgId: string,
): Promise<GateReadinessResult> {
  const supabase = createServiceSupabaseClient()
  const today = new Date().toISOString().split('T')[0]
  const checkedAt = new Date().toISOString()

  // Verify the subcontractor exists and belongs to the org encoded in the token.
  const { data: sub } = await supabase
    .from('subcontractors')
    .select('company_name, organization_id, risk_score, safety_induction_complete')
    .eq('id', subcontractorId)
    .single()

  if (!sub || sub.organization_id !== expectedOrgId) {
    return {
      status: 'DENIED',
      companyName: 'Unknown',
      reasons: ['Subcontractor not found or organisation mismatch.'],
      checkedAt,
      logId: null,
      subcontractorId,
    }
  }

  const reasons: string[] = []

  // Hard stop: safety induction must be complete before any site access
  if (!sub.safety_induction_complete) {
    reasons.push('Safety induction not completed — worker must complete site induction before entry.')
  }

  // Check current compliance documents only (is_current=true guards against
  // superseded rejected/expired docs triggering a false denial).
  const { data: docs } = await supabase
    .from('documents')
    .select('type, status, expiry_date')
    .eq('subcontractor_id', subcontractorId)
    .eq('is_current', true)

  if (!docs || docs.length === 0) {
    reasons.push('No compliance documents on file.')
  } else {
    for (const doc of docs) {
      if (doc.status === 'rejected') {
        reasons.push(`${doc.type} document rejected`)
      } else if (doc.expiry_date && doc.expiry_date < today) {
        reasons.push(`${doc.type} expired ${doc.expiry_date}`)
      }
    }
  }

  const status: AccessResult = reasons.length === 0 ? 'GRANTED' : 'DENIED'

  // Append to immutable audit log. Awaited so we get the row ID for camera capture.
  const { data: logRow } = await supabase
    .from('site_access_logs')
    .insert({
      subcontractor_id: subcontractorId,
      organization_id: expectedOrgId,
      result: status,
      denial_reasons: reasons.length > 0 ? reasons : null,
      gate_location: 'QR Gate',
    })
    .select('id')
    .single()

  // Fire push notification if a critical-risk sub is denied at the gate.
  if (status === 'DENIED' && (sub.risk_score ?? 0) >= CRITICAL_RISK_THRESHOLD) {
    sendCriticalScanAlert(expectedOrgId, sub.company_name, sub.risk_score ?? 0).catch(() => {})
  }

  return {
    status,
    companyName: sub.company_name,
    reasons,
    checkedAt,
    logId: logRow?.id ?? null,
    subcontractorId,
  }
}
