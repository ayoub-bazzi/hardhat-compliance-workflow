'use server'

import { createClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export type PrequalReviewResult = { ok: boolean; error?: string }

export async function reviewPrequal(
  prequalId: string,
  subId: string,
  verdict: 'approved' | 'rejected',
  notes: string,
): Promise<PrequalReviewResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('prequal_submissions')
    .update({
      status:       verdict,
      review_notes: notes.trim() || null,
    })
    .eq('id', prequalId)

  if (error) return { ok: false, error: error.message }

  revalidatePath(`/gc/risk/${subId}`)
  return { ok: true }
}
