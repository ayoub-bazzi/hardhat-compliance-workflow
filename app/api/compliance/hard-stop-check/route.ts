import { createServiceSupabaseClient } from '@/lib/supabase'
import { sendHardStopRevocation } from '@/lib/notifications'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return Response.json({ error: 'CRON_SECRET is not configured' }, { status: 500 })
  }

  const authHeader = request.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader
  if (token !== cronSecret) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const supabase = createServiceSupabaseClient()

  // All subs at Critical Risk (score ≥ 71)
  const { data: criticalSubs, error } = await supabase
    .from('subcontractors')
    .select('id, organization_id, company_name, contact_email, primary_contact_phone, invite_token, risk_score')
    .gte('risk_score', 71)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  const subs = criticalSubs ?? []
  if (subs.length === 0) {
    return Response.json({ ok: true, checked: 0, revoked: 0, escalated: 0 })
  }

  const subIds = subs.map((s) => s.id)

  // Find subs that already received a hard_stop nudge in the last 22 hours (dedup)
  const dedupCutoff = new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString()
  const { data: recentHardStop } = await supabase
    .from('nudge_logs')
    .select('subcontractor_id')
    .eq('alert_type', 'hard_stop')
    .in('subcontractor_id', subIds)
    .gte('created_at', dedupCutoff)

  const recentlyNotified = new Set(
    (recentHardStop ?? []).map((r) => r.subcontractor_id),
  )

  let revoked = 0
  let escalated = 0

  for (const sub of subs) {
    // ── Send revocation if not already sent in last 22h ─────────
    if (!recentlyNotified.has(sub.id)) {
      await sendHardStopRevocation(supabase, {
        subId:        sub.id,
        orgId:        sub.organization_id,
        companyName:  sub.company_name,
        contactEmail: sub.contact_email,
        contactPhone: sub.primary_contact_phone,
        inviteToken:  sub.invite_token,
        riskScore:    sub.risk_score,
      })
      revoked++
    }

    // ── Escalation check: 48h+ at critical risk ──────────────────
    // Calls the DB function which internally guards against duplicate escalations
    if (sub.organization_id) {
      const { error: escalateError } = await supabase.rpc('create_hard_stop_escalation', {
        p_subcontractor_id: sub.id,
        p_organization_id:  sub.organization_id,
        p_company_name:     sub.company_name,
      })

      if (!escalateError) escalated++
    }
  }

  return Response.json({ ok: true, checked: subs.length, revoked, escalated })
}
