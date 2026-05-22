import { Resend } from 'resend'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, NudgeAlertType, NudgeChannel, NudgeStatus } from '@/types/database.types'

type DBClient = SupabaseClient<Database>

// ── Shared payload ─────────────────────────────────────────────

export type NotifyPayload = {
  subId:        string
  orgId:        string | null
  companyName:  string
  contactEmail: string
  contactPhone: string | null
  inviteToken:  string | null
  // Alert-specific
  docName?:     string
  docType?:     string
  daysUntil?:   number
  flagReasons?: string[]
  riskScore?:   number
}

export type NotifyResult = {
  email:    NudgeStatus
  sms:      NudgeStatus
  whatsapp: NudgeStatus
}

// ── Internal helpers ───────────────────────────────────────────

function portalUrl(token: string | null): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  return token ? `${base}/portal/upload/${token}` : `${base}/portal`
}

async function logNudge(
  supabase: DBClient,
  subId: string,
  orgId: string | null,
  alertType: NudgeAlertType,
  channel: NudgeChannel,
  recipient: string,
  status: NudgeStatus,
  metadata: Record<string, unknown>,
) {
  await supabase.from('nudge_logs').insert({
    subcontractor_id:  subId,
    organization_id:   orgId ?? undefined,
    alert_type:        alertType,
    channel,
    recipient_contact: recipient,
    status,
    metadata,
  })
}

async function logAuditEvent(
  supabase: DBClient,
  subId: string,
  orgId: string | null,
  description: string,
  alertType: NudgeAlertType,
  result: NotifyResult,
) {
  await supabase.rpc('fn_log_audit_event', {
    p_subcontractor_id: subId,
    p_organization_id:  orgId,
    p_event_type:       'Nudge Sent',
    p_description:      description,
    p_actor:            'HardHat Nudge Engine',
    p_metadata:         { alert_type: alertType, channels: result },
  })
}

// ── Twilio SMS/WhatsApp sender ─────────────────────────────────

async function sendTwilioMessage(
  to: string,
  body: string,
  channel: 'sms' | 'whatsapp',
): Promise<NudgeStatus> {
  const sid    = process.env.TWILIO_ACCOUNT_SID
  const token  = process.env.TWILIO_AUTH_TOKEN
  const smsNum = process.env.TWILIO_PHONE_NUMBER
  const waNum  = process.env.TWILIO_WHATSAPP_NUMBER

  if (!sid || !token) return 'skipped'
  if (channel === 'sms'      && !smsNum) return 'skipped'
  if (channel === 'whatsapp' && !waNum)  return 'skipped'

  try {
    const twilio = (await import('twilio')).default
    const client = twilio(sid, token)

    const from = channel === 'whatsapp'
      ? `whatsapp:${waNum}`
      : smsNum!

    const toAddr = channel === 'whatsapp'
      ? `whatsapp:${to}`
      : to

    await client.messages.create({ from, to: toAddr, body })
    return 'sent'
  } catch {
    return 'failed'
  }
}

// ── Email HTML builder ─────────────────────────────────────────

type AlertTheme = {
  badge:       string
  badgeBg:     string
  badgeBorder: string
  ctaColor:    string
  subject:     string
  headline:    string
  subline:     string
  body:        string
  ctaLabel:    string
}

function buildEmailHtml(companyName: string, portalLink: string, theme: AlertTheme): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${theme.subject}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr>
          <td style="background:#0f172a;border-radius:12px 12px 0 0;padding:32px 40px;text-align:center;">
            <span style="font-size:28px;">🏗️</span>
            <h1 style="margin:8px 0 0;color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">HardHat Compliance</h1>
            <p style="margin:4px 0 0;color:#94a3b8;font-size:13px;">Automated Compliance Alert</p>
          </td>
        </tr>
        <tr>
          <td style="background:#fff;padding:40px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
            <p style="display:inline-block;background:${theme.badgeBg};border:1px solid ${theme.badgeBorder};border-radius:8px;padding:8px 16px;color:${theme.badge};font-size:13px;font-weight:700;margin:0 0 24px;letter-spacing:0.3px;">${theme.badge}</p>
            <h2 style="margin:0 0 12px;color:#0f172a;font-size:22px;font-weight:800;line-height:1.3;">${theme.headline}</h2>
            <p style="margin:0 0 8px;color:#475569;font-size:15px;font-weight:600;">${companyName}</p>
            <p style="margin:0 0 24px;color:#64748b;font-size:14px;line-height:1.7;">${theme.subline}</p>
            <div style="background:#fff7ed;border:1px solid #fed7aa;border-left:4px solid #ea580c;border-radius:8px;padding:16px 20px;margin:0 0 28px;">
              <p style="margin:0;color:#9a3412;font-size:14px;line-height:1.7;">${theme.body}</p>
            </div>
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:${theme.ctaColor};border-radius:8px;">
                  <a href="${portalLink}" style="display:inline-block;padding:14px 32px;color:#fff;font-size:15px;font-weight:700;text-decoration:none;">${theme.ctaLabel} →</a>
                </td>
              </tr>
            </table>
            <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;line-height:1.6;">
              If the button doesn't work, copy this link:<br/>
              <a href="${portalLink}" style="color:#d97706;word-break:break-all;">${portalLink}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:20px 40px;text-align:center;">
            <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">
              This is an automated alert from HardHat Compliance.<br/>
              All alerts are permanently recorded in the Golden Thread audit ledger.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ── Alert 1: Flagged Document ──────────────────────────────────

export async function sendFlaggedAlert(
  supabase: DBClient,
  payload: NotifyPayload,
): Promise<NotifyResult> {
  const link = portalUrl(payload.inviteToken)
  const result: NotifyResult = { email: 'skipped', sms: 'skipped', whatsapp: 'skipped' }

  const reasonsSummary = payload.flagReasons?.join('; ') ?? 'Non-compliant document detected'

  // ── Email ──────────────────────────────────────────────────
  const resendKey = process.env.RESEND_API_KEY
  if (resendKey) {
    const resend = new Resend(resendKey)
    const theme: AlertTheme = {
      badge:       '🚨 COMPLIANCE FAILURE DETECTED',
      badgeBg:     '#fef2f2',
      badgeBorder: '#fca5a5',
      ctaColor:    '#dc2626',
      subject:     `HardHat Alert: ${payload.docType ?? 'Document'} flagged — immediate action required`,
      headline:    `Your ${payload.docType ?? 'compliance document'} has been flagged`,
      subline:     `HardHat AI identified a compliance failure in "${payload.docName ?? 'your document'}". Site access revocation is pending.`,
      body:        `<strong>Reason:</strong> ${reasonsSummary}<br/><br/>You must upload a replacement document immediately. Failure to act within 24 hours will result in your site access being revoked and a Compliance Hold being placed on any pending payments.`,
      ctaLabel:    'Upload Replacement Document',
    }
    const { error } = await resend.emails.send({
      from:    'HardHat Compliance <onboarding@resend.dev>',
      to:      payload.contactEmail,
      subject: theme.subject,
      html:    buildEmailHtml(payload.companyName, link, theme),
    })
    result.email = error ? 'failed' : 'sent'
  }

  // ── SMS ────────────────────────────────────────────────────
  if (payload.contactPhone) {
    const smsBody = `HardHat Alert: Compliance failure detected. ${payload.companyName} — your ${payload.docType ?? 'document'} has been flagged by AI review. Site access will be revoked. Upload now: ${link}`
    result.sms = await sendTwilioMessage(payload.contactPhone, smsBody, 'sms')
  }

  // ── WhatsApp ───────────────────────────────────────────────
  if (payload.contactPhone) {
    const waBody = `*HardHat Compliance Alert*\n\n⛔ *Compliance Failure Detected*\n\nCompany: ${payload.companyName}\nDocument: ${payload.docType ?? 'Compliance Document'}\nIssue: ${reasonsSummary}\n\nYour site access will be revoked until a compliant document is uploaded.\n\n👉 Upload now: ${link}`
    result.whatsapp = await sendTwilioMessage(payload.contactPhone, waBody, 'whatsapp')
  }

  // ── Log to nudge_logs + audit_events ───────────────────────
  const logMeta = { doc_name: payload.docName, doc_type: payload.docType, flag_reasons: payload.flagReasons, portal_url: link }
  await Promise.all([
    logNudge(supabase, payload.subId, payload.orgId, 'flagged', 'email', payload.contactEmail, result.email, logMeta),
    payload.contactPhone ? logNudge(supabase, payload.subId, payload.orgId, 'flagged', 'sms',      payload.contactPhone, result.sms,      logMeta) : null,
    payload.contactPhone ? logNudge(supabase, payload.subId, payload.orgId, 'flagged', 'whatsapp', payload.contactPhone, result.whatsapp, logMeta) : null,
  ])

  await logAuditEvent(
    supabase, payload.subId, payload.orgId,
    `Flagged alert sent to ${payload.contactEmail} — "${payload.docName ?? payload.docType}" flagged by AI.`,
    'flagged', result,
  )

  return result
}

// ── Alert 2: Expiry Warning ────────────────────────────────────

export async function sendExpiryWarning(
  supabase: DBClient,
  payload: NotifyPayload,
): Promise<NotifyResult> {
  const link = portalUrl(payload.inviteToken)
  const result: NotifyResult = { email: 'skipped', sms: 'skipped', whatsapp: 'skipped' }
  const days = payload.daysUntil ?? 0
  const alertType: NudgeAlertType = days <= 2 ? 'expiry_48h' : 'expiry_7d'
  const urgency = days <= 2 ? 'URGENT — 48-HOUR FINAL WARNING' : '7-DAY EXPIRY WARNING'

  // ── Email ──────────────────────────────────────────────────
  const resendKey = process.env.RESEND_API_KEY
  if (resendKey) {
    const resend = new Resend(resendKey)
    const theme: AlertTheme = {
      badge:       `⚠️ ${urgency}`,
      badgeBg:     days <= 2 ? '#fff7ed' : '#fefce8',
      badgeBorder: days <= 2 ? '#fed7aa' : '#fef08a',
      ctaColor:    days <= 2 ? '#ea580c' : '#d97706',
      subject:     `HardHat Alert: ${payload.docType ?? 'Document'} expires in ${days} day${days !== 1 ? 's' : ''} — renew now`,
      headline:    `Your ${payload.docType ?? 'document'} expires in ${days} day${days !== 1 ? 's' : ''}`,
      subline:     `"${payload.docName ?? payload.docType}" for your current project is approaching its expiry date.`,
      body:        days <= 2
        ? `<strong>This is your final warning.</strong> If this document is not renewed before expiry, HardHat will automatically revoke your site access pass and issue a Compliance Hold on pending payments.`
        : `Please upload a renewed certificate to avoid disruption to your site access. Documents are reviewed by AI within 30 seconds of upload.`,
      ctaLabel:    'Renew Your Document',
    }
    const { error } = await resend.emails.send({
      from:    'HardHat Compliance <onboarding@resend.dev>',
      to:      payload.contactEmail,
      subject: theme.subject,
      html:    buildEmailHtml(payload.companyName, link, theme),
    })
    result.email = error ? 'failed' : 'sent'
  }

  // ── SMS ────────────────────────────────────────────────────
  if (payload.contactPhone) {
    const smsBody = days <= 2
      ? `HardHat Alert: URGENT. ${payload.companyName} — your ${payload.docType ?? 'document'} expires in ${days} hour${days <= 1 ? '' : 's'}. Failure to renew will revoke site access. Act now: ${link}`
      : `HardHat Alert: ${payload.companyName} — your ${payload.docType ?? 'document'} expires in ${days} days. Upload a renewal to maintain site access: ${link}`
    result.sms = await sendTwilioMessage(payload.contactPhone, smsBody, 'sms')
  }

  // ── WhatsApp ───────────────────────────────────────────────
  if (payload.contactPhone) {
    const waBody = days <= 2
      ? `*HardHat Compliance — FINAL WARNING*\n\n⏰ *48-Hour Expiry Alert*\n\nCompany: ${payload.companyName}\nDocument: ${payload.docType}\nExpires in: ${days} day${days !== 1 ? 's' : ''}\n\nSite access will be *automatically revoked* upon expiry. Upload your renewal now:\n\n👉 ${link}`
      : `*HardHat Compliance Alert*\n\n📋 *7-Day Expiry Warning*\n\nCompany: ${payload.companyName}\nDocument: ${payload.docType}\nExpires in: ${days} days\n\nUpload a renewal to avoid site access disruption:\n\n👉 ${link}`
    result.whatsapp = await sendTwilioMessage(payload.contactPhone, waBody, 'whatsapp')
  }

  // ── Log ────────────────────────────────────────────────────
  const logMeta = { doc_name: payload.docName, doc_type: payload.docType, days_until_expiry: days, portal_url: link }
  await Promise.all([
    logNudge(supabase, payload.subId, payload.orgId, alertType, 'email', payload.contactEmail, result.email, logMeta),
    payload.contactPhone ? logNudge(supabase, payload.subId, payload.orgId, alertType, 'sms',      payload.contactPhone, result.sms,      logMeta) : null,
    payload.contactPhone ? logNudge(supabase, payload.subId, payload.orgId, alertType, 'whatsapp', payload.contactPhone, result.whatsapp, logMeta) : null,
  ])

  await logAuditEvent(
    supabase, payload.subId, payload.orgId,
    `Expiry warning sent to ${payload.contactEmail} — "${payload.docName ?? payload.docType}" expires in ${days} day${days !== 1 ? 's' : ''}.`,
    alertType, result,
  )

  return result
}

// ── Alert 3: Hard-Stop Revocation ─────────────────────────────

export async function sendHardStopRevocation(
  supabase: DBClient,
  payload: NotifyPayload,
): Promise<NotifyResult> {
  const link = portalUrl(payload.inviteToken)
  const result: NotifyResult = { email: 'skipped', sms: 'skipped', whatsapp: 'skipped' }
  const score = payload.riskScore ?? 71

  // ── Email ──────────────────────────────────────────────────
  const resendKey = process.env.RESEND_API_KEY
  if (resendKey) {
    const resend = new Resend(resendKey)
    const theme: AlertTheme = {
      badge:       '🔴 SITE ACCESS REVOKED',
      badgeBg:     '#fef2f2',
      badgeBorder: '#fca5a5',
      ctaColor:    '#dc2626',
      subject:     `HardHat Alert: Site access revoked — critical risk score (${score})`,
      headline:    'Your site access has been revoked',
      subline:     `${payload.companyName} — risk score ${score}/100 has triggered a Hard-Stop. All gate access is now blocked.`,
      body:        `Your current risk score of <strong>${score}/100</strong> has exceeded the Hard-Stop threshold of 71. Your site access pass has been automatically revoked and a Compliance Hold has been placed on all pending payments.<br/><br/>To restore access, you must resolve all outstanding compliance failures and upload valid documents. Your General Contractor has been notified.`,
      ctaLabel:    'Resolve Compliance Issues',
    }
    const { error } = await resend.emails.send({
      from:    'HardHat Compliance <onboarding@resend.dev>',
      to:      payload.contactEmail,
      subject: theme.subject,
      html:    buildEmailHtml(payload.companyName, link, theme),
    })
    result.email = error ? 'failed' : 'sent'
  }

  // ── SMS ────────────────────────────────────────────────────
  if (payload.contactPhone) {
    const smsBody = `HardHat Alert: Compliance failure detected. ${payload.companyName} — risk score ${score}/100. Site access has been REVOKED and payments are on Compliance Hold. Resolve now: ${link}`
    result.sms = await sendTwilioMessage(payload.contactPhone, smsBody, 'sms')
  }

  // ── WhatsApp ───────────────────────────────────────────────
  if (payload.contactPhone) {
    const waBody = `*HardHat Compliance — HARD STOP*\n\n🔴 *Site Access Revoked*\n\nCompany: ${payload.companyName}\nRisk Score: ${score}/100 (threshold: 71)\n\nYour site access pass has been *revoked* and all pending payments are on *Compliance Hold*.\n\nYour General Contractor has been notified. Resolve all compliance issues immediately:\n\n👉 ${link}`
    result.whatsapp = await sendTwilioMessage(payload.contactPhone, waBody, 'whatsapp')
  }

  // ── Log ────────────────────────────────────────────────────
  const logMeta = { risk_score: score, portal_url: link }
  await Promise.all([
    logNudge(supabase, payload.subId, payload.orgId, 'hard_stop', 'email', payload.contactEmail, result.email, logMeta),
    payload.contactPhone ? logNudge(supabase, payload.subId, payload.orgId, 'hard_stop', 'sms',      payload.contactPhone, result.sms,      logMeta) : null,
    payload.contactPhone ? logNudge(supabase, payload.subId, payload.orgId, 'hard_stop', 'whatsapp', payload.contactPhone, result.whatsapp, logMeta) : null,
  ])

  await logAuditEvent(
    supabase, payload.subId, payload.orgId,
    `Hard-Stop revocation sent to ${payload.contactEmail} — risk score ${score}/100 exceeded threshold.`,
    'hard_stop', result,
  )

  return result
}
