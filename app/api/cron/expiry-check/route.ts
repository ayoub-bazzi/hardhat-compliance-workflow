import { createServiceSupabaseClient } from '@/lib/supabase'
import { runExpiryScan } from '@/lib/expiry-engine'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  // ── Security: validate CRON_SECRET ───────────────────────────
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return Response.json({ error: 'CRON_SECRET is not configured on the server.' }, { status: 500 })
  }

  const authHeader = request.headers.get('authorization') ?? ''
  const token      = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader

  if (token !== cronSecret) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  // ── Build service client (bypasses RLS, no user session required) ──
  let supabase: ReturnType<typeof createServiceSupabaseClient>
  try {
    supabase = createServiceSupabaseClient()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return Response.json({ error: message }, { status: 500 })
  }

  // ── Run the expiry scan ───────────────────────────────────────
  const startedAt = new Date().toISOString()

  try {
    const result = await runExpiryScan(supabase)

    // Log every run to system_logs for observability
    await supabase.from('system_logs').insert({
      event:   'expiry_scan',
      level:   result.error ? 'warn' : 'info',
      message: result.error
        ? `Scan finished with error: ${result.error}`
        : `Scan complete — ${result.sent} warning${result.sent !== 1 ? 's' : ''} sent, ${result.alreadyNotified} skipped, ${result.scanned} scanned`,
      metadata: {
        started_at:       startedAt,
        scanned:          result.scanned,
        sent:             result.sent,
        already_notified: result.alreadyNotified,
        ...(result.error ? { scan_error: result.error } : {}),
      },
    })

    return Response.json({
      ok:              true,
      scanned:         result.scanned,
      sent:            result.sent,
      already_notified: result.alreadyNotified,
      error:           result.error,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const stack   = err instanceof Error ? err.stack   : undefined

    // Self-healing: capture crash details in system_logs before giving up
    try {
      await supabase.from('system_logs').insert({
        event:   'expiry_scan',
        level:   'error',
        message: `Unhandled exception: ${message}`,
        metadata: { started_at: startedAt, stack: stack ?? null },
      })
    } catch {
      // If the log write itself fails there is nothing more we can do
    }

    return Response.json({ error: message }, { status: 500 })
  }
}
