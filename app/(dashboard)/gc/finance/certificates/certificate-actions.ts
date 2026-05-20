'use server'

import { createClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import type { CertStatus } from '@/types/database.types'

const PATHS = ['/gc/finance/certificates', '/gc/finance']

async function getActorName(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<string> {
  const { data } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .single()
  return data?.full_name ?? userId
}

export type ActionResult = { ok: boolean; error?: string }

// ── Review: approve OR escrow based on risk score ─────────────
export async function reviewCertificate(
  certId: string,
  riskScore: number,
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Unauthorized.' }

  const { data: cert } = await supabase
    .from('payment_certificates')
    .select('id, status, subcontractor_id, organization_id, certificate_number, amount_claimed')
    .eq('id', certId)
    .single()

  if (!cert) return { ok: false, error: 'Certificate not found.' }
  if (cert.status !== 'pending') return { ok: false, error: 'Certificate is not pending.' }

  const actor     = await getActorName(supabase, user.id)
  const newStatus: CertStatus = riskScore > 30 ? 'escrowed' : 'approved'
  const holdReason = riskScore > 30
    ? `Risk score ${riskScore} exceeds compliance threshold (30). Funds approved but held until compliance is cleared.`
    : null

  const { error } = await supabase
    .from('payment_certificates')
    .update({
      status:               newStatus,
      hold_reason:          holdReason,
      risk_score_at_review: riskScore,
      reviewed_by:          actor,
      reviewed_at:          new Date().toISOString(),
    })
    .eq('id', certId)

  if (error) return { ok: false, error: error.message }

  await supabase.rpc('fn_log_audit_event', {
    p_subcontractor_id: cert.subcontractor_id,
    p_organization_id:  cert.organization_id,
    p_event_type:       'Payment Update',
    p_description:      newStatus === 'escrowed'
      ? `Certificate ${cert.certificate_number} escrowed by ${actor} — risk score ${riskScore} > 30.`
      : `Certificate ${cert.certificate_number} approved by ${actor} (risk ${riskScore}).`,
    p_actor: actor,
    p_metadata: { cert_id: certId, new_status: newStatus, risk_score: riskScore, amount: cert.amount_claimed },
  })

  PATHS.forEach((p) => revalidatePath(p))
  return { ok: true }
}

// ── Release escrowed certificate ──────────────────────────────
export async function releaseCertificate(
  certId: string,
  overrideReason: string,
): Promise<ActionResult> {
  if (!overrideReason.trim()) return { ok: false, error: 'Release reason is required.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Unauthorized.' }

  const { data: cert } = await supabase
    .from('payment_certificates')
    .select('id, status, subcontractor_id, organization_id, certificate_number, amount_claimed')
    .eq('id', certId)
    .single()

  if (!cert) return { ok: false, error: 'Certificate not found.' }
  if (!['escrowed', 'approved'].includes(cert.status)) {
    return { ok: false, error: 'Certificate cannot be released from its current status.' }
  }

  const actor = await getActorName(supabase, user.id)

  const { error } = await supabase
    .from('payment_certificates')
    .update({
      status:       'released',
      released_by:  actor,
      released_at:  new Date().toISOString(),
    })
    .eq('id', certId)

  if (error) return { ok: false, error: error.message }

  await supabase.rpc('fn_log_audit_event', {
    p_subcontractor_id: cert.subcontractor_id,
    p_organization_id:  cert.organization_id,
    p_event_type:       'Payment Update',
    p_description:      `Certificate ${cert.certificate_number} (${cert.amount_claimed}) released by ${actor}. Reason: "${overrideReason.trim()}"`,
    p_actor: actor,
    p_metadata: { cert_id: certId, override_reason: overrideReason.trim(), amount: cert.amount_claimed },
  })

  PATHS.forEach((p) => revalidatePath(p))
  return { ok: true }
}

// ── Add new certificate ───────────────────────────────────────
export async function addPaymentCertificate(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Unauthorized.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) return { ok: false, error: 'No organisation found.' }

  const subId   = formData.get('subcontractor_id') as string
  const amount  = parseFloat(formData.get('amount_claimed') as string)
  const from    = formData.get('period_from') as string
  const to      = formData.get('period_to') as string
  const certNum = formData.get('certificate_number') as string

  if (!subId || isNaN(amount) || !from || !to || !certNum) {
    return { ok: false, error: 'All fields are required.' }
  }

  const { error } = await supabase
    .from('payment_certificates')
    .insert({
      organization_id:    profile.organization_id,
      subcontractor_id:   subId,
      certificate_number: certNum,
      amount_claimed:     amount,
      period_from:        from,
      period_to:          to,
    })

  if (error) return { ok: false, error: error.message }

  PATHS.forEach((p) => revalidatePath(p))
  return { ok: true }
}
