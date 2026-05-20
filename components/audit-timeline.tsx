import {
  ShieldCheck, ShieldX, ScanLine, AlertTriangle,
  Bell, Send, ClipboardCheck, HardHat, Landmark,
  UserCog, Lock,
} from 'lucide-react'
import type { AuditEvent } from '@/types/database.types'

type EventType = AuditEvent['event_type']

const EVENT_CONFIG: Record<EventType, {
  icon: React.ElementType
  iconBg: string
  iconFg: string
  labelColor: string
}> = {
  'Audit': {
    icon:       ShieldCheck,
    iconBg:     'bg-indigo-950 ring-indigo-700',
    iconFg:     'text-indigo-400',
    labelColor: 'text-indigo-400',
  },
  'Gate Scan': {
    icon:       ScanLine,
    iconBg:     'bg-slate-800 ring-slate-600',
    iconFg:     'text-slate-300',
    labelColor: 'text-slate-300',
  },
  'Manual Override': {
    icon:       AlertTriangle,
    iconBg:     'bg-amber-950 ring-amber-700',
    iconFg:     'text-amber-400',
    labelColor: 'text-amber-400',
  },
  'Nudge Sent': {
    icon:       Bell,
    iconBg:     'bg-slate-800 ring-slate-700',
    iconFg:     'text-slate-400',
    labelColor: 'text-slate-400',
  },
  'Invite Sent': {
    icon:       Send,
    iconBg:     'bg-sky-950 ring-sky-700',
    iconFg:     'text-sky-400',
    labelColor: 'text-sky-400',
  },
  'Portal Submission': {
    icon:       ClipboardCheck,
    iconBg:     'bg-emerald-950 ring-emerald-700',
    iconFg:     'text-emerald-400',
    labelColor: 'text-emerald-400',
  },
  'Payment Update': {
    icon:       Landmark,
    iconBg:     'bg-violet-950 ring-violet-700',
    iconFg:     'text-violet-400',
    labelColor: 'text-violet-400',
  },
  'Safety Audit': {
    icon:       HardHat,
    iconBg:     'bg-amber-950 ring-amber-700',
    iconFg:     'text-amber-400',
    labelColor: 'text-amber-400',
  },
  'Role Change': {
    icon:       UserCog,
    iconBg:     'bg-violet-950 ring-violet-700',
    iconFg:     'text-violet-400',
    labelColor: 'text-violet-400',
  },
  'Access Denied': {
    icon:       Lock,
    iconBg:     'bg-red-950 ring-red-700',
    iconFg:     'text-red-400',
    labelColor: 'text-red-400',
  },
}

function getResultFromMetadata(event: AuditEvent): 'GRANTED' | 'DENIED' | null {
  if (event.event_type !== 'Gate Scan') return null
  const meta = event.metadata as { result?: string }
  return (meta?.result as 'GRANTED' | 'DENIED') ?? null
}

function formatTs(ts: string) {
  return new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function AuditTimeline({ events }: { events: AuditEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <HardHat className="h-8 w-8 text-slate-600" />
        <p className="text-sm font-medium text-slate-500">No audit events yet</p>
        <p className="text-xs text-slate-600">
          Events are logged automatically when documents are verified, gate scans run, or invites are sent.
        </p>
      </div>
    )
  }

  return (
    <ol className="relative space-y-0">
      {events.map((event, idx) => {
        const cfg    = EVENT_CONFIG[event.event_type]
        const Icon   = cfg.icon
        const isLast = idx === events.length - 1
        const gateResult = getResultFromMetadata(event)

        return (
          <li key={event.id} className="relative flex gap-4 pb-8 last:pb-0">
            {/* Vertical connector line */}
            {!isLast && (
              <div className="absolute left-[19px] top-10 bottom-0 w-px bg-slate-700" />
            )}

            {/* Icon node */}
            <div className={`relative z-10 mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-1 ${cfg.iconBg}`}>
              <Icon className={`h-4 w-4 ${cfg.iconFg}`} />
            </div>

            {/* Event body */}
            <div className="min-w-0 flex-1 rounded-xl border border-slate-700/60 bg-slate-800/50 px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold uppercase tracking-wider ${cfg.labelColor}`}>
                    {event.event_type}
                  </span>
                  {gateResult && (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${
                      gateResult === 'GRANTED'
                        ? 'bg-emerald-950 text-emerald-400 ring-emerald-800'
                        : 'bg-red-950 text-red-400 ring-red-800'
                    }`}>
                      {gateResult}
                    </span>
                  )}
                </div>
                <time className="shrink-0 text-xs text-slate-500" dateTime={event.created_at}>
                  {formatTs(event.created_at)}
                </time>
              </div>

              <p className="mt-1.5 text-sm text-slate-300">{event.description}</p>

              <p className="mt-1.5 text-xs text-slate-500">
                Acting agent: <span className="font-medium text-slate-400">{event.actor}</span>
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
