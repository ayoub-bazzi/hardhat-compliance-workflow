'use server'

import { createClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import type { DocumentType } from '@/types/database.types'
import { runAiReview } from '@/app/gc/projects/[id]/ai-actions'

export type SubUploadState = { error: string | null; success?: boolean }

export async function uploadSubDocument(
  prevState: SubUploadState,
  formData: FormData,
): Promise<SubUploadState> {
  const supabase = await createClient()

  const subcontractorId = (formData.get('subcontractor_id') as string ?? '').trim()
  const projectId       = (formData.get('project_id')       as string ?? '').trim()
  const documentType    = (formData.get('document_type')    as string ?? '').trim() as DocumentType
  const expiryDate      = (formData.get('expiry_date')      as string ?? '').trim()
  const file            = formData.get('file') as File | null

  if (!subcontractorId || !projectId) return { error: 'Missing subcontractor context.' }
  if (!documentType)                  return { error: 'Please select a document type.' }
  if (!file || file.size === 0)       return { error: 'Please attach a file.' }

  const allowed = ['application/pdf', 'image/png', 'image/jpeg']
  if (!allowed.includes(file.type)) {
    return { error: 'Only PDF, PNG, and JPEG files are allowed.' }
  }

  const sanitized = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const filePath  = `${projectId}/${subcontractorId}/${Date.now()}-${sanitized}`

  const { error: uploadError } = await supabase.storage
    .from('compliance-docs')
    .upload(filePath, file, { contentType: file.type, cacheControl: '3600', upsert: false })

  if (uploadError) return { error: `Upload failed: ${uploadError.message}` }

  const { data: insertedDoc, error: dbError } = await supabase
    .from('documents')
    .insert({
      subcontractor_id: subcontractorId,
      type:             documentType,
      status:           'pending',
      expiry_date:      expiryDate || null,
      file_path:        filePath,
    })
    .select('id')
    .single()

  if (dbError) {
    await supabase.storage.from('compliance-docs').remove([filePath])
    return { error: dbError.message }
  }

  // Auto-run AI review — non-fatal if Gemini is unavailable.
  await runAiReview(insertedDoc!.id, projectId).catch(() => {
    revalidatePath('/subcontractor/portal')
  })

  return { error: null, success: true }
}
