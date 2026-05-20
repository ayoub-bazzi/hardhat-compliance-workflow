'use client'

import { useState } from 'react'
import { Bell, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { notifySubcontractor } from '@/app/gc/projects/[id]/ai-actions'

export function NotifyButton({ subcontractorId }: { subcontractorId: string }) {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleNotify() {
    setLoading(true)
    const result = await notifySubcontractor(subcontractorId)
    setLoading(false)
    if (!result.error) setSent(true)
  }

  if (sent) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-emerald-600">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Notified
      </div>
    )
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleNotify}
      disabled={loading}
      className="h-7 gap-1.5 border-red-200 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
    >
      {loading ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          Sending...
        </>
      ) : (
        <>
          <Bell className="h-3 w-3" />
          Notify Subcontractor
        </>
      )}
    </Button>
  )
}
