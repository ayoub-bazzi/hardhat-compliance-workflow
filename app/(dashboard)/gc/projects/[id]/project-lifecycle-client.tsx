'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Archive, ArchiveRestore, Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { archiveProject, unarchiveProject, deleteProject } from './project-lifecycle-actions'

export function ProjectLifecycleControls({
  projectId,
  projectName,
  currentStatus,
}: {
  projectId: string
  projectName: string
  currentStatus: 'active' | 'archived'
}) {
  const router = useRouter()
  const [archiving, setArchiving]   = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [confirmName, setConfirmName] = useState('')
  const [deleting, setDeleting]     = useState(false)
  const [error, setError]           = useState<string | null>(null)

  async function handleArchiveToggle() {
    setArchiving(true)
    setError(null)
    const action = currentStatus === 'active' ? archiveProject : unarchiveProject
    const result = await action(projectId)
    if (result.error) {
      setError(result.error)
    } else {
      router.refresh()
    }
    setArchiving(false)
  }

  function openDeleteModal() {
    setConfirmName('')
    setError(null)
    setDeleteOpen(true)
  }

  async function handleDelete() {
    if (confirmName !== projectName) return
    setDeleting(true)
    setError(null)
    const result = await deleteProject(projectId)
    if (result.error) {
      setError(result.error)
      setDeleting(false)
    } else {
      router.push('/gc/projects')
    }
  }

  return (
    <div className="rounded-xl border border-red-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-red-700">Danger Zone</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          These actions affect project visibility and data. Deletion cannot be undone.
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          onClick={handleArchiveToggle}
          disabled={archiving}
          className="gap-2 border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
        >
          {archiving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : currentStatus === 'active' ? (
            <Archive className="h-4 w-4" />
          ) : (
            <ArchiveRestore className="h-4 w-4" />
          )}
          {currentStatus === 'active' ? 'Archive Project' : 'Restore to Active'}
        </Button>

        <Button
          variant="outline"
          onClick={openDeleteModal}
          className="gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          <Trash2 className="h-4 w-4" />
          Permanently Delete
        </Button>
      </div>

      <Dialog open={deleteOpen} onOpenChange={(v) => { if (!deleting) setDeleteOpen(v) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <Trash2 className="h-5 w-5" />
              Permanently Delete Project
            </DialogTitle>
            <DialogDescription className="pt-1 leading-relaxed">
              This will permanently delete{' '}
              <strong className="text-slate-900">{projectName}</strong> and cascade-remove all
              subcontractors, documents, and audit trail entries. This action{' '}
              <strong className="text-red-700">cannot be undone</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-1">
            <Label htmlFor="confirm-name" className="text-sm font-medium text-slate-700">
              Type{' '}
              <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-900">
                {projectName}
              </span>{' '}
              to confirm
            </Label>
            <Input
              id="confirm-name"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={projectName}
              disabled={deleting}
              autoComplete="off"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={confirmName !== projectName || deleting}
              className="gap-2 bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
            >
              {deleting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Deleting…</>
              ) : (
                <><Trash2 className="h-4 w-4" /> Delete Forever</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
