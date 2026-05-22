import { Suspense } from 'react'
import { createClient } from '@/lib/supabase'
import {
  ScrollText, ShieldCheck, ShieldX, FileSearch,
  Mail, MessageSquare, PhoneCall, AlertTriangle,
  CheckCircle2, XCircle, MinusCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { AuditTabNav } from './tab-nav'
import type { AccessResult, NudgeAlertType, NudgeChannel, NudgeStatus } from '@/types/database.types'

// ── Shared helpers ─────────────────────────────────────────────

function formatTs(ts: string) {
  return new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ── Gate tab components ────────────────────────────────────────

function AccessResultBadge({ result }: { result: AccessResult }) {
  return result === 'GRANTED' ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400 ring-1 ring-emerald-800">
      <ShieldCheck className="h-3 w-3" />
      GRANTED
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-950 px-2.5 py-0.5 text-[11px] font-semibold text-red-400 ring-1 ring-red-800">
      <ShieldX className="h-3 w-3" />
      DENIED
    </span>
  )
}

async function GateTabData() {
  const supabase = await createClient()

  const [logsResult, docEventsResult] = await Promise.all([
    supabase
      .from('site_access_logs')
      .select(`id, result, denial_reasons, gate_location, created_at, subcontractors ( company_name )`)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('document_events')
      .select(`id, event_type, actor, metadata, created_at, documents ( type, subcontractor_id )`)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const logs      = logsResult.data ?? []
  const docEvents = docEventsResult.data ?? []

  const granted = logs.filter((l) => l.result === 'GRANTED').length
  const denied  = logs.filter((l) => l.result === 'DENIED').length

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Gate Scans', value: logs.length, color: 'text-slate-900' },
          { label: 'Access Granted',   value: granted,     color: 'text-emerald-600' },
          { label: 'Access Denied',    value: denied,      color: 'text-red-600'     },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm text-center">
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Site Gate log */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-700">Site Gate Log</h2>
          <p className="text-xs text-slate-400 mt-0.5">Immutable QR scan record</p>
        </div>
        {logs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <FileSearch className="h-9 w-9 text-slate-300" />
            <p className="text-sm text-slate-500">No gate scans recorded yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Timestamp', 'Subcontractor', 'Result', 'Gate', 'Denial Reasons'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 first:pl-5 last:pr-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 pl-5 pr-4 text-xs text-slate-500 whitespace-nowrap">{formatTs(log.created_at)}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {(log.subcontractors as { company_name: string } | null)?.company_name ?? '—'}
                    </td>
                    <td className="px-4 py-3"><AccessResultBadge result={log.result as AccessResult} /></td>
                    <td className="px-4 py-3 text-slate-500">{log.gate_location ?? <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-3 pr-5">
                      {log.denial_reasons && (log.denial_reasons as string[]).length > 0 ? (
                        <ul className="space-y-0.5">
                          {(log.denial_reasons as string[]).map((r, i) => (
                            <li key={i} className="text-xs text-red-600">· {r}</li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Document events */}
      {docEvents.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-slate-700">Document Event Timeline</h2>
            <p className="text-xs text-slate-400 mt-0.5">AI reviews, approvals, rejections, notifications</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Timestamp', 'Event', 'Document Type', 'Actor'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 first:pl-5 last:pr-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {docEvents.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 pl-5 pr-4 text-xs text-slate-500 whitespace-nowrap">{formatTs(ev.created_at)}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="text-xs font-medium capitalize">
                        {ev.event_type.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{(ev.documents as { type: string } | null)?.type ?? '—'}</td>
                    <td className="px-4 py-3 pr-5 text-xs text-slate-500">{ev.actor ?? 'System'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Communications tab ─────────────────────────────────────────

const ALERT_CONFIG: Record<NudgeAlertType, { label: string; bg: string; text: string; ring: string }> = {
  flagged:     { label: 'Flagged Alert',   bg: 'bg-red-950',    text: 'text-red-400',    ring: 'ring-red-800'    },
  expiry_7d:   { label: '7-Day Warning',   bg: 'bg-amber-950',  text: 'text-amber-400',  ring: 'ring-amber-800'  },
  expiry_48h:  { label: '48-Hour Final',   bg: 'bg-orange-950', text: 'text-orange-400', ring: 'ring-orange-800' },
  hard_stop:   { label: 'Hard-Stop',       bg: 'bg-red-950',    text: 'text-red-400',    ring: 'ring-red-800'    },
}

const CHANNEL_ICON: Record<NudgeChannel, React.ElementType> = {
  email:    Mail,
  sms:      PhoneCall,
  whatsapp: MessageSquare,
}

function StatusIcon({ status }: { status: NudgeStatus }) {
  if (status === 'sent')    return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
  if (status === 'failed')  return <XCircle      className="h-3.5 w-3.5 text-red-500"     />
  return                           <MinusCircle  className="h-3.5 w-3.5 text-slate-400"   />
}

async function CommsTabData() {
  const supabase = await createClient()

  const { data: logsRaw, error } = await supabase
    .from('nudge_logs')
    .select(`
      id, alert_type, channel, recipient_contact, status, metadata, created_at,
      subcontractors ( company_name )
    `)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error || !logsRaw) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        Failed to load communications log: {error?.message ?? 'Unknown error'}
      </div>
    )
  }

  const logs = logsRaw

  const total    = logs.length
  const sent     = logs.filter((l) => l.status === 'sent').length
  const failed   = logs.filter((l) => l.status === 'failed').length
  const hardStop = logs.filter((l) => l.alert_type === 'hard_stop').length

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Sent',     value: total,    color: 'text-slate-900'   },
          { label: 'Delivered',      value: sent,     color: 'text-emerald-600' },
          { label: 'Failed',         value: failed,   color: failed > 0 ? 'text-red-600' : 'text-slate-400' },
          { label: 'Hard-Stop Revocations', value: hardStop, color: hardStop > 0 ? 'text-red-600' : 'text-slate-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm text-center">
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Comms log table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-700">Communications Ledger</h2>
          <p className="text-xs text-slate-400 mt-0.5">Every SMS, WhatsApp, and email dispatched by the Nudge Engine</p>
        </div>

        {logs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <AlertTriangle className="h-9 w-9 text-slate-300" />
            <p className="text-sm font-medium text-slate-500">No notifications sent yet</p>
            <p className="text-xs text-slate-400">Notifications are sent automatically when documents are flagged, expiring, or risk scores breach the Hard-Stop threshold.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Timestamp', 'Subcontractor', 'Alert Type', 'Channel', 'Recipient', 'Status', 'Note'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 first:pl-5 last:pr-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {logs.map((log) => {
                  const alertCfg  = ALERT_CONFIG[log.alert_type as NudgeAlertType]
                  const ChannelIcon = CHANNEL_ICON[log.channel as NudgeChannel] ?? Mail
                  const meta      = log.metadata as Record<string, unknown>
                  const docType   = meta.doc_type as string | undefined
                  const days      = meta.days_until_expiry as number | undefined
                  const score     = meta.risk_score as number | undefined
                  const note      = docType
                    ? (days !== undefined ? `${docType} — expires in ${days}d` : docType)
                    : score !== undefined ? `Risk score: ${score}/100`
                    : '—'

                  return (
                    <tr
                      key={log.id}
                      className={`transition-colors hover:bg-slate-50/80 ${
                        log.alert_type === 'hard_stop'   ? 'bg-red-50/30'    :
                        log.alert_type === 'expiry_48h'  ? 'bg-orange-50/20' : ''
                      }`}
                    >
                      <td className="py-3 pl-5 pr-4 text-xs text-slate-500 whitespace-nowrap">{log.created_at ? formatTs(log.created_at) : '—'}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {(log.subcontractors as { company_name: string } | null)?.company_name ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        {alertCfg && (
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${alertCfg.bg} ${alertCfg.text} ${alertCfg.ring}`}>
                            {alertCfg.label}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <ChannelIcon className="h-3.5 w-3.5 shrink-0" />
                          <span className="text-xs font-medium capitalize">{log.channel}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 font-mono">{log.recipient_contact}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <StatusIcon status={log.status as NudgeStatus} />
                          <span className={`text-xs font-semibold capitalize ${
                            log.status === 'sent'    ? 'text-emerald-600' :
                            log.status === 'failed'  ? 'text-red-600'     :
                            'text-slate-400'
                          }`}>
                            {log.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 pr-5 text-xs text-slate-500">{note}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-slate-400">
        All communications are permanently recorded. Hard-Stop revocations escalate to the Project Manager after 48 hours of sustained critical risk.
      </p>
    </div>
  )
}

// ── Skeleton ───────────────────────────────────────────────────

function TabSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────

export default async function AuditTrailsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { tab = 'gate' } = await searchParams

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Audit Trails</h1>
          <p className="mt-1 text-sm text-slate-500">
            Immutable record of every gate scan, document event, and compliance notification.
          </p>
        </div>
      </div>

      <AuditTabNav />

      <Suspense fallback={<TabSkeleton />}>
        {tab === 'comms' ? <CommsTabData /> : <GateTabData />}
      </Suspense>
    </div>
  )
}
