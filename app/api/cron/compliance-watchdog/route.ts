import { createServiceSupabaseClient } from '@/lib/supabase'
import { runComplianceWatchdog } from '@/lib/watchdog-engine'

export const runtime = 'nodejs'

// ── Business hours gate ────────────────────────────────────────
// Morocco uses Africa/Casablanca (IANA). Unlike most MENA countries,
// Morocco's DST policy has changed over time — Intl.DateTimeFormat
// uses the IANA tz database which stays current without manual offsets.
//
// Set WATCHDOG_ENFORCE_BUSINESS_HOURS=false in .env.local to disable
// the gate during development.

function moroccoHour(): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Casablanca',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(new Date())
  return parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10) % 24
}

function isBusinessHours(): boolean {
  const hour = moroccoHour()
  return hour >= 9 && hour < 17
}

// ── Route ──────────────────────────────────────────────────────

export async function GET(request: Request) {
  // Auth
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return Response.json({ error: 'CRON_SECRET is not configured.' }, { status: 500 })
  }

  const authHeader = request.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader
  if (token !== cronSecret) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  // Business hours gate — returns success so the scheduler doesn't retry
  const enforceHours = process.env.WATCHDOG_ENFORCE_BUSINESS_HOURS !== 'false'
  if (enforceHours && !isBusinessHours()) {
    return Response.json({
      ok: true,
      skipped: 'outside_business_hours',
      timezone: 'Africa/Casablanca',
      current_hour: moroccoHour(),
      window: '09:00–17:00',
    })
  }

  let supabase: ReturnType<typeof createServiceSupabaseClient>
  try {
    supabase = createServiceSupabaseClient()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return Response.json({ error: message }, { status: 500 })
  }

  const startedAt = new Date().toISOString()
  const result = await runComplianceWatchdog(supabase)

  // Persist run record to system_logs for observability
  try {
    await supabase.from('system_logs').insert({
      event:   'compliance_watchdog',
      level:   result.error ? 'warn' : 'info',
      message: result.error
        ? `Watchdog error: ${result.error}`
        : `Watchdog complete — expiry: ${result.expiryWarnings.sent} sent, ${result.expiryWarnings.skipped_cooldown} on cooldown | rejection: ${result.auditRejections.sent} sent, ${result.auditRejections.skipped_cooldown} on cooldown`,
      metadata: {
        started_at:      startedAt,
        expiry_warnings: result.expiryWarnings,
        audit_rejections: result.auditRejections,
        ...(result.error ? { error: result.error } : {}),
      },
    })
  } catch {
    // Non-fatal — observability failure should not mask real errors
  }

  return Response.json({
    ok:    !result.error,
    error: result.error,
    expiry_warnings:  result.expiryWarnings,
    audit_rejections: result.auditRejections,
  })
}
