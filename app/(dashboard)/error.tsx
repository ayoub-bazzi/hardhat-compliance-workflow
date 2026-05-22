'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Dashboard Error]', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 ring-1 ring-red-100">
        <AlertTriangle className="h-7 w-7 text-red-500" />
      </div>

      <h1 className="mt-5 text-xl font-semibold text-slate-900">Something went wrong</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        An unexpected error occurred. Your data is safe — try refreshing the page.
      </p>

      {error.digest && (
        <p className="mt-2 font-mono text-xs text-slate-400">Error ID: {error.digest}</p>
      )}

      <Button onClick={reset} className="mt-6 gap-2 bg-slate-900 hover:bg-slate-700 text-white">
        <RefreshCcw className="h-4 w-4" />
        Try again
      </Button>
    </div>
  )
}
