'use server'

import { createClient } from '@/lib/supabase'
import { runExpiryScan as _runExpiryScan } from '@/lib/expiry-engine'

// Re-export types so the client button component can import them from here
export type { ExpiryScanResult, ExpiringItem } from '@/lib/expiry-engine'

export async function runExpiryScan() {
  const supabase = await createClient()
  return _runExpiryScan(supabase)
}
