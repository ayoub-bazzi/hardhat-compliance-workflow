'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Sparkles, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { runAiReview, type AiReviewResult } from '@/app/gc/projects/[id]/ai-actions'

type Toast = { message: string; type: 'success' | 'error' }

export function AiReviewButton({
  documentId,
  projectId,
}: {
  documentId: string
  projectId: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)

  async function handleReview() {
    setLoading(true)
    setToast(null)

    const timeout = new Promise<AiReviewResult>((resolve) =>
      setTimeout(
        () => resolve({ error: 'AI review timed out after 30 seconds. Try again or approve manually.' }),
        30_000,
      ),
    )
    const result = await Promise.race([runAiReview(documentId, projectId), timeout])

    setLoading(false)

    if (result.error) {
      setToast({ message: result.error, type: 'error' })
    } else {
      const type = result.status === 'rejected' ? 'error' : 'success'
      setToast({ message: result.message!, type })
      router.refresh()
    }

    setTimeout(() => setToast(null), 4500)
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleReview}
        disabled={loading}
        className="h-7 gap-1.5 border-slate-200 text-xs text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      >
        {loading ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            Inspecting...
          </>
        ) : (
          <>
            <Sparkles className="h-3 w-3" />
            Run AI Review
          </>
        )}
      </Button>

      {/* Fixed position escapes table overflow-x-auto clipping */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-50 flex w-72 items-start gap-2 rounded-lg border px-3 py-2.5 text-xs shadow-lg ${
            toast.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          ) : (
            <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          )}
          {toast.message}
        </div>
      )}
    </>
  )
}
