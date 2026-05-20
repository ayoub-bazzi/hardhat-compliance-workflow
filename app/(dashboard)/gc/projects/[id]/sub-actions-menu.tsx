'use client'

import { useActionState } from 'react'
import { useEffect, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import { AlertCircle, Loader2, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  MenuRoot, MenuTrigger, MenuContent, MenuItem, MenuDestructiveItem, MenuSeparator,
} from '@/components/ui/menu'
import {
  deleteSubcontractor,
  updateSubcontractor,
  type SubcontractorActionState,
} from '@/app/gc/projects/[id]/actions'

const initialEditState: SubcontractorActionState = { error: null }

function SaveButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending
        ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</>
        : 'Save Changes'}
    </Button>
  )
}

export function SubActionsMenu({
  subcontractorId,
  projectId,
  companyName,
  contactEmail,
}: {
  subcontractorId: string
  projectId: string
  companyName: string
  contactEmail: string
}) {
  const router = useRouter()

  const [editOpen,    setEditOpen]    = useState(false)
  const [deleteOpen,  setDeleteOpen]  = useState(false)
  const [deleting,    setDeleting]    = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Controlled state prevents the uncontrolled→controlled React warning.
  // Synced to props each time the dialog opens to pick up any server refresh.
  const [editCompany, setEditCompany] = useState(companyName)
  const [editEmail,   setEditEmail]   = useState(contactEmail)

  useEffect(() => {
    if (editOpen) {
      setEditCompany(companyName)
      setEditEmail(contactEmail)
    }
  }, [editOpen, companyName, contactEmail])

  const boundUpdate = updateSubcontractor.bind(null, subcontractorId, projectId)
  const [editState, editAction] = useActionState(boundUpdate, initialEditState)

  useEffect(() => {
    if (editState.success) { setEditOpen(false); router.refresh() }
  }, [editState.success, router])

  async function handleDelete() {
    setDeleting(true)
    setDeleteError(null)
    const result = await deleteSubcontractor(subcontractorId, projectId)
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
          <MenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="h-3.5 w-3.5" />
            Edit Details
          </MenuItem>
          <MenuSeparator />
          <MenuDestructiveItem onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-3.5 w-3.5" />
            Remove from Project
          </MenuDestructiveItem>
        </MenuContent>
      </MenuRoot>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Edit Subcontractor</DialogTitle>
          </DialogHeader>
          <form action={editAction} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-company">Company Name</Label>
              <Input
                id="edit-company"
                name="company_name"
                value={editCompany}
                onChange={(e) => setEditCompany(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-email">Contact Email</Label>
              <Input
                id="edit-email"
                name="contact_email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                required
              />
            </div>
            {editState.error && (
              <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {editState.error}
              </div>
            )}
            <DialogFooter showCloseButton>
              <SaveButton />
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={deleteOpen}
        onOpenChange={(v) => { setDeleteOpen(v); if (!v) setDeleteError(null) }}
      >
        <DialogContent className="sm:max-w-sm" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Remove Subcontractor?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-600">
              This will permanently remove{' '}
              <span className="font-semibold text-slate-900">{companyName}</span> and delete
              all their compliance documents. This cannot be undone.
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
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Removing…</>
                : <><Trash2 className="h-3.5 w-3.5" /> Remove</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
