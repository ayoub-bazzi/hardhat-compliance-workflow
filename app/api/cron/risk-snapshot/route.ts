import { createServiceSupabaseClient } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return Response.json({ error: 'CRON_SECRET is not configured.' }, { status: 500 })
  }

  const authHeader = request.headers.get('authorization') ?? ''
  const token      = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader

  if (token !== cronSecret) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  let supabase: ReturnType<typeof createServiceSupabaseClient>
  try {
    supabase = createServiceSupabaseClient()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return Response.json({ error: message }, { status: 500 })
  }

  const { error } = await supabase.rpc('fn_take_risk_snapshot')
  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ ok: true, ts: new Date().toISOString() })
}
