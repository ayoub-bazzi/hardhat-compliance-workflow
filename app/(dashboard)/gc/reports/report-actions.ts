'use server'

import { createClient } from '@/lib/supabase'

export type ReportData = {
  orgName: string
  generatedAt: string
  dateFrom: string
  dateTo: string
  metrics: {
    totalSubs: number
    compliantSubs: number
    nonCompliantSubs: number
    globalCompliancePct: number
    totalGranted: number
    totalDenied: number
    totalExpiringDocs: number
    inductedSubs: number
  }
  topRisks: Array<{
    company_name: string
    project_name: string
    compliance_status: string
    risk_score: number
  }>
  attendance: Array<{
    scan_date: string
    granted_count: number
    denied_count: number
  }>
  auditTrail: Array<{
    created_at: string
    event_type: string
    actor: string
    description: string
  }>
}

export async function fetchReportData(dateFrom: string, dateTo: string): Promise<{ ok: true; data: ReportData } | { ok: false; error: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Unauthorized.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, company_name')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) return { ok: false, error: 'No organisation found.' }
  const orgId = profile.organization_id

  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', orgId)
    .single()

  const today = new Date().toISOString().split('T')[0]
  const in30Days = new Date()
  in30Days.setDate(in30Days.getDate() + 30)
  const in30DaysStr = in30Days.toISOString().split('T')[0]

  const [subsRes, topRisksRes, attendanceRes, auditRes, expiringRes] = await Promise.all([
    supabase
      .from('subcontractors')
      .select('compliance_status, risk_score, safety_induction_complete')
      .eq('organization_id', orgId),
    supabase
      .from('subcontractor_leaderboard')
      .select('company_name, project_name, compliance_status, risk_score, rank')
      .order('rank', { ascending: false })
      .limit(10),
    supabase
      .from('site_access_logs')
      .select('result, created_at')
      .eq('organization_id', orgId)
      .gte('created_at', dateFrom + 'T00:00:00.000Z')
      .lte('created_at', dateTo + 'T23:59:59.999Z'),
    supabase
      .from('audit_events')
      .select('created_at, event_type, actor, description')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('documents')
      .select('id')
      .eq('status', 'approved')
      .not('expiry_date', 'is', null)
      .gte('expiry_date', today)
      .lte('expiry_date', in30DaysStr),
  ])

  const subs = subsRes.data ?? []
  const compliantSubs    = subs.filter((s) => s.compliance_status === 'compliant').length
  const nonCompliantSubs = subs.filter((s) => s.compliance_status === 'non_compliant').length
  const inductedSubs     = subs.filter((s) => s.safety_induction_complete).length
  const globalCompliancePct = subs.length > 0 ? Math.round((compliantSubs / subs.length) * 100) : 100

  // Aggregate attendance by day
  const byDay: Record<string, { granted: number; denied: number }> = {}
  for (const log of attendanceRes.data ?? []) {
    const day = log.created_at.split('T')[0]
    if (!byDay[day]) byDay[day] = { granted: 0, denied: 0 }
    if (log.result === 'GRANTED') byDay[day].granted++
    else byDay[day].denied++
  }
  const attendance = Object.entries(byDay)
    .map(([scan_date, v]) => ({ scan_date, granted_count: v.granted, denied_count: v.denied }))
    .sort((a, b) => a.scan_date.localeCompare(b.scan_date))

  const totalGranted = attendance.reduce((s, d) => s + d.granted_count, 0)
  const totalDenied  = attendance.reduce((s, d) => s + d.denied_count, 0)

  return {
    ok: true,
    data: {
      orgName: org?.name ?? profile.company_name ?? 'Your Organisation',
      generatedAt: new Date().toISOString(),
      dateFrom,
      dateTo,
      metrics: {
        totalSubs: subs.length,
        compliantSubs,
        nonCompliantSubs,
        globalCompliancePct,
        totalGranted,
        totalDenied,
        totalExpiringDocs: (expiringRes.data ?? []).length,
        inductedSubs,
      },
      topRisks: (topRisksRes.data ?? []).map((r) => ({
        company_name: r.company_name,
        project_name: r.project_name,
        compliance_status: r.compliance_status,
        risk_score: r.risk_score,
      })),
      attendance,
      auditTrail: (auditRes.data ?? []).map((e) => ({
        created_at: e.created_at,
        event_type: e.event_type,
        actor: e.actor,
        description: e.description,
      })),
    },
  }
}

export type AuditCsvRow = {
  id: string
  created_at: string
  event_type: string
  actor: string
  description: string
  subcontractor_id: string | null
}

export async function fetchAuditCsvData(): Promise<{ ok: true; rows: AuditCsvRow[] } | { ok: false; error: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Unauthorized.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) return { ok: false, error: 'No organisation found.' }

  const { data, error } = await supabase
    .from('audit_events')
    .select('id, created_at, event_type, actor, description, subcontractor_id')
    .eq('organization_id', profile.organization_id)
    .order('created_at', { ascending: false })

  if (error) return { ok: false, error: error.message }
  return { ok: true, rows: (data ?? []) as AuditCsvRow[] }
}
