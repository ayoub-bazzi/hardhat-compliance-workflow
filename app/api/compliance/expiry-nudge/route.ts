import { createServiceSupabaseClient } from '@/lib/supabase'
import { runExpiryScan } from '@/lib/expiry-engine'

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
  const result = await runExpiryScan(supabase)

  if (result.error) {
    return Response.json({ error: result.error }, { status: 500 })
  }

  return Response.json({
    ok:              true,
    scanned:         result.scanned,
    nudged:          result.sent,
    alreadyNotified: result.alreadyNotified,
    items:           result.items,
  })
}
