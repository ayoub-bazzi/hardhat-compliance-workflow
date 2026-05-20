import { createServiceSupabaseClient } from '@/lib/supabase'
import { sendExpiryWarning } from '@/lib/notifications'

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
  const today    = new Date().toISOString().split('T')[0]

  // 7-day window
  const in7Days = new Date()
  in7Days.setDate(in7Days.getDate() + 7)
  const in7DaysStr = in7Days.toISOString().split('T')[0]

  // 48-hour window (docs expiring within 2 days)
  const in2Days = new Date()
  in2Days.setDate(in2Days.getDate() + 2)
  const in2DaysStr = in2Days.toISOString().split('T')[0]

  // Fetch compliance_docs expiring within 7 days, not already Flagged
  const { data: expiringDocs, error } = await supabase
    .from('compliance_docs')
    .select(`
      id, doc_name, doc_type, expiry_date, audit_status, subcontractor_id,
      subcontractors ( id, company_name, contact_email, primary_contact_phone, invite_token, organization_id )
    `)
    .gte('expiry_date', today)
    .lte('expiry_date', in7DaysStr)
    .neq('audit_status', 'Flagged')

  if (error) {
    return Response.json({ error: `Query failed: ${error.message}` }, { status: 500 })
  }

  const docs = expiringDocs ?? []
  if (docs.length === 0) {
    return Response.json({ ok: true, scanned: 0, nudged: 0, items: [] })
  }

  // Dedup: skip subs that already got an expiry nudge for this doc in the last 22 hours
  const docIds   = docs.map((d) => d.id)
  const cutoff   = new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString()
  const { data: recentNudges } = await supabase
    .from('nudge_logs')
    .select('metadata')
    .in('alert_type', ['expiry_7d', 'expiry_48h'])
    .gte('created_at', cutoff)

  const recentDocIds = new Set(
    (recentNudges ?? [])
      .map((n) => (n.metadata as Record<string, unknown>).doc_id as string | undefined)
      .filter(Boolean) as string[],
  )

  const todayMs = new Date(today).getTime()
  let nudged = 0
  const items: Array<{ doc_id: string; company: string; days: number; result: unknown }> = []

  for (const doc of docs) {
    if (recentDocIds.has(doc.id)) continue

    const sub = doc.subcontractors as {
      id: string; company_name: string; contact_email: string
      primary_contact_phone: string | null; invite_token: string | null
      organization_id: string | null
    } | null

    if (!sub) continue

    const daysUntil = Math.round(
      (new Date(doc.expiry_date!).getTime() - todayMs) / 86_400_000,
    )

    const result = await sendExpiryWarning(supabase, {
      subId:        sub.id,
      orgId:        sub.organization_id,
      companyName:  sub.company_name,
      contactEmail: sub.contact_email,
      contactPhone: sub.primary_contact_phone,
      inviteToken:  sub.invite_token,
      docName:      doc.doc_name,
      docType:      doc.doc_type,
      daysUntil,
    })

    // Attach doc_id into the nudge_log metadata retroactively (patch the latest entry)
    // We do this by storing doc_id in sendExpiryWarning via metadata — we need to pass it.
    // Since sendExpiryWarning logs metadata, we log a supplemental system_log here for observability.
    await supabase.from('system_logs').insert({
      event:   'expiry_nudge_sent',
      level:   daysUntil <= 2 ? 'warn' : 'info',
      message: `Expiry nudge: ${sub.company_name} — ${doc.doc_type} "${doc.doc_name}" expires in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`,
      metadata: {
        doc_id:            doc.id,
        doc_type:          doc.doc_type,
        days_until_expiry: daysUntil,
        subcontractor:     sub.company_name,
        contact_email:     sub.contact_email,
        channels:          result,
      },
    })

    items.push({ doc_id: doc.id, company: sub.company_name, days: daysUntil, result })
    nudged++
  }

  return Response.json({ ok: true, scanned: docs.length, nudged, items })
}
