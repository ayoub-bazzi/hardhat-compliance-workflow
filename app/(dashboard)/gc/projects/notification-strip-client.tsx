'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Bell, X, ChevronRight } from 'lucide-react'
import { dismissNotification } from '@/app/portal/upload/[token]/portal-actions'
import type { GcNotification } from '@/types/database.types'

export function NotificationStripClient({ notifs: initial }: { notifs: GcNotification[] }) {
  const [notifs, setNotifs] = useState(initial)
  const [isPending, startTransition] = useTransition()

  function dismiss(id: string) {
    startTransition(async () => {
      await dismissNotification(id)
      setNotifs((prev) => prev.filter((n) => n.id !== id))
    })
  }

  if (notifs.length === 0) return null

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-indigo-100 bg-indigo-100/60 px-4 py-2.5">
        <Bell className="h-3.5 w-3.5 text-indigo-600" />
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
          Portal Submissions — {notifs.length} new
        </p>
      </div>
      <div className="divide-y divide-indigo-100">
        {notifs.map((n) => (
          <div key={n.id} className="flex items-center justify-between gap-4 px-4 py-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500">
                <span className="text-[10px] font-bold text-white">!</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-indigo-900 truncate">{n.message}</p>
                {n.created_at && (
                  <p className="text-xs text-indigo-500">
                    {new Date(n.created_at).toLocaleString('en-US', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/gc/insurance"
                className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline"
              >
                Review <ChevronRight className="h-3 w-3" />
              </Link>
              <button
                type="button"
                disabled={isPending}
                onClick={() => dismiss(n.id)}
                className="flex h-6 w-6 items-center justify-center rounded-md text-indigo-400 transition-colors hover:bg-indigo-200 hover:text-indigo-700"
                aria-label="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
