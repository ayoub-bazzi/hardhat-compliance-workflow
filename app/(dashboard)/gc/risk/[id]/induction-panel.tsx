'use client'

import { useState, useTransition } from 'react'
import { ShieldCheck, ShieldX, Loader2, CheckCircle2, AlertTriangle, GraduationCap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { markInductionComplete, revokeInduction } from './induction-actions'

export function InductionPanel({
  subId,
  isComplete,
  inductionDate,
}: {
  subId: string
  isComplete: boolean
  inductionDate: string | null
}) {
  const [complete, setComplete]   = useState(isComplete)
  const [date, setDate]           = useState(inductionDate)
  const [feedback, setFeedback]   = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [confirm, setConfirm]     = useState(false)
  const [pending, startTransition] = useTransition()

  function handleMark() {
    setFeedback(null)
    startTransition(async () => {
      const res = await markInductionComplete(subId)
      if (res.ok) {
        setComplete(true)
        setDate(new Date().toISOString().split('T')[0])
        setFeedback({ type: 'success', msg: 'Induction marked complete. Site access enabled.' })
        setConfirm(false)
      } else {
        setFeedback({ type: 'error', msg: res.error ?? 'Action failed.' })
      }
    })
  }

  function handleRevoke() {
    setFeedback(null)
    startTransition(async () => {
      const res = await revokeInduction(subId)
      if (res.ok) {
        setComplete(false)
        setDate(null)
        setFeedback({ type: 'success', msg: 'Induction revoked. Worker will be DENIED at gate.' })
        setConfirm(false)
      } else {
        setFeedback({ type: 'error', msg: res.error ?? 'Action failed.' })
      }
    })
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <GraduationCap className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-700">Safety Induction</h2>
        </div>
        <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${
          complete
            ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
            : 'bg-red-50 text-red-700 ring-red-200'
        }`}>
          {complete
            ? <><ShieldCheck className="h-3.5 w-3.5" /> Inducted</>
            : <><ShieldX className="h-3.5 w-3.5" /> Not Inducted</>
          }
        </div>
      </div>

      <div className="p-5 space-y-4">
        {complete ? (
          <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">Site induction complete</p>
              {date && (
                <p className="mt-0.5 text-xs text-emerald-700">
                  Completed {new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Induction required</p>
              <p className="mt-0.5 text-xs text-amber-700">
                This worker will be DENIED at the gate until a safety induction is completed and recorded.
              </p>
            </div>
          </div>
        )}

        {!complete && !confirm && (
          <Button
            onClick={() => setConfirm(true)}
            disabled={pending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <GraduationCap className="mr-1.5 h-4 w-4" />
            Mark Induction Complete
          </Button>
        )}

        {!complete && confirm && (
          <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-900">
              Confirm that the worker has physically completed the site safety induction briefing?
            </p>
            <div className="flex gap-3">
              <Button
                onClick={handleMark}
                disabled={pending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle2 className="mr-1.5 h-4 w-4" /> Confirm</>}
              </Button>
              <Button
                variant="outline"
                onClick={() => setConfirm(false)}
                disabled={pending}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {complete && (
          <button
            type="button"
            onClick={handleRevoke}
            disabled={pending}
            className="text-xs text-slate-400 hover:text-red-600 transition-colors disabled:opacity-50"
          >
            {pending ? 'Revoking…' : 'Revoke induction'}
          </button>
        )}

        {feedback && (
          <div className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm ${
            feedback.type === 'success'
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border border-red-200 bg-red-50 text-red-800'
          }`}>
            {feedback.type === 'success'
              ? <CheckCircle2 className="h-4 w-4 shrink-0" />
              : <AlertTriangle className="h-4 w-4 shrink-0" />
            }
            {feedback.msg}
          </div>
        )}
      </div>
    </div>
  )
}
