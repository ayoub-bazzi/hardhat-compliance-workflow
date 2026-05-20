'use client'

import { useTransition } from 'react'
import { FileDown, Loader2 } from 'lucide-react'
import { getPaymentLedgerCsv } from './finance-actions'

export function ExportLedgerButton() {
  const [isPending, start] = useTransition()

  function handleExport() {
    start(async () => {
      const { csv, error } = await getPaymentLedgerCsv()
      if (error || !csv) {
        alert(error ?? 'No subcontractors are currently cleared to pay.')
        return
      }
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `payment-ledger-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    })
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={isPending}
      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
    >
      {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
      Export Payment Ledger
    </button>
  )
}
