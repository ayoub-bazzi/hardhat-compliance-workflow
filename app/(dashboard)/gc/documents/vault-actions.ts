'use server'

import { createClient } from '@/lib/supabase'

export async function getBulkDownloadUrls(
  ids: string[]
): Promise<{ urls: { id: string; url: string }[]; errors: string[] }> {
  if (ids.length === 0) return { urls: [], errors: [] }

  const supabase = await createClient()

  const { data: docs } = await supabase
    .from('documents')
    .select('id, file_path')
    .in('id', ids)

  const urls: { id: string; url: string }[] = []
  const errors: string[] = []

  for (const doc of docs ?? []) {
    if (!doc.file_path) {
      errors.push(`${doc.id}: no file`)
      continue
    }
    const { data, error } = await supabase.storage
      .from('compliance-docs')
      .createSignedUrl(doc.file_path, 3600)

    if (error || !data) {
      errors.push(`${doc.id}: ${error?.message ?? 'unknown'}`)
    } else {
      urls.push({ id: doc.id, url: data.signedUrl })
    }
  }

  return { urls, errors }
}
