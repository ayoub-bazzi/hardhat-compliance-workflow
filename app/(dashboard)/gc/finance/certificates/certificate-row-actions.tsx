'use client'

import { useState, useTransition } from 'react'
import {
  ShieldCheck, ShieldX, Loader2, CheckCircle2, AlertTriangle,
  Lock, Unlock, ChevronDown, ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { reviewCertificate, releaseCertificate } from './certificate-actions'
import type { CertStatus } from '@/types/database.types'

const STATUS_CONFIG: Record<CertStatus, { label: string; cls: string }> = {
  pending:  { label: 'Pending Review', cls: 'bg-slate-100 text-slate-600 ring-slate-300' },
  escrowed: { label: 'Escrowed',       cls: 'bg-amber-100 text-amber-700 ring-amber-300' },
  approved: { label: 'Approved',       cls: 'bg-emerald-100 text-emerald-700 ring-emerald-300' },
  released: { label: 'Released',       cls: 'bg-indigo-100 text-indigo-700 ring-indigo-300' },
}

export function CertificateStatusBadge({ status }: { status: CertStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

export function CertificateRowActions({
  certId,
  status,
  riskScore,
  holdReason,
  discrepancyFlagged,
}: {
  certId:             string
  status:             CertStatus
  riskScore:          number
  holdReason:         string | null
  discrepancyFlagged: boolean
}) {
  const [pending, start]      = useTransition()
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [releaseReason, setReleaseReason] = useState('')
  const [showRelease, setShowRelease]     = useState(false)
  const [showHoldInfo, setShowHoldInfo]   = useState(false)

  function handleReview() {
    setFeedback(null)
    start(async () => {
      const res = await reviewCertificate(certId, riskScore)
      setFeedback(res.ok
        ? { type: 'success', msg: riskScore > 30 ? 'Escrowed — compliance hold applied.' : 'Certificate approved.' }
        : { type: 'error', msg: res.error ?? 'Action failed.' })
    })
  }

  function handleRelease() {
    setFeedback(null)
    start(async () => {
      const res = await releaseCertificate(certId, releaseReason)
      if (res.ok) {
        setFeedback({ type: 'success', msg: 'Payment released.' })
        setShowRelease(false)
        setReleaseReason('')
      } else {
        setFeedback({ type: 'error', msg: res.error ?? 'Release failed.' })
      }
    })
  }

  if (status === 'released') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
        <CheckCircle2 className="h-3.5 w-3.5" /> Released
      </span>
    )
  }

  return (
    <div className="space-y-2">
      {/* Discrepancy warning */}
      {discrepancyFlagged && (
        <div className="flex items-center gap-1.5 text-[10px] text-amber-700 font-semibold">
          <AlertTriangle className="h-3 w-3 shrink-0" /> Invoice discrepancy
        </div>
      )}

      {/* Risk block indicator */}
      {riskScore > 30 && status === 'pending' && (
        <div className="flex items-center gap-1.5 text-[10px] text-amber-700">
          <Lock className="h-3 w-3 shrink-0" />
          <span>Score {riskScore} → will escrow</span>
        </div>
      )}

      {/* Pending: Review button */}
      {status === 'pending' && (
        <Button
          size="sm"
          disabled={pending}
          onClick={handleReview}
          className={riskScore > 30
            ? 'bg-amber-500 hover:bg-amber-600 text-slate-900 text-xs h-7 px-3'
            : 'bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 px-3'
          }
        >
          {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : (
            riskScore > 30
              ? <><Lock className="mr-1 h-3 w-3" /> Escrow</>
              : <><ShieldCheck className="mr-1 h-3 w-3" /> Approve</>
          )}
        </Button>
      )}

      {/* Escrowed: hold info + release */}
      {status === 'escrowed' && (
        <>
          <button
            type="button"
            onClick={() => setShowHoldInfo((v) => !v)}
            className="flex items-center gap-1 text-[10px] text-amber-700 hover:text-amber-900 font-medium"
          >
            <ShieldX className="h-3 w-3" /> Hold reason
            {showHoldInfo ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {showHoldInfo && holdReason && (
            <p className="text-[10px] text-amber-800 border border-amber-200 bg-amber-50 rounded px-2 py-1.5 max-w-[200px]">
              {holdReason}
            </p>
          )}
          <button
            type="button"
            onClick={() => setShowRelease((v) => !v)}
            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
          >
            <Unlock className="h-3.5 w-3.5" /> Release escrow
          </button>
        </>
      )}

      {/* Approved: release immediately */}
      {status === 'approved' && (
        <button
          type="button"
          onClick={() => setShowRelease((v) => !v)}
          className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
        >
          <Unlock className="h-3.5 w-3.5" /> Release payment
        </button>
      )}

      {/* Release confirmation form */}
      {showRelease && (
        <div className="space-y-2 border border-slate-200 rounded-lg p-2.5 bg-slate-50">
          <textarea
            rows={2}
            value={releaseReason}
            onChange={(e) => setReleaseReason(e.target.value)}
            placeholder="Reason for release (required)…"
            className="w-full text-xs rounded border border-slate-200 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={pending || !releaseReason.trim()}
              onClick={handleRelease}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-7 px-3"
            >
              {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Confirm'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowRelease(false)}
              className="text-xs h-7 px-3"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {feedback && (
        <div className={`flex items-center gap-1.5 text-[10px] font-semibold ${
          feedback.type === 'success' ? 'text-emerald-700' : 'text-red-600'
        }`}>
          {feedback.type === 'success'
            ? <CheckCircle2 className="h-3 w-3 shrink-0" />
            : <AlertTriangle className="h-3 w-3 shrink-0" />
          }
          {feedback.msg}
        </div>
      )}
    </div>
  )
}
