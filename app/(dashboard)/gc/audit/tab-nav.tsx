'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

const TABS = [
  { key: 'gate',   label: 'Site Gate Log'     },
  { key: 'comms',  label: 'Communications'    },
]

export function AuditTabNav() {
  const sp  = useSearchParams()
  const tab = sp.get('tab') ?? 'gate'

  return (
    <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 w-fit">
      {TABS.map(({ key, label }) => (
        <Link
          key={key}
          href={`?tab=${key}`}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            tab === key
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {label}
        </Link>
      ))}
    </div>
  )
}
