'use server'

import { Resend } from 'resend'

export type DemoRequestData = {
  name: string
  email: string
  companyName: string
  companySize: string
  subcontractorCount: string
  message: string
  interest: string
}

export type DemoRequestResult = {
  success: boolean
  error?: string
}

export async function submitDemoRequest(
  data: DemoRequestData
): Promise<DemoRequestResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { success: false, error: 'Email service not configured.' }

  const resend = new Resend(apiKey)

  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background: #0f172a; padding: 24px 32px;">
        <p style="color: #f59e0b; font-size: 12px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; margin: 0 0 4px;">HardHat Compliance</p>
        <h1 style="color: #fff; font-size: 20px; font-weight: 800; margin: 0;">New Demo Request</h1>
      </div>

      <div style="padding: 32px;">
        <table style="width: 100%; border-collapse: collapse;">
          ${[
            ['Interested In',             data.interest          ],
            ['Name',                      data.name              ],
            ['Email',                     data.email             ],
            ['Company',                   data.companyName       ],
            ['Company Size',              data.companySize       ],
            ['Avg. Subcontractors',       data.subcontractorCount],
          ].map(([label, value]) => `
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; width: 40%;">
                <span style="font-size: 12px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">${label}</span>
              </td>
              <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9;">
                <span style="font-size: 14px; font-weight: 600; color: #0f172a;">${value || '—'}</span>
              </td>
            </tr>
          `).join('')}
        </table>

        ${data.message ? `
          <div style="margin-top: 24px; padding: 16px; background: #f8fafc; border-radius: 8px; border-left: 3px solid #6366f1;">
            <p style="font-size: 12px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px;">Additional Notes</p>
            <p style="font-size: 14px; color: #334155; margin: 0; line-height: 1.6;">${data.message}</p>
          </div>
        ` : ''}

        <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
          <p style="font-size: 12px; color: #94a3b8; margin: 0;">
            Submitted via hardhat-compliance.app · ${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}
          </p>
        </div>
      </div>
    </div>
  `

  const { error } = await resend.emails.send({
    from: 'HardHat Compliance <onboarding@resend.dev>',
    to: ['bazziiayoub@gmail.com'],
    replyTo: data.email,
    subject: `[${data.interest}] Demo Request — ${data.companyName} (${data.companySize})`,
    html,
  })

  if (error) return { success: false, error: error.message }
  return { success: true }
}
