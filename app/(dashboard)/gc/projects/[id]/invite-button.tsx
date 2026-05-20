'use client'

import { useState } from 'react'
import { Mail, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { sendInviteEmail } from '@/app/gc/projects/[id]/actions'

type Toast = { message: string; type: 'success' | 'error' }

export function InviteButton({
  companyName,
  contactEmail,
  subcontractorId,
  projectId,
}: {
  companyName: string
  contactEmail: string
  subcontractorId: string
  projectId: string
}) {
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)

  async function handleInvite() {
    setLoading(true)
    setToast(null)

    const result = await sendInviteEmail(projectId, subcontractorId)

    setLoading(false)

    if (result.error) {
      setToast({ message: result.error, type: 'error' })
    } else {
      setToast({ message: `Invitation sent to ${result.sentTo ?? contactEmail}!`, type: 'success' })
    }

    setTimeout(() => setToast(null), 4500)
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={handleInvite}
        disabled={loading}
        className="gap-1.5 text-xs h-7 px-2.5"
      >
        {loading ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <Mail className="h-3 w-3" />
            Invite
          </>
        )}
      </Button>

      {toast && (
        <div
          className={`absolute right-0 top-9 z-50 flex w-72 items-start gap-2 rounded-lg border px-3 py-2 text-xs shadow-lg ${
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
    </div>
  )
}
