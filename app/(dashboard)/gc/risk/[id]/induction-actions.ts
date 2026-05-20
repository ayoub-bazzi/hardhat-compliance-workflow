'use server'

import { createClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export async function markInductionComplete(subId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Unauthorized.' }

  const today = new Date().toISOString().split('T')[0]

  const { error } = await supabase
    .from('subcontractors')
    .update({ safety_induction_complete: true, induction_date: today })
    .eq('id', subId)

  if (error) return { ok: false, error: error.message }

  revalidatePath(`/gc/risk/${subId}`)
  return { ok: true }
}

export async function revokeInduction(subId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Unauthorized.' }

  const { error } = await supabase
    .from('subcontractors')
    .update({ safety_induction_complete: false, induction_date: null })
    .eq('id', subId)

  if (error) return { ok: false, error: error.message }

  revalidatePath(`/gc/risk/${subId}`)
  return { ok: true }
}
