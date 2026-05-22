'use server'

import { createClient, createServiceSupabaseClient } from '@/lib/supabase'

/**
 * Generates a 1-hour signed URL for a site-entry-photos storage path.
 * Called by the monitor client when a realtime event brings in a new photo path.
 * Requires the caller to be an authenticated GC user — no path is served without auth.
 */
export async function getEntryPhotoSignedUrl(storagePath: string): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'gc') return null

  const service = createServiceSupabaseClient()
  const { data } = await service.storage
    .from('site-entry-photos')
    .createSignedUrl(storagePath, 3600)

  return data?.signedUrl ?? null
}
