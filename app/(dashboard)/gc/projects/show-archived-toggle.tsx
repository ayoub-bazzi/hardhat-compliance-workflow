'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Archive } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ShowArchivedToggle({ showArchived }: { showArchived: boolean }) {
  const router      = useRouter()
  const pathname    = usePathname()
  const searchParams = useSearchParams()

  function toggle() {
    const params = new URLSearchParams(searchParams.toString())
    if (showArchived) {
      params.delete('showArchived')
    } else {
      params.set('showArchived', '1')
    }
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <Button
      size="sm"
      variant={showArchived ? 'default' : 'outline'}
      onClick={toggle}
      className={`gap-2 ${
        showArchived
          ? 'bg-slate-700 hover:bg-slate-800 text-white border-0'
          : 'text-slate-600 hover:text-slate-900'
      }`}
    >
      <Archive className="h-3.5 w-3.5" />
      {showArchived ? 'Showing Archived' : 'Show Archived'}
    </Button>
  )
}
