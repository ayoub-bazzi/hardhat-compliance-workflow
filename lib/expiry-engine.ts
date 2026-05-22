import { Resend } from 'resend'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, DocumentEventMetadata } from '@/types/database.types'

type DBClient = SupabaseClient<Database>

// ── Types ──────────────────────────────────────────────────────

export type ExpiringItem = {
  documentId: string
  documentType: string
  daysUntilExpiry: number
  expiryDate: string
  subcontractorName: string
  contactEmail: string
  projectName: string
  alreadyWarned: boolean
  emailSent: boolean
}

export type ExpiryScanResult = {
  error: string | null
  scanned: number
  sent: number
  alreadyNotified: number
  items: ExpiringItem[]
}

// ── Internal helpers ───────────────────────────────────────────

type DocRow = {
  id: string
  type: string
  expiry_date: string
  subcontractor_id: string
  subcontractors: {
    company_name: string
    contact_email: string
    project_id: string
  } | null
}

function urgencyColors(days: number) {
  if (days <= 7)  return { bg: '#fef3c7', border: '#fcd34d', text: '#92400e', label: 'CRITICAL' }
  if (days <= 15) return { bg: '#fffbeb', border: '#fde68a', text: '#b45309', label: 'WARNING'  }
  return               { bg: '#fefce8', border: '#fef08a', text: '#713f12', label: 'NOTICE'   }
}

function expiryWarningEmailHtml(
  subName: string,
  projectName: string,
  docType: string,
  daysUntilExpiry: number,
  expiryDate: string,
  portalUrl: string,
): string {
  const c = urgencyColors(daysUntilExpiry)
  const formattedDate = new Date(expiryDate).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })
  const dayWord = daysUntilExpiry === 1 ? 'day' : 'days'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Document Expiry Warning</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr>
          <td style="background:#0f172a;border-radius:12px 12px 0 0;padding:32px 40px;text-align:center;">
            <span style="font-size:28px;">🏗️</span>
            <h1 style="margin:8px 0 0;color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">HardHat Compliance</h1>
            <p style="margin:4px 0 0;color:#94a3b8;font-size:13px;">Construction compliance made simple</p>
          </td>
        </tr>
        <tr>
          <td style="background:#fff;padding:40px 40px 32px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
            <p style="display:inline-block;background:${c.bg};border:1px solid ${c.border};border-radius:8px;padding:8px 16px;color:${c.text};font-size:13px;font-weight:600;margin:0 0 24px;">⚠️ ${c.label}: Document Expiring Soon</p>
            <h2 style="margin:0 0 20px;color:#0f172a;font-size:24px;font-weight:700;line-height:1.3;">Your ${docType} expires in<br/><span style="color:${c.text};">${daysUntilExpiry} ${dayWord}</span></h2>
            <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.7;">
              Hi <strong>${subName}</strong>,<br/><br/>
              Your <strong>${docType}</strong> for <strong>${projectName}</strong> is expiring soon and needs to be renewed.
            </p>
            <div style="background:${c.bg};border:1px solid ${c.border};border-left:4px solid ${c.text};border-radius:8px;padding:16px 20px;margin:24px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:50%;">
                    <p style="margin:0 0 2px;color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Document</p>
                    <p style="margin:0;color:#0f172a;font-size:14px;font-weight:600;">${docType}</p>
                  </td>
                  <td style="width:50%;">
                    <p style="margin:0 0 2px;color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Expires On</p>
                    <p style="margin:0;color:${c.text};font-size:14px;font-weight:600;">${formattedDate}</p>
                  </td>
                </tr>
              </table>
            </div>
            <p style="margin:0 0 8px;color:#475569;font-size:15px;line-height:1.7;">Please upload a renewed certificate to avoid being blocked from the job site.</p>
            <table cellpadding="0" cellspacing="0" style="margin:32px 0;">
              <tr>
                <td style="background:#d97706;border-radius:8px;">
                  <a href="${portalUrl}" style="display:inline-block;padding:14px 32px;color:#fff;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:-0.1px;">Update Your Documents →</a>
                </td>
              </tr>
            </table>
            <p style="margin:24px 0 0;color:#94a3b8;font-size:13px;line-height:1.6;">
              If the button doesn't work, copy and paste this link:<br/>
              <a href="${portalUrl}" style="color:#d97706;word-break:break-all;">${portalUrl}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:24px 40px;text-align:center;">
            <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">
              This is an automated expiry reminder from HardHat Compliance.<br/>
              If you have questions, contact your general contractor directly.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ── Main engine function ───────────────────────────────────────

export async function runExpiryScan(supabase: DBClient): Promise<ExpiryScanResult> {
  const empty = (error: string | null): ExpiryScanResult =>
    ({ error, scanned: 0, sent: 0, alreadyNotified: 0, items: [] })

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return empty('RESEND_API_KEY is not set.')

  // Date window: today → +30 days
  const todayUtc    = new Date(new Date().toISOString().split('T')[0])
  const in30Days    = new Date(todayUtc)
  in30Days.setDate(in30Days.getDate() + 30)
  const todayStr    = todayUtc.toISOString().split('T')[0]
  const in30DaysStr = in30Days.toISOString().split('T')[0]

  // 1. Fetch approved current docs expiring in the window + subcontractor info
  const { data: rawDocs, error: docsError } = await supabase
    .from('documents')
    .select('id, type, expiry_date, subcontractor_id, subcontractors(company_name, contact_email, project_id)')
    .eq('status', 'approved')
    .eq('is_current', true)
    .not('expiry_date', 'is', null)
    .gte('expiry_date', todayStr)
    .lte('expiry_date', in30DaysStr)

  if (docsError) return empty(docsError.message)
  const docs = (rawDocs ?? []) as DocRow[]
  if (docs.length === 0) return empty(null)

  // 2. Resolve project names
  const projectIds = [
    ...new Set(docs.map((d) => d.subcontractors?.project_id).filter(Boolean) as string[]),
  ]
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name')
    .in('id', projectIds)
  const projectMap = Object.fromEntries((projects ?? []).map((p) => [p.id, p.name]))

  // 3. Find docs already warned in the last 23 h (dedup guard)
  const docIds = docs.map((d) => d.id)
  const cutoff = new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString()
  const { data: recentEvents } = await supabase
    .from('document_events')
    .select('document_id, metadata')
    .eq('event_type', 'notification_sent')
    .in('document_id', docIds)
    .gte('created_at', cutoff)

  const recentlyWarned = new Set(
    (recentEvents ?? [])
      .filter((e) => (e.metadata as DocumentEventMetadata).type === 'expiry_warning')
      .map((e) => e.document_id),
  )

  // 4. Send emails + record events
  const resend    = new Resend(resendKey)
  const baseUrl   = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const portalUrl = `${baseUrl}/subcontractor/portal`

  const items: ExpiringItem[] = []
  let sent = 0
  let alreadyNotified = 0

  for (const doc of docs) {
    const sub = doc.subcontractors
    if (!sub) continue

    const daysUntilExpiry = Math.round(
      (new Date(doc.expiry_date).getTime() - todayUtc.getTime()) / 86_400_000,
    )
    const projectName = projectMap[sub.project_id] ?? 'Your Project'

    const item: ExpiringItem = {
      documentId:        doc.id,
      documentType:      doc.type,
      daysUntilExpiry,
      expiryDate:        doc.expiry_date,
      subcontractorName: sub.company_name,
      contactEmail:      sub.contact_email,
      projectName,
      alreadyWarned:     recentlyWarned.has(doc.id),
      emailSent:         false,
    }

    if (recentlyWarned.has(doc.id)) {
      alreadyNotified++
      items.push(item)
      continue
    }

    const { error: emailError } = await resend.emails.send({
      from:    'HardHat Compliance <onboarding@resend.dev>',
      to:      sub.contact_email,
      subject: `⚠️ Warning: Your ${doc.type} expires in ${daysUntilExpiry} ${daysUntilExpiry === 1 ? 'day' : 'days'}`,
      html:    expiryWarningEmailHtml(
        sub.company_name, projectName, doc.type, daysUntilExpiry, doc.expiry_date, portalUrl,
      ),
    })

    if (!emailError) {
      await supabase.from('document_events').insert({
        document_id: doc.id,
        event_type:  'notification_sent',
        actor:       'Expiry Engine',
        metadata:    { recipient: sub.contact_email, type: 'expiry_warning', days_until_expiry: daysUntilExpiry },
      })
      item.emailSent = true
      sent++
    }

    items.push(item)
  }

  items.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)
  return { error: null, scanned: docs.length, sent, alreadyNotified, items }
}
