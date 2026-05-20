'use server'

import { createClient } from '@/lib/supabase'
import type { SystemLog } from '@/types/database.types'

export async function updateProfile(data: {
  fullName: string
  companyName: string
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'Not authenticated.' }

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: data.fullName, company_name: data.companyName })
    .eq('id', user.id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function sendPasswordReset(): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) return { success: false, error: 'Not authenticated.' }

  const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/auth/reset-password`,
  })

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function getSystemLogs(): Promise<SystemLog[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('system_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  return (data ?? []) as SystemLog[]
}
