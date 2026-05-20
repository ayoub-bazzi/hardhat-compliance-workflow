import { createClient } from '@/lib/supabase'
import { DocumentVault } from './document-vault'
import type { DocumentType, DocumentStatus } from '@/types/database.types'

export type VaultDoc = {
  id: string
  type: DocumentType
  status: DocumentStatus
  expiry_date: string | null
  file_path: string | null
  created_at: string
  companyName: string
  projectName: string
  projectId: string
}

export default async function DocumentsPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('documents')
    .select('id, type, status, expiry_date, file_path, created_at, subcontractors(company_name, projects(id, name))')
    .order('created_at', { ascending: false })

  const docs: VaultDoc[] = (data ?? []).map((row) => {
    const sub = row.subcontractors as {
      company_name: string
      projects: { id: string; name: string } | null
    } | null

    return {
      id: row.id,
      type: row.type,
      status: row.status,
      expiry_date: row.expiry_date,
      file_path: row.file_path,
      created_at: row.created_at,
      companyName: sub?.company_name ?? '—',
      projectName: sub?.projects?.name ?? '—',
      projectId: sub?.projects?.id ?? '',
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Document Vault</h1>
        <p className="mt-1 text-sm text-slate-500">
          All compliance documents across every project —{' '}
          {docs.length} document{docs.length !== 1 ? 's' : ''}
        </p>
      </div>
      <DocumentVault docs={docs} />
    </div>
  )
}
