'use client'

import { useState, useTransition } from 'react'
import {
  ClipboardCheck, CheckCircle2, XCircle, Loader2, AlertTriangle,
  ShieldCheck, ShieldX, Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { reviewPrequal } from './prequal-actions'
import type { PrequalSubmission } from '@/types/database.types'

const STATUS_CONFIG = {
  pending:  { label: 'Awaiting Review',   cls: 'bg-amber-950  text-amber-400  ring-amber-700' },
  approved: { label: 'Approved',           cls: 'bg-emerald-950 text-emerald-400 ring-emerald-700' },
  rejected: { label: 'Rejected',           cls: 'bg-red-950    text-red-400    ring-red-700' },
} as const

export function PrequalReview({
  prequal,
  subId,
}: {
  prequal: PrequalSubmission
  subId: string
}) {
  const [notes,   setNotes]   = useState('')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [pending, startTransition] = useTransition()

  const status: 'pending' | 'approved' | 'rejected' = 'pending'
  const cfg    = STATUS_CONFIG[status]

  function handleReview(verdict: 'approved' | 'rejected') {
    setFeedback(null)
    startTransition(async () => {
      const result = await reviewPrequal(prequal.id, subId, verdict, notes)
      if (result.ok) {
        setFeedback({ type: 'success', msg: `Prequal ${verdict}.` })
        setNotes('')
      } else {
        setFeedback({ type: 'error', msg: result.error ?? 'Review failed.' })
      }
    })
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <ClipboardCheck className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-700">Prequalification Submission</h2>
        </div>
        <Badge className={`border-0 text-xs font-semibold ring-1 ${cfg.cls}`}>
          {cfg.label}
        </Badge>
      </div>

      <div className="p-5 space-y-4">
        {/* Prequal data */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Site Incident (12mo)
            </p>
            <div className="flex items-center gap-1.5">
              {prequal.had_site_incident ? (
                <><AlertTriangle className="h-4 w-4 text-red-500" /><span className="text-sm font-semibold text-red-600">Yes</span></>
              ) : (
                <><ShieldCheck className="h-4 w-4 text-emerald-500" /><span className="text-sm font-semibold text-emerald-600">No</span></>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Bonding Capacity
            </p>
            <p className="text-sm font-semibold text-slate-800">
              {prequal.bonding_capacity_usd != null
              ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(prequal.bonding_capacity_usd)
              : <span className="italic text-slate-400">Not provided</span>}
            </p>
          </div>

          <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Trade Accreditation
            </p>
            <p className="text-sm font-semibold text-slate-800">
              {prequal.trade_accreditation_no ?? <span className="italic text-slate-400">Not provided</span>}
            </p>
          </div>
        </div>

        {prequal.submitted_at && (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Clock className="h-3 w-3" />
            Submitted {new Date(prequal.submitted_at).toLocaleDateString('en-US', {
              month: 'long', day: 'numeric', year: 'numeric',
            })}
          </div>
        )}

        {/* Review actions (pending only) */}
        {status === 'pending' && (
          <div className="space-y-3 border-t border-slate-100 pt-4">
            <div>
              <label htmlFor="prequal-notes" className="mb-1.5 block text-xs font-medium text-slate-700">
                Review Notes <span className="text-slate-400">(optional)</span>
              </label>
              <textarea
                id="prequal-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes for the subcontractor…"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={() => handleReview('approved')}
                disabled={pending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <><CheckCircle2 className="mr-1.5 h-4 w-4" /> Approve</>
                )}
              </Button>
              <Button
                onClick={() => handleReview('rejected')}
                disabled={pending}
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <><XCircle className="mr-1.5 h-4 w-4" /> Reject</>
                )}
              </Button>
            </div>

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
        )}
      </div>
    </div>
  )
}
