'use client'

import { useRef, useState, useTransition } from 'react'
import {
  Upload, Loader2, CheckCircle2, AlertTriangle, FileText, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

type InvoiceCheckResult = {
  ok:                  boolean
  invoice_total?:      number | null
  currency?:           string
  invoice_number?:     string | null
  confidence?:         'high' | 'medium' | 'low'
  notes?:              string
  discrepancy_flagged?: boolean
  discrepancy_pct?:    number | null
  amount?:             number
  error?:              string
}

export function InvoiceUpload({ certId, amountClaimed }: { certId: string; amountClaimed: number }) {
  const fileRef  = useRef<HTMLInputElement>(null)
  const [preview, setPreview]   = useState<string | null>(null)
  const [result,  setResult]    = useState<InvoiceCheckResult | null>(null)
  const [pending, start]        = useTransition()

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setPreview(ev.target?.result as string)
      setResult(null)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function submit() {
    if (!preview) return
    start(async () => {
      const res = await fetch('/api/finance/check-invoice', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ certId, photoDataUrl: preview }),
      })
      const json = await res.json() as InvoiceCheckResult
      setResult(json)
    })
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-100 bg-slate-50 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-700">AI Invoice Reconciliation</h3>
        </div>
        <p className="mt-0.5 text-xs text-slate-400">
          Upload your invoice — AI extracts the total and checks it against the certificate amount of{' '}
          <span className="font-semibold text-slate-600">
            {amountClaimed.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
          </span>.
        </p>
      </div>

      <div className="p-5 space-y-4">
        {!preview && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed border-slate-200 p-8 text-center transition-colors hover:border-indigo-400 hover:bg-indigo-50 group"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 group-hover:bg-indigo-100 transition-colors">
              <Upload className="h-5 w-5 text-slate-500 group-hover:text-indigo-600 transition-colors" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">Upload Invoice</p>
              <p className="mt-0.5 text-xs text-slate-400">JPEG, PNG, or PDF scan</p>
            </div>
          </button>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={handleFile}
        />

        {preview && !result && (
          <div className="space-y-3">
            <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
              <img src={preview} alt="Invoice preview" className="max-h-48 w-full object-contain" />
              <button
                type="button"
                onClick={() => { setPreview(null); setResult(null) }}
                className="absolute right-2 top-2 rounded-full bg-white p-1 shadow-sm hover:bg-red-50 transition-colors"
              >
                <X className="h-3.5 w-3.5 text-slate-500" />
              </button>
            </div>
            <Button
              onClick={submit}
              disabled={pending}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {pending
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analysing invoice…</>
                : 'Run AI Reconciliation'
              }
            </Button>
          </div>
        )}

        {result && (
          <div className="space-y-3">
            {result.error ? (
              <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                <p className="text-sm text-red-800">{result.error}</p>
              </div>
            ) : (
              <>
                {/* Result banner */}
                <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${
                  result.discrepancy_flagged
                    ? 'border-amber-200 bg-amber-50'
                    : 'border-emerald-200 bg-emerald-50'
                }`}>
                  {result.discrepancy_flagged
                    ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  }
                  <div>
                    <p className={`text-sm font-semibold ${
                      result.discrepancy_flagged ? 'text-amber-900' : 'text-emerald-900'
                    }`}>
                      {result.discrepancy_flagged
                        ? `⚠️ Discrepancy Detected — ${result.discrepancy_pct?.toFixed(1)}% difference`
                        : '✓ Invoice Verified — amounts match'
                      }
                    </p>
                    {result.invoice_total != null && (
                      <p className={`mt-0.5 text-xs ${
                        result.discrepancy_flagged ? 'text-amber-800' : 'text-emerald-800'
                      }`}>
                        Invoice total: {result.invoice_total.toLocaleString('en-US', { style: 'currency', currency: result.currency ?? 'USD', maximumFractionDigits: 0 })}
                        {' '}vs certificate: {result.amount?.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
                      </p>
                    )}
                    {result.invoice_number && (
                      <p className={`mt-0.5 text-xs ${result.discrepancy_flagged ? 'text-amber-700' : 'text-emerald-700'}`}>
                        Invoice #{result.invoice_number}
                      </p>
                    )}
                    {result.notes && (
                      <p className={`mt-1 text-xs italic ${result.discrepancy_flagged ? 'text-amber-700' : 'text-emerald-700'}`}>
                        {result.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Confidence */}
                <p className="text-[10px] text-slate-400 text-right">
                  AI confidence: {result.confidence} · Result saved to certificate record
                </p>
              </>
            )}

            <Button
              variant="outline"
              onClick={() => { setPreview(null); setResult(null) }}
              className="w-full text-xs"
            >
              Upload different invoice
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
