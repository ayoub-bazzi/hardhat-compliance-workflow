'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  History, Upload, Bot, Mail, User, Archive,
  Loader2, CheckCircle2, AlertTriangle, XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from '@/components/ui/sheet'
import {
  getDocumentHistory,
  forceApproveDocument,
} from '@/app/gc/projects/[id]/audit-trail-actions'
import type { DocumentEvent, DocumentEventType, DocumentStatus } from '@/types/database.types'

// ── Event display config ────────────────────────────────────────

const EVENT_CONFIG: Record<DocumentEventType, {
  Icon: React.ElementType
  iconBg: string
  iconColor: string
  label: string
}> = {
  uploaded: {
    Icon: Upload,
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-600',
    label: 'Document Uploaded',
  },
  ai_review: {
    Icon: Bot,
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
    label: 'AI Review',
  },
  notification_sent: {
    Icon: Mail,
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    label: 'Notification Sent',
  },
  manual_override: {
    Icon: User,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-700',
    label: 'Manual Approval',
  },
  superseded: {
    Icon: Archive,
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-500',
    label: 'Version Archived',
  },
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const fmtCurrency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

// ── Timeline event ──────────────────────────────────────────────

function TimelineEvent({ event, isLast }: { event: DocumentEvent; isLast: boolean }) {
  const cfg = EVENT_CONFIG[event.event_type] ?? EVENT_CONFIG.uploaded
  const { Icon, iconBg, iconColor, label } = cfg
  const meta = event.metadata

  return (
    <div className="flex gap-3">
      {/* Dot + connector line */}
      <div className="flex flex-col items-center">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
          <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
        </div>
        {!isLast && <div className="mt-1 w-px flex-1 min-h-[20px] bg-slate-200" />}
      </div>

      {/* Content */}
      <div className={`min-w-0 flex-1 ${isLast ? 'pb-0' : 'pb-5'}`}>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-semibold text-slate-900">{label}</span>

          {event.event_type === 'ai_review' && meta.result && (
            <Badge className={
              meta.result === 'approved'
                ? 'border-0 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px] px-1.5 py-0'
                : meta.result === 'pending_verification'
                  ? 'border-0 bg-amber-100 text-amber-700 hover:bg-amber-100 text-[10px] px-1.5 py-0'
                  : 'border-0 bg-red-100 text-red-700 hover:bg-red-100 text-[10px] px-1.5 py-0'
            }>
              {meta.result === 'approved' ? '✓ Approved'
               : meta.result === 'pending_verification' ? '⚠ Needs Review'
               : '✗ Rejected'}
            </Badge>
          )}

          {event.event_type === 'manual_override' && (
            <Badge className="border-0 bg-amber-100 text-amber-700 hover:bg-amber-100 text-[10px] px-1.5 py-0">
              Overridden
            </Badge>
          )}
        </div>

        <div className="mt-1 space-y-1">
          {/* Uploaded / Manual override — show actor */}
          {event.actor && (event.event_type === 'uploaded' || event.event_type === 'manual_override') && (
            <p className="text-xs text-slate-500">
              {event.event_type === 'uploaded' ? 'Uploaded by ' : 'Approved by '}
              <span className="font-medium text-slate-700">{event.actor}</span>
            </p>
          )}

          {/* AI review — extracted fields */}
          {event.event_type === 'ai_review' && (
            <div className="space-y-0.5">
              {meta.extracted_company && (
                <p className="text-xs text-slate-500">
                  Company: <span className="font-medium text-slate-700">{meta.extracted_company}</span>
                </p>
              )}
              {meta.expiry_date && (
                <p className="text-xs text-slate-500">
                  Expiry: <span className="font-medium text-slate-700">{formatDate(meta.expiry_date)}</span>
                </p>
              )}
              {meta.coverage_amount != null && (
                <p className="text-xs text-slate-500">
                  Coverage: <span className="font-medium text-emerald-600">{fmtCurrency.format(meta.coverage_amount)}</span>
                </p>
              )}
              {meta.reason && (
                <p className="mt-0.5 text-xs text-red-600">{meta.reason}</p>
              )}
            </div>
          )}

          {/* Notification sent */}
          {event.event_type === 'notification_sent' && meta.recipient && (
            <p className="text-xs text-slate-500">
              Sent to <span className="font-medium text-slate-700">{meta.recipient}</span>
            </p>
          )}

          {/* Manual override — note + previous status */}
          {event.event_type === 'manual_override' && meta.note && (
            <p className="text-xs text-amber-700 italic">"{meta.note}"</p>
          )}
          {event.event_type === 'manual_override' && meta.previous_status && (
            <p className="text-xs text-slate-400">
              Previous status: {meta.previous_status}
            </p>
          )}

          {/* Superseded */}
          {event.event_type === 'superseded' && meta.superseded_by && (
            <p className="text-xs text-slate-500">
              Archived by new upload{' '}
              <span className="font-mono text-[11px] text-slate-600">
                #{meta.superseded_by.slice(0, 8)}
              </span>
            </p>
          )}
        </div>

        <p className="mt-1.5 text-[11px] text-slate-400">{formatDateTime(event.created_at)}</p>
      </div>
    </div>
  )
}

// ── Skeleton ────────────────────────────────────────────────────

function TimelineSkeleton() {
  return (
    <div className="space-y-5">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
          <div className="flex-1 space-y-1.5 pt-1">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-52" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────

export function AuditTrailButton({
  documentId,
  projectId,
  documentStatus,
  documentType,
  subcontractorName,
}: {
  documentId: string
  projectId: string
  documentStatus: DocumentStatus
  documentType: string
  subcontractorName: string
}) {
  const router = useRouter()

  const [open, setOpen]               = useState(false)
  const [events, setEvents]           = useState<DocumentEvent[]>([])
  const [loading, setLoading]         = useState(false)
  const [fetchError, setFetchError]   = useState<string | null>(null)

  // Force-approve form state
  const [overriding, setOverriding]       = useState(false)
  const [note, setNote]                   = useState('')
  const [submitting, setSubmitting]       = useState(false)
  const [overrideError, setOverrideError] = useState<string | null>(null)
  const [overrideSuccess, setOverrideSuccess] = useState(false)

  const loadHistory = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    const result = await getDocumentHistory(documentId)
    setEvents(result.events)
    setFetchError(result.error)
    setLoading(false)
  }, [documentId])

  function handleOpen() {
    setOpen(true)
    loadHistory()
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setOverriding(false)
      setNote('')
      setOverrideError(null)
    }
  }

  async function handleForceApprove() {
    if (!note.trim()) {
      setOverrideError('A note is required.')
      return
    }
    setSubmitting(true)
    setOverrideError(null)
    const result = await forceApproveDocument(documentId, projectId, note)
    setSubmitting(false)

    if (result.error) {
      setOverrideError(result.error)
    } else {
      setOverrideSuccess(true)
      setOverriding(false)
      setNote('')
      router.refresh()
      // Reload history to show the new manual_override event
      await loadHistory()
      setTimeout(() => setOverrideSuccess(false), 4000)
    }
  }

  const canOverride = documentStatus !== 'approved'

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        title="View audit trail"
        className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
      >
        <History className="h-3.5 w-3.5" />
      </button>

      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent side="right" className="flex flex-col gap-0 p-0 sm:max-w-md">

          {/* Header */}
          <SheetHeader className="border-b border-slate-100 px-6 py-5">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100">
                <History className="h-3.5 w-3.5 text-slate-600" />
              </div>
              <SheetTitle className="text-base">Audit Trail</SheetTitle>
            </div>
            <SheetDescription className="mt-1 text-sm">
              <span className="font-semibold text-slate-700">{documentType}</span>
              {' · '}
              <span className="text-slate-500">{subcontractorName}</span>
            </SheetDescription>
          </SheetHeader>

          {/* Timeline */}
          <div className="flex-1 overflow-y-auto bg-slate-50 px-6 py-5">
            {loading ? (
              <TimelineSkeleton />
            ) : fetchError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {fetchError}
              </div>
            ) : events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200">
                  <History className="h-5 w-5 text-slate-400" />
                </div>
                <p className="mt-3 text-sm font-medium text-slate-700">No events yet</p>
                <p className="mt-1 text-xs text-slate-400">
                  Events appear here as actions are taken on this document.
                </p>
              </div>
            ) : (
              <div>
                {events.map((event, i) => (
                  <TimelineEvent
                    key={event.id}
                    event={event}
                    isLast={i === events.length - 1}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer: Force Approve */}
          {canOverride && (
            <SheetFooter className="flex-col gap-3 border-t border-slate-100 px-6 py-4">
              {overrideSuccess ? (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Document approved. Audit trail updated.
                </div>
              ) : overriding ? (
                <div className="space-y-3">
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="text-xs font-semibold text-amber-800">Manual Override</p>
                    <p className="mt-0.5 text-xs text-amber-700">
                      You are overriding the AI verdict. This action is permanently recorded.
                    </p>
                  </div>

                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Explain the override (e.g., verbal agreement in place, verified offline, special exemption)…"
                    rows={3}
                    className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />

                  {overrideError && (
                    <p className="flex items-center gap-1.5 text-xs text-red-600">
                      <XCircle className="h-3.5 w-3.5 shrink-0" />
                      {overrideError}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      disabled={submitting}
                      onClick={() => { setOverriding(false); setNote(''); setOverrideError(null) }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-amber-600 text-white hover:bg-amber-700"
                      disabled={submitting || !note.trim()}
                      onClick={handleForceApprove}
                    >
                      {submitting ? (
                        <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Saving…</>
                      ) : (
                        'Confirm Override'
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full gap-2 border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                  onClick={() => setOverriding(true)}
                >
                  <AlertTriangle className="h-4 w-4" />
                  Force Approve (Manual Override)
                </Button>
              )}
            </SheetFooter>
          )}

        </SheetContent>
      </Sheet>
    </>
  )
}
