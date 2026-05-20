'use client'

import { useState } from 'react'
import { CalendarClock, Loader2, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { runExpiryScan } from './expiry-actions'
import type { ExpiryScanResult } from './expiry-actions'

function urgencyStyle(days: number) {
  if (days <= 7)  return 'text-orange-700 bg-orange-50 border-orange-200'
  if (days <= 15) return 'text-amber-700  bg-amber-50  border-amber-200'
  return               'text-yellow-700 bg-yellow-50 border-yellow-200'
}

function daysLabel(days: number) {
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  return `${days}d`
}

export function ExpiryButton() {
  const [scanning, setScanning]   = useState(false)
  const [result, setResult]       = useState<ExpiryScanResult | null>(null)
  const [expanded, setExpanded]   = useState(false)

  async function handleScan() {
    setScanning(true)
    setResult(null)
    const res = await runExpiryScan()
    setResult(res)
    setExpanded(res.scanned > 0)
    setScanning(false)
  }

  const hasItems = (result?.items ?? []).length > 0

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={handleScan}
        disabled={scanning}
        className="gap-2 border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
      >
        {scanning ? (
          <><Loader2 className="h-3.5 w-3.5 animate-spin" />Scanning…</>
        ) : (
          <><CalendarClock className="h-3.5 w-3.5" />Run Expiry Scan</>
        )}
      </Button>

      {result && (
        <div className="absolute right-0 top-9 z-50 w-80 rounded-xl border border-slate-200 bg-white shadow-xl">
          {/* Summary header */}
          <div className="flex items-start gap-2.5 px-4 py-3 border-b border-slate-100">
            {result.error ? (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            )}
            <div className="flex-1 min-w-0">
              {result.error ? (
                <p className="text-sm text-red-700">{result.error}</p>
              ) : result.scanned === 0 ? (
                <p className="text-sm font-medium text-slate-700">
                  No documents expiring in the next 30 days.
                </p>
              ) : (
                <>
                  <p className="text-sm font-semibold text-slate-900">
                    {result.sent > 0
                      ? `${result.sent} warning email${result.sent !== 1 ? 's' : ''} sent`
                      : 'All subs already notified'}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {result.scanned} doc{result.scanned !== 1 ? 's' : ''} expiring
                    {result.alreadyNotified > 0 && ` · ${result.alreadyNotified} skipped (< 24 h)`}
                  </p>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => setResult(null)}
              className="shrink-0 text-slate-300 hover:text-slate-500"
            >
              ✕
            </button>
          </div>

          {/* Expiry list */}
          {hasItems && expanded && (
            <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
              {result!.items.map((item) => (
                <div key={item.documentId} className="flex items-center gap-3 px-4 py-2.5">
                  <span className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${urgencyStyle(item.daysUntilExpiry)}`}>
                    {daysLabel(item.daysUntilExpiry)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-slate-900">
                      {item.documentType} · {item.subcontractorName}
                    </p>
                    <p className="truncate text-[11px] text-slate-400">{item.projectName}</p>
                  </div>
                  {item.alreadyWarned && !item.emailSent && (
                    <span className="shrink-0 text-[10px] text-slate-400">skipped</span>
                  )}
                  {item.emailSent && (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  )}
                  {!item.alreadyWarned && !item.emailSent && (
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-400" />
                  )}
                </div>
              ))}
            </div>
          )}

          {hasItems && (
            <div className="border-t border-slate-100 px-4 py-2">
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                {expanded ? 'Hide details' : `Show ${result!.items.length} affected document${result!.items.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
