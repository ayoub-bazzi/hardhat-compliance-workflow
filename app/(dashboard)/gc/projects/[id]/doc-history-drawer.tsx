'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, AlertCircle, Loader2, Trash2 } from 'lucide-react'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { deleteDocument } from '@/app/gc/projects/[id]/actions'
import type { DocumentStatus, DocumentType } from '@/types/database.types'

type HistoryDoc = {
  id: string
  status: DocumentStatus
  expiry_date: string | null
  rejection_reason: string | null
  created_at: string
}

const STATUS_CONFIG: Record<DocumentStatus, { style: string; label: string }> = {
  pending:              { style: 'border-0 bg-indigo-100  text-indigo-700',  label: 'Scanning…'       },
  approved:             { style: 'border-0 bg-emerald-100 text-emerald-700', label: 'Approved'        },
  rejected:             { style: 'border-0 bg-red-100     text-red-700',     label: 'Rejected'        },
  pending_verification: { style: 'border-0 bg-slate-100   text-slate-600',   label: 'Needs GC Review' },
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function DocHistoryDrawer({
  documentType,
  subcontractorName,
  historyDocs,
  projectId,
}: {
  documentType: DocumentType | string
  subcontractorName: string
  historyDocs: HistoryDoc[]
  projectId: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const count = historyDocs.length

  async function handleDelete(docId: string) {
    if (!window.confirm('Permanently delete this version? This cannot be undone.')) return
    setDeleting(docId)
    await deleteDocument(docId, projectId)
    setDeleting(null)
    router.refresh()
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={count > 0 ? `${count} previous version${count !== 1 ? 's' : ''}` : 'No previous versions'}
        className="inline-flex items-center gap-0.5 rounded p-1 text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
      >
        <Clock className="h-3.5 w-3.5" />
        {count > 0 && (
          <span className="text-[10px] font-semibold tabular-nums">{count}</span>
        )}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex flex-col gap-0 p-0 sm:max-w-sm">

          <SheetHeader className="border-b border-slate-100 px-6 py-5">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                <Clock className="h-3.5 w-3.5 text-slate-600" />
              </div>
              <SheetTitle className="text-base">Version History</SheetTitle>
            </div>
            <SheetDescription className="mt-1 text-sm">
              <span className="font-semibold text-slate-700">{documentType}</span>
              {' · '}
              <span className="text-slate-500">{subcontractorName}</span>
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto bg-slate-50 px-5 py-5">
            {historyDocs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200">
                  <Clock className="h-5 w-5 text-slate-400" />
                </div>
                <p className="mt-3 text-sm font-medium text-slate-700">No previous versions</p>
                <p className="mt-1 text-xs text-slate-400">
                  Superseded uploads appear here once a new version is approved.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {historyDocs.map((doc, i) => {
                  const cfg = STATUS_CONFIG[doc.status] ?? STATUS_CONFIG.pending
                  const isBeingDeleted = deleting === doc.id
                  return (
                    <div
                      key={doc.id}
                      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge className={cfg.style}>{cfg.label}</Badge>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-400">{fmt(doc.created_at)}</span>
                          <button
                            type="button"
                            onClick={() => handleDelete(doc.id)}
                            disabled={isBeingDeleted}
                            title="Delete this version"
                            className="flex h-6 w-6 items-center justify-center rounded text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                          >
                            {isBeingDeleted
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>

                      {doc.expiry_date && (
                        <p className="mt-2 text-xs text-slate-500">
                          Expiry:{' '}
                          <span className="font-medium text-slate-700">{fmt(doc.expiry_date)}</span>
                        </p>
                      )}

                      {doc.rejection_reason && (
                        <div className="mt-2 flex items-start gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5">
                          <AlertCircle className="mt-0.5 h-3 w-3 shrink-0 text-red-500" />
                          <span className="text-xs leading-snug text-red-700">
                            {doc.rejection_reason}
                          </span>
                        </div>
                      )}

                      <p className="mt-2.5 text-[10px] text-slate-400">
                        v{historyDocs.length - i} of {historyDocs.length + 1}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </SheetContent>
      </Sheet>
    </>
  )
}
