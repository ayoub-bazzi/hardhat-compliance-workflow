'use server'

import { createClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import type { DocumentEvent } from '@/types/database.types'

export type HistoryResult = { events: DocumentEvent[]; error: string | null }

export async function getDocumentHistory(documentId: string): Promise<HistoryResult> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('document_events')
    .select('*')
    .eq('document_id', documentId)
    .order('created_at', { ascending: true })

  if (error) return { events: [], error: error.message }
  return { events: (data ?? []) as DocumentEvent[], error: null }
}

export type ForceApproveResult = { error: string | null; success?: boolean }

export async function forceApproveDocument(
  documentId: string,
  projectId: string,
  note: string,
): Promise<ForceApproveResult> {
  const trimmedNote = note.trim()
  if (!trimmedNote) return { error: 'A note is required for manual overrides.' }

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: profile } = await supabase
    .from('profiles').select('full_name').eq('id', user.id).single()
  const actorName = profile?.full_name ?? user.email ?? user.id

  const { data: doc } = await supabase
    .from('documents')
    .select('status, subcontractor_id')
    .eq('id', documentId)
    .single()

  if (!doc) return { error: 'Document not found.' }
  if (doc.status === 'approved') return { error: 'Document is already approved.' }

  const previousStatus = doc.status

  const { error: docError } = await supabase
    .from('documents')
    .update({ status: 'approved', rejection_reason: null })
    .eq('id', documentId)

  if (docError) return { error: docError.message }

  // Promote this document to current and archive all other versions of same type.
  const { data: docFull } = await supabase
    .from('documents')
    .select('type')
    .eq('id', documentId)
    .single()

  if (docFull) {
    const { data: toArchive } = await supabase
      .from('documents').select('id')
      .eq('subcontractor_id', doc.subcontractor_id).eq('type', docFull.type).neq('id', documentId)

    await supabase.from('documents').update({ is_current: false })
      .eq('subcontractor_id', doc.subcontractor_id).eq('type', docFull.type).neq('id', documentId)
    await supabase.from('documents').update({ is_current: true }).eq('id', documentId)

    const archivedIds = (toArchive ?? []).map((d) => d.id)
    if (archivedIds.length > 0) {
      await supabase.from('document_events').insert(
        archivedIds.map((id) => ({
          document_id: id,
          event_type:  'superseded' as const,
          actor:       'System',
          metadata:    { superseded_by: documentId },
        })),
      )
    }
  }

  // Recalculate compliance from current documents only.
  const { data: currentDocs } = await supabase
    .from('documents')
    .select('status')
    .eq('subcontractor_id', doc.subcontractor_id)
    .eq('is_current', true)

  const cur = currentDocs ?? []
  const newCompliance =
    cur.some((d) => d.status === 'rejected')                   ? 'non_compliant' :
    cur.length > 0 && cur.every((d) => d.status === 'approved') ? 'compliant'     :
    cur.some((d) => d.status === 'pending_verification')        ? 'warning'       :
    'non_compliant'

  await supabase
    .from('subcontractors')
    .update({ compliance_status: newCompliance })
    .eq('id', doc.subcontractor_id)

  await supabase.from('document_events').insert({
    document_id: documentId,
    event_type:  'manual_override',
    actor:       actorName,
    metadata:    { note: trimmedNote, previous_status: previousStatus },
  })

  revalidatePath(`/gc/projects/${projectId}`)
  return { error: null, success: true }
}
