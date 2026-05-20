'use server'

import { createClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import type { UserRole } from '@/types/database.types'

export type AuthState = {
  error: string | null
  message?: string
}

export async function signIn(prevState: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) return { error: error.message }

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  redirect(profile?.role === 'subcontractor' ? '/subcontractor/portal' : '/gc/projects')
}

export async function signUp(prevState: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient()

  const email       = formData.get('email') as string
  const password    = formData.get('password') as string
  const fullName    = formData.get('full_name') as string
  const companyName = formData.get('company_name') as string
  const role        = formData.get('role') as UserRole

  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error) return { error: error.message }
  if (!data.user) return { error: 'Sign up failed. Please try again.' }

  // Email confirmation required — profile will be created after confirmation.
  if (!data.session) {
    return {
      error: null,
      message: 'Check your email to confirm your account, then sign in.',
    }
  }

  const { error: profileError } = await supabase.from('profiles').insert({
    id: data.user.id,
    full_name: fullName,
    company_name: companyName,
    role,
  })

  if (profileError) return { error: profileError.message }

  redirect(role === 'subcontractor' ? '/subcontractor/portal' : '/gc/projects')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
