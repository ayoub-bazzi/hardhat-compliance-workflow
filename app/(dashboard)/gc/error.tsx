'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCcw, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function GcError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[GC Error]', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 ring-1 ring-amber-100">
        <AlertTriangle className="h-7 w-7 text-amber-500" />
      </div>

      <h1 className="mt-5 text-xl font-semibold text-slate-900">Page failed to load</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        Something went wrong loading this section. Your compliance data is intact.
      </p>

      {error.digest && (
        <p className="mt-2 font-mono text-xs text-slate-400">Error ID: {error.digest}</p>
      )}

      <div className="mt-6 flex gap-3">
        <Button onClick={reset} className="gap-2 bg-slate-900 hover:bg-slate-700 text-white">
          <RefreshCcw className="h-4 w-4" />
          Try again
        </Button>
        <Link
          href="/gc/projects"
          className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Link>
      </div>
    </div>
  )
}
