import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      endpoint: string
      keys: { p256dh: string; auth: string }
    }

    if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
      return NextResponse.json({ error: 'Invalid subscription payload.' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id:         user.id,
          organization_id: profile?.organization_id ?? null,
          endpoint:        body.endpoint,
          p256dh:          body.keys.p256dh,
          auth:            body.keys.auth,
        },
        { onConflict: 'user_id,endpoint' },
      )

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { endpoint } = await request.json() as { endpoint: string }
    if (!endpoint) return NextResponse.json({ error: 'Missing endpoint.' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id)
      .eq('endpoint', endpoint)

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 })
  }
}
