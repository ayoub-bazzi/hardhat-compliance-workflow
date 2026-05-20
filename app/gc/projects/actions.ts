'use server'

import { createClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export type ProjectActionState = {
  error: string | null
  success?: boolean
}

export async function createProject(
  prevState: ProjectActionState,
  formData: FormData
): Promise<ProjectActionState> {
  const supabase = await createClient()

  const name     = (formData.get('name') as string ?? '').trim()
  const location = (formData.get('location') as string ?? '').trim()

  if (!name) return { error: 'Project name is required.' }

  const { error } = await supabase.from('projects').insert({
    name,
    location: location || null,
    status: 'active',
  })

  if (error) return { error: error.message }

  revalidatePath('/gc/projects')
  return { error: null, success: true }
}
