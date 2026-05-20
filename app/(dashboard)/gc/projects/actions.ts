'use server'

import { createClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export type ProjectActionState = {
  error: string | null
  success?: boolean
  projectId?: string
}

export async function createProject(
  prevState: ProjectActionState,
  formData: FormData
): Promise<ProjectActionState> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const name      = (formData.get('name') as string ?? '').trim()
  const location  = (formData.get('location') as string ?? '').trim()
  const subEmail  = (formData.get('subcontractorEmail') as string ?? '').trim()

  if (!name) return { error: 'Project name is required.' }

  // Resolve the GC's organization_id for scoped inserts.
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  const organizationId = profile?.organization_id
  if (!organizationId) return { error: 'Organization not found. Please complete onboarding.' }

  const { data: project, error } = await supabase
    .from('projects')
    .insert({ name, location: location || null, status: 'active', organization_id: organizationId })
    .select('id')
    .single()

  if (error || !project) return { error: error?.message ?? 'Failed to create project.' }

  if (subEmail) {
    const companyName = subEmail.split('@')[0]
    await supabase.from('subcontractors').insert({
      project_id: project.id,
      company_name: companyName,
      contact_email: subEmail,
      compliance_status: 'non_compliant',
      organization_id: organizationId,
    })
  }

  revalidatePath('/gc/projects')
  return { error: null, success: true, projectId: project.id }
}
