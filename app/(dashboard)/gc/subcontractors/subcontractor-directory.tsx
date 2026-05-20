'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, Building2, ArrowUpRight } from 'lucide-react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import type { SubcontractorProfile } from './page'
import type { ComplianceStatus } from '@/types/database.types'

// ── Shared sub-components ──────────────────────────────────────

function ComplianceBadge({ status }: { status: ComplianceStatus }) {
  if (status === 'compliant') {
    return (
      <Badge className="border-0 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
        Compliant
      </Badge>
    )
  }
  if (status === 'warning') {
    return (
      <Badge className="border-0 bg-amber-100 text-amber-700 hover:bg-amber-100">
        Warning
      </Badge>
    )
  }
  return (
    <Badge className="border-0 bg-red-100 text-red-700 hover:bg-red-100">
      Non-Compliant
    </Badge>
  )
}

function ProjectStatusBadge({ status }: { status: 'active' | 'archived' }) {
  return status === 'active' ? (
    <Badge className="border-0 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Active</Badge>
  ) : (
    <Badge className="border-0 bg-slate-100 text-slate-500 hover:bg-slate-100">Archived</Badge>
  )
}

function Initials({ name }: { name: string }) {
  const text = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
      {text}
    </div>
  )
}

// ── Profile Sheet ──────────────────────────────────────────────

function ProfileSheet({
  profile,
  open,
  onOpenChange,
}: {
  profile: SubcontractorProfile | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  if (!profile) return null

  const sorted = [...profile.assignments].sort((a, b) => {
    // Active first, then by project name
    if (a.projectStatus !== b.projectStatus) {
      return a.projectStatus === 'active' ? -1 : 1
    }
    return a.projectName.localeCompare(b.projectName)
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700">
              {profile.company_name
                .split(' ')
                .map((w) => w[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-base font-semibold text-slate-900 truncate">
                {profile.company_name}
              </SheetTitle>
              <SheetDescription className="text-sm text-slate-500 truncate">
                {profile.contact_email}
              </SheetDescription>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-3">
            <ComplianceBadge status={profile.globalCompliance} />
            <span className="text-xs text-slate-500">
              {profile.activeProjectCount} active project{profile.activeProjectCount !== 1 ? 's' : ''}
            </span>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Project Assignments ({sorted.length})
          </p>

          {sorted.map((a) => (
            <div
              key={a.subcontractorId}
              className="rounded-lg border border-slate-200 bg-white p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{a.projectName}</p>
                </div>
                <Link
                  href={`/gc/projects/${a.projectId}`}
                  className="shrink-0 text-slate-400 hover:text-slate-700 transition-colors"
                  title="Open project"
                >
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="flex items-center gap-2">
                <ProjectStatusBadge status={a.projectStatus} />
                <ComplianceBadge status={a.complianceStatus} />
              </div>
            </div>
          ))}

          {sorted.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">No assignments found.</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ── Main component ─────────────────────────────────────────────

export function SubcontractorDirectory({ profiles }: { profiles: SubcontractorProfile[] }) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<SubcontractorProfile | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return profiles
    return profiles.filter(
      (p) =>
        p.company_name.toLowerCase().includes(q) ||
        p.contact_email.toLowerCase().includes(q)
    )
  }, [profiles, search])

  function openProfile(profile: SubcontractorProfile) {
    setSelected(profile)
    setSheetOpen(true)
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input
            placeholder="Search by company or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="font-semibold text-slate-700">Company</TableHead>
              <TableHead className="font-semibold text-slate-700">Contact Email</TableHead>
              <TableHead className="font-semibold text-slate-700 text-center">Active Projects</TableHead>
              <TableHead className="font-semibold text-slate-700">Global Compliance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <Building2 className="h-8 w-8" />
                    <p className="text-sm font-medium">
                      {search ? 'No companies match your search' : 'No subcontractors yet'}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((profile) => (
                <TableRow
                  key={`${profile.company_name}||${profile.contact_email}`}
                  className="cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => openProfile(profile)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Initials name={profile.company_name} />
                      <span className="font-medium text-slate-900">{profile.company_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600 text-sm">{profile.contact_email}</TableCell>
                  <TableCell className="text-center">
                    <span className="text-sm font-semibold text-slate-700">
                      {profile.activeProjectCount}
                    </span>
                  </TableCell>
                  <TableCell>
                    <ComplianceBadge status={profile.globalCompliance} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ProfileSheet
        profile={selected}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </>
  )
}
