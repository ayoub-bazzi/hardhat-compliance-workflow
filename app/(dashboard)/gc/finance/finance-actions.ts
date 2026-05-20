'use server'

import { createClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export type ReleaseResult = { ok: boolean; error?: string }

export async function releaseComplianceHold(
  subId: string,
  reason: string,
): Promise<ReleaseResult> {
  if (!reason.trim()) return { ok: false, error: 'Override reason is required.' }

  const supabase = await createClient()

  const { data: sub } = await supabase
    .from('subcontractors')
    .select('id, company_name, organization_id, payment_status')
    .eq('id', subId)
    .single()

  if (!sub) return { ok: false, error: 'Subcontractor not found.' }
  if (sub.payment_status !== 'Compliance Hold') {
    return { ok: false, error: 'Subcontractor is not currently on Compliance Hold.' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('profiles').select('full_name').eq('id', user.id).single()
    : { data: null }

  const actor = profile?.full_name ?? user?.email ?? 'GC Admin'

  const { error } = await supabase
    .from('subcontractors')
    .update({ payment_status: 'Manual Review' })
    .eq('id', subId)

  if (error) return { ok: false, error: error.message }

  await supabase.rpc('fn_log_audit_event', {
    p_subcontractor_id: subId,
    p_organization_id:  sub.organization_id,
    p_event_type:       'Manual Override',
    p_description:      `Compliance Hold manually released by ${actor}. Reason: "${reason.trim()}"`,
    p_actor:            actor,
    p_metadata: {
      action:     'release_compliance_hold',
      reason:     reason.trim(),
      old_status: 'Compliance Hold',
      new_status: 'Manual Review',
    },
  })

  revalidatePath('/gc/finance')
  revalidatePath(`/gc/risk/${subId}`)
  return { ok: true }
}

export type LedgerRow = {
  company_name: string
  contact_email: string
  project_name: string
  risk_score: number
  compliance_status: string
  payment_status: string
  exported_at: string
}

export async function getPaymentLedgerCsv(): Promise<{ csv: string; error?: string }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('subcontractors')
    .select('company_name, contact_email, risk_score, compliance_status, payment_status, projects(name)')
    .eq('payment_status', 'Clear to Pay')
    .order('company_name')

  if (error) return { csv: '', error: error.message }
  if (!data || data.length === 0) return { csv: '' }

  const exportedAt = new Date().toISOString().split('T')[0]

  const headers = [
    'Vendor Name',
    'Email',
    'Project',
    'Risk Score',
    'Compliance Status',
    'Payment Status',
    'Cleared Date',
  ]

  const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`

  const rows = data.map((s) => [
    escape(s.company_name),
    escape(s.contact_email),
    escape((s.projects as { name?: string } | null)?.name ?? ''),
    escape(String(s.risk_score ?? 0)),
    escape(s.compliance_status),
    escape(s.payment_status),
    escape(exportedAt),
  ].join(','))

  const csv = [headers.map(escape).join(','), ...rows].join('\r\n')
  return { csv }
}
