'use server'

import { createClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export type OnboardingState = {
  error: string | null
}

export async function createOrganization(
  prevState: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const name = (formData.get('name') as string ?? '').trim()
  const size = (formData.get('size') as string ?? '').trim()

  if (!name) return { error: 'Company name is required.' }
  if (!size) return { error: 'Please select a company size.' }

  try {
    // Check whether fn_handle_new_user already created a placeholder org at signup.
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (existingProfile?.organization_id) {
      // Placeholder org exists — update it with the real company details.
      const { error: updateError } = await supabase
        .from('organizations')
        .update({ name, size })
        .eq('id', existingProfile.organization_id)

      if (updateError) {
        console.error('[onboarding] org update failed:', updateError)
        return { error: updateError.message }
      }
    } else {
      // No org yet (pre-trigger user or sub-flow edge case) — create one.
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({ name, size, owner_id: user.id })
        .select('id')
        .single()

      if (orgError || !org) {
        console.error('[onboarding] org insert failed:', orgError)
        return { error: orgError?.message ?? 'Failed to create organization.' }
      }

      // Linking the org to the profile triggers fn_sync_org_to_jwt,
      // which writes organization_id into raw_app_meta_data before
      // the refreshSession() call below issues the new JWT.
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ organization_id: org.id })
        .eq('id', user.id)

      if (profileError) {
        console.error('[onboarding] profile update failed:', profileError)
        return { error: profileError.message }
      }
    }

    // Refresh session cookies so the middleware sees the updated auth state
    // immediately on the next request, without waiting for a token rotation cycle.
    await supabase.auth.refreshSession()
  } catch (err) {
    console.error('[onboarding] unexpected error:', err)
    return { error: 'An unexpected error occurred. Please try again.' }
  }

  // redirect() throws NEXT_REDIRECT internally — must be outside try/catch
  // or it gets swallowed and the browser sees no navigation (silent failure).
  revalidatePath('/gc', 'layout')
  redirect('/gc/projects')
}
