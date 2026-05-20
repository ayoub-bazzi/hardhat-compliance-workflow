import { redirect } from 'next/navigation'
import { ShieldCheck, ShieldAlert, Clock, FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { createClient } from '@/lib/supabase'
import type { Document, DocumentStatus } from '@/types/database.types'

function DocStatusBadge({ status }: { status: DocumentStatus }) {
  if (status === 'approved') {
    return (
      <Badge className="border-0 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 gap-1">
        <ShieldCheck className="h-3 w-3" /> Approved
      </Badge>
    )
  }
  if (status === 'rejected') {
    return (
      <Badge className="border-0 bg-red-100 text-red-700 hover:bg-red-100 gap-1">
        <ShieldAlert className="h-3 w-3" /> Rejected
      </Badge>
    )
  }
  return (
    <Badge className="border-0 bg-amber-100 text-amber-700 hover:bg-amber-100 gap-1">
      <Clock className="h-3 w-3" /> Pending
    </Badge>
  )
}

export default async function SubDocumentsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Claim any unclaimed records before querying (idempotent).
  await supabase.rpc('fn_claim_subcontractor_identity')

  // Query by user_id — the cryptographic binding, not a plain-text email.
  const { data: subRows } = await supabase
    .from('subcontractors')
    .select('id, company_name, project_id, projects(id, name)')
    .eq('user_id', user.id)

  const subs = subRows ?? []
  const subIds = subs.map((s) => s.id)

  const { data: docsRaw } = subIds.length > 0
    ? await supabase
        .from('documents')
        .select('*')
        .in('subcontractor_id', subIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  const docs = (docsRaw ?? []) as Document[]

  // Build lookup: subId → project name
  const projectBySubId = Object.fromEntries(
    subs.map((s) => {
      const project = s.projects as { id: string; name: string } | null
      return [s.id, project?.name ?? '—']
    })
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Documents</h1>
        <p className="mt-1 text-sm text-slate-500">
          All compliance documents you have submitted across every project.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="font-semibold text-slate-700 w-10" />
              <TableHead className="font-semibold text-slate-700">Document Type</TableHead>
              <TableHead className="font-semibold text-slate-700">Project</TableHead>
              <TableHead className="font-semibold text-slate-700">Status</TableHead>
              <TableHead className="font-semibold text-slate-700">Expiry</TableHead>
              <TableHead className="font-semibold text-slate-700">Uploaded</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {docs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <FileText className="h-8 w-8" />
                    <p className="text-sm font-medium">No documents uploaded yet</p>
                    <p className="text-xs">Visit My Portal to upload compliance documents.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              docs.map((doc) => (
                <TableRow key={doc.id} className="hover:bg-slate-50">
                  <TableCell>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                      <FileText className="h-4 w-4 text-slate-500" />
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-slate-900">{doc.type}</TableCell>
                  <TableCell className="text-slate-600 text-sm">
                    {projectBySubId[doc.subcontractor_id] ?? '—'}
                  </TableCell>
                  <TableCell>
                    <DocStatusBadge status={doc.status} />
                    {doc.status === 'rejected' && doc.rejection_reason && (
                      <p className="mt-1 text-xs text-red-500 max-w-[200px] leading-relaxed">
                        {doc.rejection_reason}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {doc.expiry_date
                      ? new Date(doc.expiry_date).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric',
                        })
                      : '—'}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {new Date(doc.created_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
