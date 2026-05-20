'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle, FolderKanban, ChevronRight, ArrowUpRight,
  BellRing, CheckCircle2, Loader2, ShieldAlert, FileX, Clock,
} from 'lucide-react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from '@/components/ui/sheet'
import { getAtRiskDetails, sendBulkReminder } from './at-risk-actions'
import type { Project } from '@/types/database.types'
import type { AtRiskSub } from './at-risk-actions'

export type ProjectEnriched = Project & {
  totalSubs: number
  compliantSubs: number
  nonCompliantSubs: number
  isAtRisk: boolean
  expiringCount: number
  soonestExpiryDays: number | null
}

// ── Shared sub-components ──────────────────────────────────────

function StatusBadge({ status }: { status: Project['status'] }) {
  return status === 'active' ? (
    <Badge className="border-0 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Active</Badge>
  ) : (
    <Badge className="border-0 bg-slate-100 text-slate-500 hover:bg-slate-100">Archived</Badge>
  )
}

function ComplianceSummary({
  totalSubs, compliantSubs, nonCompliantSubs, clickable, onClick,
}: Pick<ProjectEnriched, 'totalSubs' | 'compliantSubs' | 'nonCompliantSubs'> & {
  clickable?: boolean
  onClick?: () => void
}) {
  if (totalSubs === 0) {
    return <span className="text-sm text-slate-400">No subs</span>
  }
  const allClear = nonCompliantSubs === 0
  const base = 'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors'
  const style = allClear
    ? `${base} bg-emerald-50 border-emerald-200 text-emerald-700`
    : `${base} bg-red-50 border-red-200 text-red-600 ${clickable ? 'cursor-pointer hover:bg-red-100' : ''}`

  return clickable && !allClear ? (
    <button type="button" className={style} onClick={onClick}>
      ⚠ {compliantSubs}/{totalSubs} Compliant
    </button>
  ) : (
    <span className={style}>
      {allClear ? '✓' : '⚠'} {compliantSubs}/{totalSubs} Compliant
    </span>
  )
}

// ── Helpers ────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins   = Math.floor(diffMs / 60_000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function ExpiryBadge({ count, soonestDays }: { count: number; soonestDays: number | null }) {
  if (count === 0 || soonestDays === null) return null
  const style =
    soonestDays <= 7  ? 'bg-orange-50 border-orange-200 text-orange-700' :
    soonestDays <= 15 ? 'bg-amber-50  border-amber-200  text-amber-700'  :
                        'bg-yellow-50 border-yellow-200 text-yellow-700'
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${style}`}>
      <Clock className="h-3 w-3" />
      {count} expiring
    </span>
  )
}

// ── Sheet: sub issue row ───────────────────────────────────────

function SubIssueCard({ sub }: { sub: AtRiskSub }) {
  const initials = sub.company_name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-700">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{sub.company_name}</p>
          <p className="truncate text-xs text-slate-500">{sub.contact_email}</p>
        </div>
      </div>

      <div className="space-y-1.5 pl-1">
        {sub.issues.map((issue, i) => (
          <div key={i} className="space-y-0.5">
            <div className="flex items-center gap-2">
              {issue.issue === 'Rejected' ? (
                <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-red-500" />
              ) : (
                <FileX className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              )}
              <span className={`text-xs font-medium ${
                issue.issue === 'Rejected' ? 'text-red-700' : 'text-slate-500'
              }`}>
                {issue.type} · {issue.issue}
              </span>
            </div>
            {issue.reason && (
              <p className="pl-5 text-[11px] leading-relaxed text-slate-400">
                {issue.reason}
              </p>
            )}
            {issue.last_notified_at && (
              <p className="pl-5 text-[11px] text-indigo-400">
                Last notified: {timeAgo(issue.last_notified_at)}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function SheetSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-3.5 w-36" />
              <Skeleton className="h-3 w-44" />
            </div>
          </div>
          <div className="space-y-2 pl-1">
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────

export function CommandCenterTable({ rows }: { rows: ProjectEnriched[] }) {
  const [atRiskOnly, setAtRiskOnly]   = useState(false)
  const [expiryOnly, setExpiryOnly]   = useState(false)

  // Sheet state
  const [sheetOpen, setSheetOpen]       = useState(false)
  const [selected, setSelected]         = useState<ProjectEnriched | null>(null)
  const [details, setDetails]           = useState<AtRiskSub[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [fetchError, setFetchError]     = useState<string | null>(null)
  const [sending, setSending]           = useState(false)
  const [sent, setSent]                 = useState(false)

  const atRiskCount   = rows.filter((r) => r.isAtRisk).length
  const expiringCount = rows.filter((r) => r.expiringCount > 0).length

  const displayed = atRiskOnly
    ? rows.filter((r) => r.isAtRisk)
    : expiryOnly
    ? rows.filter((r) => r.expiringCount > 0)
    : rows

  async function openSheet(project: ProjectEnriched) {
    setSelected(project)
    setDetails([])
    setFetchError(null)
    setSent(false)
    setSheetOpen(true)
    setLoadingDetails(true)

    const result = await getAtRiskDetails(project.id)
    setDetails(result.subs)
    setFetchError(result.error)
    setLoadingDetails(false)
  }

  function handleSheetOpenChange(next: boolean) {
    if (!next) {
      setSelected(null)
      setDetails([])
      setSent(false)
    }
    setSheetOpen(next)
  }

  async function handleBulkReminder() {
    if (!selected) return
    setSending(true)
    await sendBulkReminder(selected.id)
    setSending(false)
    setSent(true)
  }

  return (
    <>
      <div className="space-y-3">
        {/* Filter bar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-slate-500">
            {displayed.length} project{displayed.length !== 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={expiryOnly ? 'default' : 'outline'}
              onClick={() => { setExpiryOnly((v) => !v); setAtRiskOnly(false) }}
              disabled={expiringCount === 0}
              className={`gap-2 ${
                expiryOnly
                  ? 'bg-amber-600 hover:bg-amber-700 border-0 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              Upcoming Expiries
              {expiringCount > 0 && (
                <span className={`rounded-full px-1.5 py-px text-[10px] font-bold leading-none ${
                  expiryOnly ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-700'
                }`}>
                  {expiringCount}
                </span>
              )}
            </Button>
            <Button
              size="sm"
              variant={atRiskOnly ? 'default' : 'outline'}
              onClick={() => { setAtRiskOnly((v) => !v); setExpiryOnly(false) }}
              disabled={atRiskCount === 0}
              className={`gap-2 ${
                atRiskOnly
                  ? 'bg-red-600 hover:bg-red-700 border-0 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              At-Risk Only
              {atRiskCount > 0 && (
                <span className={`rounded-full px-1.5 py-px text-[10px] font-bold leading-none ${
                  atRiskOnly ? 'bg-white/25 text-white' : 'bg-red-100 text-red-700'
                }`}>
                  {atRiskCount}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Table / empty states */}
        {displayed.length === 0 && (atRiskOnly || expiryOnly) ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-emerald-200 bg-emerald-50 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <FolderKanban className="h-6 w-6 text-emerald-500" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-emerald-800">
              {atRiskOnly ? 'All projects are compliant' : 'No upcoming expiries'}
            </h3>
            <p className="mt-1 text-sm text-emerald-700/70">
              {atRiskOnly ? 'No at-risk projects found.' : 'No documents expiring in the next 30 days.'}
            </p>
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white py-20 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <FolderKanban className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-slate-900">No projects yet</h3>
            <p className="mt-1 text-sm text-slate-500">Click &ldquo;Add New Project&rdquo; to get started.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold text-slate-700">Project Name</TableHead>
                  <TableHead className="font-semibold text-slate-700">Location</TableHead>
                  <TableHead className="font-semibold text-slate-700">Compliance</TableHead>
                  <TableHead className="font-semibold text-slate-700">Expiries</TableHead>
                  <TableHead className="font-semibold text-slate-700">Status</TableHead>
                  <TableHead className="font-semibold text-slate-700">Created</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayed.map((project) => (
                  <TableRow
                    key={project.id}
                    className={`group ${project.isAtRisk ? 'cursor-pointer hover:bg-red-50/60' : 'hover:bg-slate-50'}`}
                    onClick={project.isAtRisk ? () => openSheet(project) : undefined}
                  >
                    <TableCell className="font-medium text-slate-900">
                      {project.isAtRisk ? (
                        <span className="text-slate-900">{project.name}</span>
                      ) : (
                        <Link
                          href={`/gc/projects/${project.id}`}
                          className="hover:text-indigo-600 hover:underline underline-offset-4 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {project.name}
                        </Link>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-500">{project.location ?? '—'}</TableCell>
                    <TableCell>
                      <ComplianceSummary
                        totalSubs={project.totalSubs}
                        compliantSubs={project.compliantSubs}
                        nonCompliantSubs={project.nonCompliantSubs}
                        clickable={project.isAtRisk}
                        onClick={() => openSheet(project)}
                      />
                    </TableCell>
                    <TableCell>
                      <ExpiryBadge
                        count={project.expiringCount}
                        soonestDays={project.soonestExpiryDays}
                      />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={project.status} />
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {new Date(project.created_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell>
                      {project.isAtRisk ? (
                        <AlertTriangle className="h-4 w-4 text-red-400 transition-colors group-hover:text-red-600" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-slate-500" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* ── At-Risk Sheet ── */}
      <Sheet open={sheetOpen} onOpenChange={handleSheetOpenChange}>
        <SheetContent side="right" className="flex flex-col gap-0 p-0 sm:max-w-md">
          {/* Header */}
          <SheetHeader className="border-b border-slate-100 px-6 py-5">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-100">
                <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
              </div>
              <SheetTitle className="text-base">At-Risk Details</SheetTitle>
            </div>
            <SheetDescription className="mt-1 text-sm">
              <span className="font-semibold text-slate-700">{selected?.name}</span>
              {' · '}
              {loadingDetails ? (
                <span className="text-slate-400">Loading…</span>
              ) : (
                <span>
                  {details.length} subcontractor{details.length !== 1 ? 's' : ''} need attention
                </span>
              )}
            </SheetDescription>
          </SheetHeader>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto bg-slate-50 px-6 py-5 space-y-3">
            {loadingDetails ? (
              <SheetSkeleton />
            ) : fetchError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {fetchError}
              </div>
            ) : details.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                <p className="mt-3 text-sm font-medium text-slate-700">No issues found</p>
                <p className="mt-1 text-xs text-slate-400">All subcontractors are now compliant.</p>
              </div>
            ) : (
              details.map((sub) => <SubIssueCard key={sub.id} sub={sub} />)
            )}
          </div>

          {/* Footer */}
          <SheetFooter className="flex-col gap-3 border-t border-slate-100 px-6 py-4">
            {selected && (
              <Link
                href={`/gc/projects/${selected.id}`}
                className="flex items-center justify-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                View Full Project
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            )}

            <Button
              className={`w-full gap-2 ${
                sent
                  ? 'bg-emerald-600 hover:bg-emerald-600 cursor-default'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
              disabled={sending || sent || loadingDetails || details.length === 0}
              onClick={handleBulkReminder}
            >
              {sent ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Reminders Sent!
                </>
              ) : sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <BellRing className="h-4 w-4" />
                  Send Bulk Reminder
                  {details.length > 0 && (
                    <span className="rounded-full bg-white/20 px-1.5 py-px text-[11px] font-bold">
                      {details.length}
                    </span>
                  )}
                </>
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}
