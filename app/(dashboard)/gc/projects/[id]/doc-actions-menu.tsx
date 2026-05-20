'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Loader2, MoreHorizontal, Trash2, Upload } from 'lucide-react'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  MenuRoot, MenuTrigger, MenuContent, MenuDestructiveItem,
} from '@/components/ui/menu'
import { UploadDocumentDialog } from './upload-document-dialog'
import { deleteDocument } from '@/app/gc/projects/[id]/actions'
import type { DocumentType, Subcontractor } from '@/types/database.types'

export function DocActionsMenu({
  documentId,
  projectId,
}: {
  documentId: string
  projectId: string
}) {
  const router = useRouter()

  const [deleteOpen,  setDeleteOpen]  = useState(false)
  const [deleting,    setDeleting]    = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleDelete() {
    setDeleting(true)
    setDeleteError(null)
    const result = await deleteDocument(documentId, projectId)
    setDeleting(false)
    if (result.error) {
      setDeleteError(result.error)
    } else {
      setDeleteOpen(false)
      router.refresh()
    }
  }

  return (
    <>
      {/* Base UI Menu — renders via Portal, escapes table overflow */}
      <MenuRoot>
        <MenuTrigger className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Actions</span>
        </MenuTrigger>
        <MenuContent>
          <MenuDestructiveItem onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-3.5 w-3.5" />
            Delete Document
          </MenuDestructiveItem>
        </MenuContent>
      </MenuRoot>

      {/* Delete confirmation */}
      <Dialog
        open={deleteOpen}
        onOpenChange={(v) => { setDeleteOpen(v); if (!v) setDeleteError(null) }}
      >
        <DialogContent className="sm:max-w-sm" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete Document?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-600">
              This permanently removes the file from the compliance vault. The
              subcontractor&apos;s compliance status will be recalculated. This cannot be undone.
            </p>
            {deleteError && (
              <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {deleteError}
              </div>
            )}
          </div>
          <DialogFooter showCloseButton>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
              {deleting
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Deleting…</>
                : <><Trash2 className="h-3.5 w-3.5" /> Delete</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function ReplaceDocumentButton({
  projectId,
  subcontractors,
  defaultSubId,
  defaultDocType,
}: {
  projectId: string
  subcontractors: Subcontractor[]
  defaultSubId: string
  defaultDocType: DocumentType
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
      >
        <Upload className="h-3 w-3" />
        Upload Correct Version
      </button>
      <UploadDocumentDialog
        projectId={projectId}
        subcontractors={subcontractors}
        defaultSubId={defaultSubId}
        defaultDocType={defaultDocType}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}
