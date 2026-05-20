'use server'

import { createClient } from '@/lib/supabase'

export async function markAllNotificationsRead(): Promise<void> {
  const supabase = await createClient()
  // Snapshot the current time so notifications that arrive during this
  // call are not marked read — they stay unread for the next session.
  const snapshot = new Date().toISOString()
  await supabase
    .from('in_app_notifications')
    .update({ is_read: true })
    .eq('is_read', false)
    .lte('created_at', snapshot)
}

export async function markNotificationRead(id: string): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('in_app_notifications')
    .update({ is_read: true })
    .eq('id', id)
}
