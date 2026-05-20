'use server'

import { createClient } from '@/lib/supabase'

export async function resetSubcontractorPhoto(subId: string): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('subcontractors')
    .update({ profile_photo_url: null })
    .eq('id', subId)
}
