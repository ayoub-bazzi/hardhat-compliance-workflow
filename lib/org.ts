'server-only'

import { cache } from 'react'
import { createClient } from './supabase'

export const getOrgId = cache(async (): Promise<string | null> => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()
  return data?.organization_id ?? null
})
