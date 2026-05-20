'use client'

import { useState, useTransition } from 'react'
import { AlertTriangle, X, Loader2 } from 'lucide-react'
import { releaseComplianceHold } from './finance-actions'

export function ReleaseButton({
  subId,
  companyName,
}: {
  subId: string
  companyName: string
}) {
  const [open, setOpen]       = useState(false)
  const [reason, setReason]   = useState('')
  const [error, setError]     = useState<string | null>(null)
  const [isPending, start]    = useTransition()

  function close() {
    setOpen(false)
    setReason('')
    setError(null)
  }

  function submit() {
    if (!reason.trim()) { setError('Override reason is required.'); return }
    start(async () => {
      const res = await releaseComplianceHold(subId, reason)
      if (res.ok) { close() } else { setError(res.error ?? 'Unknown error.') }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-600"
      >
        <AlertTriangle className="h-3 w-3" />
        Release Hold
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) close() }}
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
            {/* Modal header */}
            <div className="flex items-start justify-between border-b border-slate-800 px-6 py-4">
              <div>
                <h3 className="text-base font-bold text-white">Release Compliance Hold</h3>
                <p className="mt-0.5 text-sm text-slate-400">{companyName}</p>
              </div>
              <button
                type="button"
                onClick={close}
                className="rounded-lg p-1 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Warning banner */}
              <div className="flex items-start gap-3 rounded-xl border border-amber-800/50 bg-amber-950/40 px-4 py-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <p className="text-xs leading-relaxed text-amber-300">
                  This will move <strong className="text-amber-200">{companyName}</strong> from{' '}
                  <strong className="text-red-400">Compliance Hold</strong> to{' '}
                  <strong className="text-amber-400">Manual Review</strong>. This action is{' '}
                  <strong className="text-white">permanently recorded</strong> in the Golden Thread audit ledger.
                </p>
              </div>

              {/* Reason field */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Override Reason <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => { setReason(e.target.value); setError(null) }}
                  placeholder="Provide a specific, documented reason for this override (e.g. 'Verbal confirmation received from broker — updated COI in transit, expires 2025-09-01')."
                  rows={4}
                  className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 transition focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                />
                {error && <p className="mt-1.5 text-xs font-medium text-red-400">{error}</p>}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 border-t border-slate-800 px-6 py-4">
              <button
                type="button"
                onClick={close}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={isPending || !reason.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isPending ? 'Processing…' : 'Confirm Override'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
