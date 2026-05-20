'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  FileText, ImageIcon, ShieldCheck, ShieldAlert, Search,
  Download, Loader2, X, CalendarDays, FolderOpen, CheckSquare,
} from 'lucide-react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { getBulkDownloadUrls } from './vault-actions'
import type { VaultDoc } from './page'
import type { DocumentStatus, DocumentType } from '@/types/database.types'

// ── Badge helpers ──────────────────────────────────────────────

function DocStatusBadge({ status }: { status: DocumentStatus }) {
  if (status === 'approved') {
    return (
      <Badge className="border-0 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 gap-1">
        <ShieldCheck className="h-3 w-3" /> Approved
      </Badge>
    )
  }
  if (status === 'rejected') {
    return (
      <Badge className="border-0 bg-red-100 text-red-700 hover:bg-red-100 gap-1">
        <ShieldAlert className="h-3 w-3" /> Rejected
      </Badge>
    )
  }
  return (
    <Badge className="border-0 bg-amber-100 text-amber-700 hover:bg-amber-100">
      Pending
    </Badge>
  )
}

function ExpiryLabel({ date }: { date: string | null }) {
  if (!date) return <span className="text-xs text-slate-400">—</span>

  const daysLeft = Math.ceil(
    (new Date(date).getTime() - Date.now()) / 86_400_000
  )
  const formatted = new Date(date).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })

  if (daysLeft < 0) {
    return <span className="text-xs font-medium text-red-600">{formatted} · Expired</span>
  }
  if (daysLeft <= 7) {
    return <span className="text-xs font-medium text-orange-600">{formatted} · {daysLeft}d left</span>
  }
  if (daysLeft <= 30) {
    return <span className="text-xs font-medium text-amber-600">{formatted} · {daysLeft}d left</span>
  }
  return <span className="text-xs text-slate-500">{formatted}</span>
}

function DocIcon({ filePath }: { filePath: string | null }) {
  const isImage = filePath
    ? /\.(png|jpe?g|gif|webp)$/i.test(filePath)
    : false
  return isImage ? (
    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50">
      <ImageIcon className="h-4 w-4 text-indigo-500" />
    </div>
  ) : (
    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
      <FileText className="h-4 w-4 text-slate-500" />
    </div>
  )
}

// ── Download feedback banner ───────────────────────────────────

type DownloadState = 'idle' | 'loading' | 'done' | 'error'

function DownloadBanner({
  state,
  count,
  onDismiss,
}: {
  state: DownloadState
  count: number
  onDismiss: () => void
}) {
  if (state === 'idle') return null

  if (state === 'loading') {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
        <Loader2 className="h-4 w-4 animate-spin" />
        Preparing {count} document{count !== 1 ? 's' : ''} for download…
      </div>
    )
  }

  if (state === 'done') {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
        <span className="flex items-center gap-2">
          <CheckSquare className="h-4 w-4" />
          {count} file{count !== 1 ? 's' : ''} opened for download.
        </span>
        <button onClick={onDismiss} className="text-emerald-600 hover:text-emerald-900">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800">
      <span>Download failed. Please try again.</span>
      <button onClick={onDismiss} className="text-red-600 hover:text-red-900">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

// ── Filter types ───────────────────────────────────────────────

type StatusFilter = 'all' | DocumentStatus
type TypeFilter   = 'all' | DocumentType

// ── Main component ─────────────────────────────────────────────

export function DocumentVault({ docs }: { docs: VaultDoc[] }) {
  // ── Filter state ──────────────────────────────────────────
  const [search,     setSearch]     = useState('')
  const [statusF,    setStatusF]    = useState<StatusFilter>('all')
  const [typeF,      setTypeF]      = useState<TypeFilter>('all')
  const [dateFrom,   setDateFrom]   = useState('')
  const [dateTo,     setDateTo]     = useState('')

  // ── Selection state ───────────────────────────────────────
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // ── Download state ────────────────────────────────────────
  const [dlState, setDlState]   = useState<DownloadState>('idle')

  // ── Filtered rows ─────────────────────────────────────────
  const filtered = useMemo(() => {
    const q         = search.trim().toLowerCase()
    const fromMs    = dateFrom ? new Date(dateFrom).getTime() : 0
    const toMs      = dateTo   ? new Date(dateTo + 'T23:59:59').getTime() : Infinity

    return docs.filter((d) => {
      if (statusF !== 'all' && d.status !== statusF) return false
      if (typeF   !== 'all' && d.type   !== typeF)   return false

      const uploadedMs = new Date(d.created_at).getTime()
      if (uploadedMs < fromMs || uploadedMs > toMs)  return false

      if (q && !d.companyName.toLowerCase().includes(q) &&
               !d.projectName.toLowerCase().includes(q) &&
               !d.type.toLowerCase().includes(q))        return false

      return true
    })
  }, [docs, search, statusF, typeF, dateFrom, dateTo])

  // ── Selection helpers ─────────────────────────────────────
  const allFilteredIds = filtered.map((d) => d.id)
  const allChecked     = allFilteredIds.length > 0 && allFilteredIds.every((id) => selected.has(id))
  const someChecked    = allFilteredIds.some((id) => selected.has(id))

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allChecked) {
        allFilteredIds.forEach((id) => next.delete(id))
      } else {
        allFilteredIds.forEach((id) => next.add(id))
      }
      return next
    })
  }

  function toggleDoc(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectedInView = allFilteredIds.filter((id) => selected.has(id))

  // ── Download handler ──────────────────────────────────────
  async function handleBulkDownload() {
    if (selectedInView.length === 0) return
    setDlState('loading')

    try {
      const { urls } = await getBulkDownloadUrls(selectedInView)

      // Open each signed URL — browser handles individual file downloads
      urls.forEach(({ url }, i) => {
        setTimeout(() => window.open(url, '_blank', 'noopener,noreferrer'), i * 200)
      })

      setDlState('done')
    } catch {
      setDlState('error')
    }
  }

  function clearFilters() {
    setSearch('')
    setStatusF('all')
    setTypeF('all')
    setDateFrom('')
    setDateTo('')
  }

  const hasActiveFilters = search || statusF !== 'all' || typeF !== 'all' || dateFrom || dateTo

  return (
    <div className="space-y-4">
      {/* ── Filter bar ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input
            placeholder="Search company, project, or type…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Status filter */}
        <Select
          value={statusF}
          onValueChange={(v) => setStatusF((v ?? 'all') as StatusFilter)}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>

        {/* Type filter */}
        <Select
          value={typeF}
          onValueChange={(v) => setTypeF((v ?? 'all') as TypeFilter)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Doc Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="COI">COI</SelectItem>
            <SelectItem value="W9">W9</SelectItem>
            <SelectItem value="Certified Payroll">Certified Payroll</SelectItem>
          </SelectContent>
        </Select>

        {/* Date from */}
        <div className="relative">
          <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-8 rounded-lg border border-input bg-transparent pl-8 pr-2.5 text-sm text-slate-700 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            title="Uploaded from"
          />
        </div>

        {/* Date to */}
        <div className="relative">
          <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-8 rounded-lg border border-input bg-transparent pl-8 pr-2.5 text-sm text-slate-700 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            title="Uploaded to"
          />
        </div>

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-slate-500">
            <X className="h-3.5 w-3.5 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* ── Bulk action bar ────────────────────────────────── */}
      {selectedInView.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5">
          <span className="text-sm font-medium text-indigo-800">
            {selectedInView.length} document{selectedInView.length !== 1 ? 's' : ''} selected
          </span>
          <Button
            size="sm"
            onClick={handleBulkDownload}
            disabled={dlState === 'loading'}
            className="ml-auto bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {dlState === 'loading' ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5 mr-1.5" />
            )}
            Download Selected ({selectedInView.length})
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelected(new Set())}
            className="text-indigo-600"
          >
            Clear selection
          </Button>
        </div>
      )}

      {/* ── Download feedback ──────────────────────────────── */}
      <DownloadBanner
        state={dlState}
        count={selectedInView.length}
        onDismiss={() => setDlState('idle')}
      />

      {/* ── Table ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              {/* Select-all checkbox */}
              <TableHead className="w-10 pl-4">
                <input
                  type="checkbox"
                  checked={allChecked}
                  ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked }}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-slate-300 accent-indigo-600 cursor-pointer"
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead className="w-10" />
              <TableHead className="font-semibold text-slate-700">Subcontractor</TableHead>
              <TableHead className="font-semibold text-slate-700">Type & Project</TableHead>
              <TableHead className="font-semibold text-slate-700">Status</TableHead>
              <TableHead className="font-semibold text-slate-700">Expiry</TableHead>
              <TableHead className="font-semibold text-slate-700">Uploaded</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <FolderOpen className="h-8 w-8" />
                    <p className="text-sm font-medium">
                      {hasActiveFilters
                        ? 'No documents match these filters'
                        : 'No documents yet'}
                    </p>
                    {hasActiveFilters && (
                      <button
                        onClick={clearFilters}
                        className="text-xs text-indigo-500 hover:text-indigo-700 underline"
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((doc) => (
                <TableRow
                  key={doc.id}
                  className={`hover:bg-slate-50 transition-colors ${
                    selected.has(doc.id) ? 'bg-indigo-50/40' : ''
                  }`}
                >
                  {/* Checkbox */}
                  <TableCell className="pl-4">
                    <input
                      type="checkbox"
                      checked={selected.has(doc.id)}
                      onChange={() => toggleDoc(doc.id)}
                      className="h-4 w-4 rounded border-slate-300 accent-indigo-600 cursor-pointer"
                      aria-label={`Select ${doc.type} from ${doc.companyName}`}
                    />
                  </TableCell>

                  {/* Icon */}
                  <TableCell>
                    <DocIcon filePath={doc.file_path} />
                  </TableCell>

                  {/* Subcontractor */}
                  <TableCell className="font-medium text-slate-900">
                    {doc.companyName}
                  </TableCell>

                  {/* Type & Project */}
                  <TableCell>
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-slate-800">{doc.type}</p>
                      {doc.projectId ? (
                        <Link
                          href={`/gc/projects/${doc.projectId}`}
                          className="text-xs text-indigo-500 hover:text-indigo-700 hover:underline transition-colors"
                        >
                          {doc.projectName}
                        </Link>
                      ) : (
                        <p className="text-xs text-slate-400">{doc.projectName}</p>
                      )}
                    </div>
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <DocStatusBadge status={doc.status} />
                  </TableCell>

                  {/* Expiry */}
                  <TableCell>
                    <ExpiryLabel date={doc.expiry_date} />
                  </TableCell>

                  {/* Uploaded */}
                  <TableCell className="text-xs text-slate-500">
                    {new Date(doc.created_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Row count footer */}
        {filtered.length > 0 && (
          <div className="border-t border-slate-100 px-4 py-2.5 text-xs text-slate-400">
            Showing {filtered.length} of {docs.length} document{docs.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  )
}
