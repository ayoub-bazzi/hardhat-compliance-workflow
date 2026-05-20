import { Resend } from 'resend'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, NotificationLogType, NotificationChannel, NotificationStatus } from '@/types/database.types'

type DBClient = SupabaseClient<Database>

// ── Types ──────────────────────────────────────────────────────

export type WatchdogSummary = {
  expiryWarnings: { scanned: number; sent: number; skipped_cooldown: number }
  auditRejections: { scanned: number; sent: number; skipped_cooldown: number }
  error: string | null
}

type SubRow = {
  id: string
  company_name: string
  contact_email: string
  primary_contact_phone: string | null
  invite_token: string | null
  organization_id: string | null
  project_id: string
}

type ExpiringDocRow = {
  id: string
  doc_name: string
  doc_type: string
  expiry_date: string
  subcontractors: SubRow | null
}

type FlaggedDocRow = {
  id: string
  doc_name: string
  doc_type: string
  updated_at: string
  subcontractors: SubRow | null
}

// ── Cooldown guard ─────────────────────────────────────────────
// The 72-hour window prevents the same subcontractor from receiving
// the same notification type more than once in a 72-hour period —
// regardless of how many documents triggered it.

async function isOnCooldown(
  supabase: DBClient,
  subId: string,
  type: NotificationLogType,
): Promise<boolean> {
  const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()
  const { data } = await supabase
    .from('notification_logs')
    .select('id')
    .eq('subcontractor_id', subId)
    .eq('type', type)
    .gte('sent_at', cutoff)
    .limit(1)
  return (data ?? []).length > 0
}

async function recordNotification(
  supabase: DBClient,
  subId: string,
  orgId: string | null,
  type: NotificationLogType,
  channel: NotificationChannel,
  recipient: string,
  status: NotificationStatus,
  metadata: Record<string, unknown>,
): Promise<void> {
  await supabase.from('notification_logs').insert({
    subcontractor_id: subId,
    organization_id: orgId ?? undefined,
    type,
    channel,
    recipient,
    status,
    metadata,
  })
}

// ── Golden Thread ──────────────────────────────────────────────

async function logToGoldenThread(
  supabase: DBClient,
  subId: string,
  orgId: string | null,
  type: NotificationLogType,
  description: string,
): Promise<void> {
  await supabase.rpc('fn_log_audit_event', {
    p_subcontractor_id: subId,
    p_organization_id:  orgId,
    p_event_type:       'Nudge Sent',
    p_description:      description,
    p_actor:            'Compliance Watchdog',
    p_metadata:         { notification_type: type },
  })
}

// ── Portal URL ─────────────────────────────────────────────────

function portalUrl(token: string | null): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  return token ? `${base}/portal/upload/${token}` : `${base}/subcontractor/portal`
}

// ── Email templates ────────────────────────────────────────────

function buildWatchdogEmailHtml({
  badge, badgeBg, badgeBorder, badgeText,
  headline, subline, bodyHtml, ctaBg, ctaLabel,
  companyName, portalLink,
}: {
  badge: string; badgeBg: string; badgeBorder: string; badgeText: string
  headline: string; subline: string; bodyHtml: string
  ctaBg: string; ctaLabel: string
  companyName: string; portalLink: string
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:#0f172a;border-radius:12px 12px 0 0;padding:28px 40px;text-align:center;">
            <p style="margin:0;font-size:26px;">🏗️</p>
            <h1 style="margin:8px 0 0;color:#fff;font-size:18px;font-weight:700;letter-spacing:-0.2px;">HardHat Compliance</h1>
            <p style="margin:4px 0 0;color:#94a3b8;font-size:12px;">Automated Compliance Concierge</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="background:#fff;padding:40px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
            <span style="display:inline-block;background:${badgeBg};border:1px solid ${badgeBorder};border-radius:6px;padding:7px 14px;color:${badgeText};font-size:12px;font-weight:700;letter-spacing:0.4px;margin-bottom:24px;">${badge}</span>
            <h2 style="margin:0 0 8px;color:#0f172a;font-size:22px;font-weight:800;line-height:1.3;">${headline}</h2>
            <p style="margin:0 0 4px;color:#475569;font-size:14px;font-weight:600;">${companyName}</p>
            <p style="margin:0 0 24px;color:#64748b;font-size:14px;line-height:1.75;">${subline}</p>
            <div style="background:#fff7ed;border:1px solid #fed7aa;border-left:4px solid #f97316;border-radius:8px;padding:16px 20px;margin-bottom:28px;">
              <p style="margin:0;color:#9a3412;font-size:14px;line-height:1.75;">${bodyHtml}</p>
            </div>
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:${ctaBg};border-radius:8px;">
                  <a href="${portalLink}" style="display:inline-block;padding:13px 30px;color:#fff;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:-0.1px;">${ctaLabel} →</a>
                </td>
              </tr>
            </table>
            <p style="margin:22px 0 0;color:#94a3b8;font-size:12px;line-height:1.6;">
              If the button doesn't work, copy this link:<br/>
              <a href="${portalLink}" style="color:#d97706;word-break:break-all;">${portalLink}</a>
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:18px 40px;text-align:center;">
            <p style="margin:0;color:#94a3b8;font-size:11px;line-height:1.6;">
              Automated alert from HardHat Compliance — recorded in the Golden Thread audit ledger.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function expiryWarningEmail(
  companyName: string,
  projectName: string,
  docType: string,
  docName: string,
  daysUntil: number,
  link: string,
): { subject: string; html: string } {
  const urgent = daysUntil <= 3
  const subject = urgent
    ? `🚨 Final Warning: Your ${docType} expires in ${daysUntil} day${daysUntil !== 1 ? 's' : ''} — ${projectName}`
    : `⚠️ Site Access at Risk: ${docType} expires in ${daysUntil} days — ${projectName}`

  const html = buildWatchdogEmailHtml({
    badge:       urgent ? '🚨 URGENT — FINAL EXPIRY WARNING' : '⚠️ EXPIRY WARNING',
    badgeBg:     urgent ? '#fef2f2' : '#fefce8',
    badgeBorder: urgent ? '#fca5a5' : '#fef08a',
    badgeText:   urgent ? '#b91c1c' : '#854d0e',
    headline:    `Your access to ${projectName} is at risk`,
    subline:     `Your <strong>${docType}</strong> expires in <strong>${daysUntil} day${daysUntil !== 1 ? 's' : ''}</strong>. Upload your renewed certificate now to avoid losing site access.`,
    bodyHtml:    urgent
      ? `<strong>Document:</strong> ${docName}<br/><strong>Project:</strong> ${projectName}<br/><strong>Time remaining:</strong> ${daysUntil} day${daysUntil !== 1 ? 's' : ''}<br/><br/>This is your final warning. If the document is not renewed before expiry, your site access pass will be <strong>automatically revoked</strong> and a Compliance Hold will be placed on pending payments.`
      : `<strong>Document:</strong> ${docName}<br/><strong>Project:</strong> ${projectName}<br/><strong>Time remaining:</strong> ${daysUntil} days<br/><br/>Please upload a renewed certificate as soon as possible. AI verification takes less than 30 seconds.`,
    ctaBg:       urgent ? '#dc2626' : '#d97706',
    ctaLabel:    'Upload Renewed Certificate',
    companyName,
    portalLink:  link,
  })

  return { subject, html }
}

function auditRejectionEmail(
  companyName: string,
  projectName: string,
  docType: string,
  docName: string,
  link: string,
): { subject: string; html: string } {
  const subject = `🚨 Document Rejected: ${docName} — immediate action required`

  const html = buildWatchdogEmailHtml({
    badge:       '🚨 AI COMPLIANCE FAILURE',
    badgeBg:     '#fef2f2',
    badgeBorder: '#fca5a5',
    badgeText:   '#b91c1c',
    headline:    `A ${docType} has been rejected`,
    subline:     `Your <strong>${docName}</strong> for <strong>${projectName}</strong> was flagged during AI compliance review and must be replaced.`,
    bodyHtml:    `<strong>Document:</strong> ${docName}<br/><strong>Type:</strong> ${docType}<br/><strong>Project:</strong> ${projectName}<br/><br/>Site access will be <strong>blocked</strong> until a compliant replacement document is uploaded. Upload a corrected version now — AI re-verification takes under 30 seconds. Your General Contractor has been notified.`,
    ctaBg:       '#dc2626',
    ctaLabel:    'Upload Corrected Document',
    companyName,
    portalLink:  link,
  })

  return { subject, html }
}

// ── Pass 1: Expiry Warning (15-day window) ─────────────────────

async function runExpiryWarningPass(
  supabase: DBClient,
  resend: Resend,
): Promise<WatchdogSummary['expiryWarnings']> {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const in15 = new Date(today)
  in15.setDate(in15.getDate() + 15)
  const in15Str = in15.toISOString().split('T')[0]

  const { data: rawDocs } = await supabase
    .from('compliance_docs')
    .select(`
      id, doc_name, doc_type, expiry_date,
      subcontractors (
        id, company_name, contact_email, primary_contact_phone,
        invite_token, organization_id, project_id
      )
    `)
    .neq('audit_status', 'Flagged')
    .not('expiry_date', 'is', null)
    .gte('expiry_date', todayStr)
    .lte('expiry_date', in15Str)

  const docs = (rawDocs ?? []) as unknown as ExpiringDocRow[]

  // Resolve project names in one query
  const projectIds = [...new Set(
    docs.map((d) => d.subcontractors?.project_id).filter(Boolean) as string[]
  )]
  const { data: projects } = projectIds.length > 0
    ? await supabase.from('projects').select('id, name').in('id', projectIds)
    : { data: [] }
  const projectMap: Record<string, string> = Object.fromEntries(
    (projects ?? []).map((p) => [p.id, p.name])
  )

  let sent = 0
  let skipped_cooldown = 0

  for (const doc of docs) {
    const sub = doc.subcontractors
    if (!sub) continue

    const onCooldown = await isOnCooldown(supabase, sub.id, 'EXPIRY_WARNING')
    if (onCooldown) { skipped_cooldown++; continue }

    const daysUntil = Math.round(
      (new Date(doc.expiry_date).getTime() - today.getTime()) / 86_400_000
    )
    const projectName = projectMap[sub.project_id] ?? 'Your Project'
    const link = portalUrl(sub.invite_token)
    const { subject, html } = expiryWarningEmail(
      sub.company_name, projectName, doc.doc_type, doc.doc_name, daysUntil, link
    )

    const { error } = await resend.emails.send({
      from:    'HardHat Compliance <onboarding@resend.dev>',
      to:      sub.contact_email,
      subject,
      html,
    })

    const status: NotificationStatus = error ? 'failed' : 'sent'

    await recordNotification(supabase, sub.id, sub.organization_id, 'EXPIRY_WARNING', 'EMAIL',
      sub.contact_email, status,
      { doc_id: doc.id, doc_name: doc.doc_name, doc_type: doc.doc_type, days_until: daysUntil, project: projectName }
    )

    if (!error) {
      await logToGoldenThread(
        supabase, sub.id, sub.organization_id, 'EXPIRY_WARNING',
        `Expiry warning sent to ${sub.contact_email} — "${doc.doc_name}" expires in ${daysUntil} day${daysUntil !== 1 ? 's' : ''} (${projectName}).`,
      )
      sent++
    }
  }

  return { scanned: docs.length, sent, skipped_cooldown }
}

// ── Pass 2: Audit Rejection (recently flagged, 24h window) ────

async function runAuditRejectionPass(
  supabase: DBClient,
  resend: Resend,
): Promise<WatchdogSummary['auditRejections']> {
  const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: rawDocs } = await supabase
    .from('compliance_docs')
    .select(`
      id, doc_name, doc_type, updated_at,
      subcontractors (
        id, company_name, contact_email, primary_contact_phone,
        invite_token, organization_id, project_id
      )
    `)
    .eq('audit_status', 'Flagged')
    .gte('updated_at', cutoff24h)

  const docs = (rawDocs ?? []) as unknown as FlaggedDocRow[]

  const projectIds = [...new Set(
    docs.map((d) => d.subcontractors?.project_id).filter(Boolean) as string[]
  )]
  const { data: projects } = projectIds.length > 0
    ? await supabase.from('projects').select('id, name').in('id', projectIds)
    : { data: [] }
  const projectMap: Record<string, string> = Object.fromEntries(
    (projects ?? []).map((p) => [p.id, p.name])
  )

  let sent = 0
  let skipped_cooldown = 0

  for (const doc of docs) {
    const sub = doc.subcontractors
    if (!sub) continue

    const onCooldown = await isOnCooldown(supabase, sub.id, 'AUDIT_REJECTION')
    if (onCooldown) { skipped_cooldown++; continue }

    const projectName = projectMap[sub.project_id] ?? 'Your Project'
    const link = portalUrl(sub.invite_token)
    const { subject, html } = auditRejectionEmail(
      sub.company_name, projectName, doc.doc_type, doc.doc_name, link
    )

    const { error } = await resend.emails.send({
      from:    'HardHat Compliance <onboarding@resend.dev>',
      to:      sub.contact_email,
      subject,
      html,
    })

    const status: NotificationStatus = error ? 'failed' : 'sent'

    await recordNotification(supabase, sub.id, sub.organization_id, 'AUDIT_REJECTION', 'EMAIL',
      sub.contact_email, status,
      { doc_id: doc.id, doc_name: doc.doc_name, doc_type: doc.doc_type, project: projectName }
    )

    if (!error) {
      await logToGoldenThread(
        supabase, sub.id, sub.organization_id, 'AUDIT_REJECTION',
        `Audit rejection alert sent to ${sub.contact_email} — "${doc.doc_name}" flagged for ${projectName}.`,
      )
      sent++
    }
  }

  return { scanned: docs.length, sent, skipped_cooldown }
}

// ── Main orchestrator ──────────────────────────────────────────

export async function runComplianceWatchdog(supabase: DBClient): Promise<WatchdogSummary> {
  const empty = (error: string): WatchdogSummary => ({
    expiryWarnings:  { scanned: 0, sent: 0, skipped_cooldown: 0 },
    auditRejections: { scanned: 0, sent: 0, skipped_cooldown: 0 },
    error,
  })

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return empty('RESEND_API_KEY not set')

  const resend = new Resend(resendKey)

  try {
    // Run both passes; don't let one failure abort the other
    const [expiryWarnings, auditRejections] = await Promise.all([
      runExpiryWarningPass(supabase, resend),
      runAuditRejectionPass(supabase, resend),
    ])
    return { expiryWarnings, auditRejections, error: null }
  } catch (err) {
    return empty(err instanceof Error ? err.message : String(err))
  }
}
