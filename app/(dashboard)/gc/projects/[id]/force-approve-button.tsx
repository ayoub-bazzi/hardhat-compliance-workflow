'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2, ShieldCheck, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { forceApproveDocument } from '@/app/gc/projects/[id]/audit-trail-actions'

type Toast = { message: string; type: 'success' | 'error' }

export function ForceApproveButton({
  documentId,
  projectId,
}: {
  documentId: string
  projectId: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)

  function handleOpen() {
    setOpen(true)
    setError(null)
  }

  function handleClose() {
    setOpen(false)
    setNote('')
    setError(null)
  }

  async function handleApprove() {
    setLoading(true)
    setError(null)

    const result = await forceApproveDocument(documentId, projectId, note)
    setLoading(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setToast({ message: 'Document manually approved.', type: 'success' })
    handleClose()
    router.refresh()
    setTimeout(() => setToast(null), 4500)
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleOpen}
        className="h-7 gap-1.5 border-emerald-200 text-xs text-emerald-700 hover:bg-emerald-50 hover:text-emerald-900"
      >
        <ShieldCheck className="h-3 w-3" />
        Force Approve
      </Button>

      {/* Confirmation modal — fixed position escapes table overflow */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-sm font-semibold text-slate-900">Manual Approval</h3>
            <p className="mt-1 text-xs text-slate-500">
              Override the AI result and approve this document. A note is required for the audit trail.
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Reviewed original document — coverage confirmed"
              rows={3}
              className="mt-3 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              disabled={loading}
            />
            {error && (
              <p className="mt-1.5 text-xs text-red-600">{error}</p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleApprove}
                disabled={loading || !note.trim()}
                className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {loading ? (
                  <><Loader2 className="h-3 w-3 animate-spin" />Approving…</>
                ) : (
                  <><ShieldCheck className="h-3 w-3" />Approve</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Fixed position toast escapes table overflow */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-50 flex w-72 items-start gap-2 rounded-lg border px-3 py-2.5 text-xs shadow-lg ${
            toast.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          ) : (
            <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          )}
          {toast.message}
        </div>
      )}
    </>
  )
}
