import { createClient } from '@/lib/supabase'
import { NotificationStripClient } from './notification-strip-client'
import type { GcNotification } from '@/types/database.types'

export async function NotificationStrip() {
  const supabase = await createClient()

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 7)

  const { data } = await supabase
    .from('gc_notifications')
    .select('id, message, created_at, is_read')
    .eq('is_read', false)
    .gte('created_at', cutoff.toISOString())
    .order('created_at', { ascending: false })
    .limit(5)

  const notifs = (data ?? []) as GcNotification[]
  if (notifs.length === 0) return null

  return <NotificationStripClient notifs={notifs} />
}
