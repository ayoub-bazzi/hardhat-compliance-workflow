'use server'

import { createClient } from '@/lib/supabase'
import { getOrgId } from '@/lib/org'
import { revalidatePath } from 'next/cache'

export type LifecycleActionState = {
  error: string | null
  success?: boolean
}

export async function archiveProject(projectId: string): Promise<LifecycleActionState> {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return { error: 'Not authenticated.' }

  const { error } = await supabase
    .from('projects')
    .update({ status: 'archived' })
    .eq('id', projectId)
    .eq('organization_id', orgId)

  if (error) return { error: error.message }

  revalidatePath('/gc/projects')
  revalidatePath(`/gc/projects/${projectId}`)
  return { error: null, success: true }
}

export async function unarchiveProject(projectId: string): Promise<LifecycleActionState> {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return { error: 'Not authenticated.' }

  const { error } = await supabase
    .from('projects')
    .update({ status: 'active' })
    .eq('id', projectId)
    .eq('organization_id', orgId)

  if (error) return { error: error.message }

  revalidatePath('/gc/projects')
  revalidatePath(`/gc/projects/${projectId}`)
  return { error: null, success: true }
}

export async function deleteProject(projectId: string): Promise<LifecycleActionState> {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return { error: 'Not authenticated.' }

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('organization_id', orgId)
    .single()

  if (!project) return { error: 'Project not found or access denied.' }

  // Clean up storage files before cascade delete wipes the document rows.
  const { data: subs } = await supabase
    .from('subcontractors')
    .select('id')
    .eq('project_id', projectId)

  const subIds = (subs ?? []).map((s) => s.id)
  if (subIds.length > 0) {
    const { data: docs } = await supabase
      .from('documents')
      .select('file_path')
      .in('subcontractor_id', subIds)

    const paths = (docs ?? []).map((d) => d.file_path).filter((p): p is string => Boolean(p))
    if (paths.length > 0) {
      await supabase.storage.from('compliance-docs').remove(paths)
    }
  }

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)
    .eq('organization_id', orgId)

  if (error) return { error: error.message }

  revalidatePath('/gc/projects')
  return { error: null, success: true }
}
