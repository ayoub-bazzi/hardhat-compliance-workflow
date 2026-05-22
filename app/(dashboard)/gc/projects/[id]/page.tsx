import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AlertCircle, ArrowLeft, BarChart3, ShieldAlert, ShieldCheck, TrendingUp, Users } from 'lucide-react'
import { ProjectLifecycleControls } from './project-lifecycle-client'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase'
import { AddSubcontractorDialog } from './add-subcontractor-dialog'
import { UploadDocumentDialog } from './upload-document-dialog'
import { DownloadButton } from './download-button'
import { NotifyButton } from './notify-button'
import { InviteButton } from './invite-button'
import { AuditTrailButton } from './audit-trail-button'
import { SubActionsMenu } from './sub-actions-menu'
import { DocActionsMenu, ReplaceDocumentButton } from './doc-actions-menu'
import { ForceApproveButton } from './force-approve-button'
import { DocHistoryDrawer } from './doc-history-drawer'
import { formatRejectionReason } from '@/lib/utils'
import type { Project, Subcontractor, Document } from '@/types/database.types'

// ── Shared badge helpers ───────────────────────────────────────

function ProjectStatusBadge({ status }: { status: Project['status'] }) {
  return status === 'active' ? (
    <Badge className="border-0 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Active</Badge>
  ) : (
    <Badge className="border-0 bg-slate-100 text-slate-500 hover:bg-slate-100">Archived</Badge>
  )
}

function ComplianceBadge({ status }: { status: Subcontractor['compliance_status'] }) {
  const styles = {
    compliant:     'border-0 bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
    warning:       'border-0 bg-amber-100  text-amber-700  hover:bg-amber-100',
    non_compliant: 'border-0 bg-red-100    text-red-700    hover:bg-red-100',
  } as const
  const labels = {
    compliant: 'Compliant', warning: 'Warning', non_compliant: 'Non-Compliant',
  } as const
  return <Badge className={styles[status]}>{labels[status]}</Badge>
}

function DocumentStatusBadge({ status }: { status: Document['status'] }) {
  const config = {
    pending:              { style: 'border-0 bg-indigo-100  text-indigo-700  hover:bg-indigo-100',  label: 'Scanning…',       Icon: null,        pulse: true  },
    approved:             { style: 'border-0 bg-emerald-100 text-emerald-700 hover:bg-emerald-100', label: 'Approved',        Icon: ShieldCheck, pulse: false },
    rejected:             { style: 'border-0 bg-red-100     text-red-700     hover:bg-red-100',     label: 'Rejected',        Icon: ShieldAlert, pulse: false },
    pending_verification: { style: 'border-0 bg-slate-100   text-slate-600   hover:bg-slate-100',   label: 'Needs GC Review', Icon: null,        pulse: false },
  } as const
  const entry = config[status] ?? config.pending
  const { style, label, Icon, pulse } = entry
  return (
    <Badge className={`${style} gap-1 ${pulse ? 'animate-pulse' : ''}`}>
      {Icon && <Icon className="h-3 w-3" />}
      {label}
    </Badge>
  )
}

function daysUntilExpiry(expiryDate: string | null, docType: string): number | null {
  if (!expiryDate || docType === 'W9') return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const expiry = new Date(expiryDate); expiry.setHours(0, 0, 0, 0)
  return Math.ceil((expiry.getTime() - today.getTime()) / 86_400_000)
}

function ValidityBadge({ days }: { days: number | null }) {
  if (days === null) return <span className="text-slate-400">—</span>
  if (days <= 0)  return <span className="text-xs font-semibold text-red-600">Expired</span>
  if (days <= 30) return <span className="text-xs font-semibold text-amber-500">{days}d left</span>
  return <span className="text-xs font-medium text-emerald-600">{days}d left</span>
}

// ── Stat cards ────────────────────────────────────────────────

function StatCard({
  icon: Icon, label, value, bg, fg,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  bg: string
  fg: string
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${bg}`}>
        <Icon className={`h-5 w-5 ${fg}`} />
      </div>
      <div>
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  )
}

function ComplianceProgress({ rate }: { rate: number }) {
  const barColor =
    rate === 100 ? 'bg-emerald-500' :
    rate >= 70   ? 'bg-amber-400' :
                   'bg-red-500'
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">Compliance Rate</p>
          <p className="text-2xl font-bold text-slate-900">{rate}%</p>
        </div>
        <TrendingUp className={`h-5 w-5 ${rate >= 70 ? 'text-emerald-500' : 'text-red-400'}`} />
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${rate}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-slate-400">
        {rate === 100 ? 'All subcontractors compliant' : `${100 - rate}% require attention`}
      </p>
    </div>
  )
}

// ── Skeletons ──────────────────────────────────────────────────

function TableSkeleton({ cols }: { cols: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <Table>
        <TableBody>
          {Array.from({ length: 3 }).map((_, i) => (
            <TableRow key={i} className="hover:bg-transparent">
              {Array.from({ length: cols }).map((__, j) => (
                <TableCell key={j}><Skeleton className="h-4 w-full max-w-[160px]" /></TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

// ── Empty states ───────────────────────────────────────────────

function EmptyState({ icon: Icon, title, subtitle }: {
  icon: React.ElementType; title: string; subtitle: string
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
        <Icon className="h-6 w-6 text-slate-400" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
    </div>
  )
}

// ── Subcontractors table ───────────────────────────────────────

function SubcontractorsTable({ subcontractors, projectId }: { subcontractors: Subcontractor[]; projectId: string }) {
  if (subcontractors.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No subcontractors yet"
        subtitle='Click "Add Subcontractor" to assign one to this project.'
      />
    )
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="font-semibold text-slate-700">Company</TableHead>
            <TableHead className="font-semibold text-slate-700">Contact Email</TableHead>
            <TableHead className="font-semibold text-slate-700">Compliance Status</TableHead>
            <TableHead className="font-semibold text-slate-700">Added</TableHead>
            <TableHead className="w-32" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {subcontractors.map((sub) => (
            <TableRow key={sub.id} className="hover:bg-slate-50">
              <TableCell className="font-medium text-slate-900">{sub.company_name}</TableCell>
              <TableCell className="text-slate-500">{sub.contact_email}</TableCell>
              <TableCell><ComplianceBadge status={sub.compliance_status} /></TableCell>
              <TableCell className="text-slate-500">
                {new Date(sub.created_at).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                })}
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  <InviteButton
                    companyName={sub.company_name}
                    contactEmail={sub.contact_email}
                    subcontractorId={sub.id}
                    projectId={projectId}
                  />
                  <SubActionsMenu
                    subcontractorId={sub.id}
                    projectId={projectId}
                    companyName={sub.company_name}
                    contactEmail={sub.contact_email}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

// ── Documents table (streamed) ────────────────────────────────

type DocumentWithSub = Document & {
  subcontractors: { company_name: string } | null
}

async function DocumentsTable({
  subcontractorIds,
  projectId,
  subcontractors,
}: {
  subcontractorIds: string[]
  projectId: string
  subcontractors: Subcontractor[]
}) {
  if (subcontractorIds.length === 0) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="No documents yet"
        subtitle="Add a subcontractor first, then upload their compliance documents."
      />
    )
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('documents')
    .select('*, subcontractors(company_name)')
    .in('subcontractor_id', subcontractorIds)
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        Failed to load documents: {error.message}
      </div>
    )
  }

  const allDocuments = (data ?? []) as DocumentWithSub[]
  const currentDocs  = allDocuments.filter((d) => d.is_current)

  if (currentDocs.length === 0) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="No documents uploaded yet"
        subtitle='Click "Upload Document" to add the first compliance file.'
      />
    )
  }

  // Build a history map: key `subId:type` → array of non-current (archived) docs.
  const historyMap = new Map<string, DocumentWithSub[]>()
  for (const doc of allDocuments) {
    if (!doc.is_current) {
      const key = `${doc.subcontractor_id}:${doc.type}`
      if (!historyMap.has(key)) historyMap.set(key, [])
      historyMap.get(key)!.push(doc)
    }
  }

  // True when the current approved doc has a pending renewal waiting in the wings.
  function hasRenewal(doc: DocumentWithSub): boolean {
    if (doc.status !== 'approved') return false
    const siblings = historyMap.get(`${doc.subcontractor_id}:${doc.type}`) ?? []
    return siblings.some((d) => d.status === 'pending' || d.status === 'pending_verification')
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="font-semibold text-slate-700">Subcontractor</TableHead>
            <TableHead className="font-semibold text-slate-700">Type</TableHead>
            <TableHead className="font-semibold text-slate-700">Status</TableHead>
            <TableHead className="font-semibold text-slate-700">Expiry</TableHead>
            <TableHead className="font-semibold text-slate-700">Validity</TableHead>
            <TableHead className="font-semibold text-slate-700">Uploaded</TableHead>
            <TableHead className="w-10" />
            <TableHead className="w-12" />
            <TableHead className="w-8" />
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentDocs.map((doc) => {
            const subName    = doc.subcontractors?.company_name ?? '—'
            const historyKey = `${doc.subcontractor_id}:${doc.type}`
            const history    = historyMap.get(historyKey) ?? []
            return (
              <TableRow
                key={doc.id}
                className={`hover:bg-slate-50 ${doc.status === 'rejected' ? 'bg-red-50/30' : ''}`}
              >
                <TableCell className="font-medium text-slate-900">{subName}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-slate-600">
                    {doc.type}
                    <DocHistoryDrawer
                      documentType={doc.type}
                      subcontractorName={subName}
                      historyDocs={history}
                      projectId={projectId}
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1.5">
                    <DocumentStatusBadge status={doc.status} />
                    {hasRenewal(doc) && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
                        Renewal in progress
                      </span>
                    )}
                    {doc.status === 'rejected' && doc.rejection_reason && (
                      <div className="flex items-start gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5">
                        <AlertCircle className="mt-0.5 h-3 w-3 shrink-0 text-red-500" />
                        <ul className="space-y-0.5">
                          {formatRejectionReason(doc.rejection_reason).map((reason, i) => (
                            <li key={i} className="text-xs leading-snug text-red-700">· {reason}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {doc.status === 'rejected' && (
                      <ReplaceDocumentButton
                        projectId={projectId}
                        subcontractors={subcontractors}
                        defaultSubId={doc.subcontractor_id}
                        defaultDocType={doc.type}
                      />
                    )}
                    {doc.status === 'pending_verification' && (
                      <ForceApproveButton
                        documentId={doc.id}
                        projectId={projectId}
                      />
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-slate-500">
                  {doc.expiry_date
                    ? new Date(doc.expiry_date).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })
                    : '—'}
                </TableCell>
                <TableCell>
                  <ValidityBadge days={daysUntilExpiry(doc.expiry_date, doc.type)} />
                </TableCell>
                <TableCell className="text-slate-500">
                  {new Date(doc.created_at).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </TableCell>
                <TableCell>
                  {doc.status === 'rejected' && (
                    <NotifyButton subcontractorId={doc.subcontractor_id} />
                  )}
                </TableCell>
                <TableCell>
                  {doc.file_path && <DownloadButton documentId={doc.id} />}
                </TableCell>
                <TableCell>
                  <AuditTrailButton
                    documentId={doc.id}
                    projectId={projectId}
                    documentStatus={doc.status}
                    documentType={doc.type}
                    subcontractorName={subName}
                  />
                </TableCell>
                <TableCell>
                  <DocActionsMenu
                    documentId={doc.id}
                    projectId={projectId}
                  />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile }  = user
    ? await supabase.from('profiles').select('app_role').eq('id', user.id).single()
    : { data: null }

  const appRole = profile?.app_role
  const canViewInsights = appRole != null && ['admin', 'finance', 'project_manager'].includes(appRole)

  const [projectResult, subsResult] = await Promise.all([
    supabase.from('projects').select('*').eq('id', id).single(),
    supabase.from('subcontractors').select('*').eq('project_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (!projectResult.data) notFound()

  const project        = projectResult.data
  const subcontractors = subsResult.data ?? []
  const subIds         = subcontractors.map((s) => s.id)

  const totalSubs      = subcontractors.length
  const compliantCount = subcontractors.filter((s) => s.compliance_status === 'compliant').length
  const flaggedCount   = subcontractors.filter((s) => s.compliance_status === 'non_compliant').length
  const rate           = totalSubs > 0 ? Math.round((compliantCount / totalSubs) * 100) : 100

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Link
        href="/gc/projects"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        All Projects
      </Link>

      {/* Project header */}
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {project.name}
            </h1>
            <ProjectStatusBadge status={project.status} />
          </div>
          {project.location && (
            <p className="text-sm text-slate-500">{project.location}</p>
          )}
        </div>
        {canViewInsights && (
          <Link
            href={`/gc/projects/${id}/insights`}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <BarChart3 className="h-4 w-4 text-amber-500" />
            Project Insights
          </Link>
        )}
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          icon={Users}
          label="Total Subcontractors"
          value={totalSubs}
          bg="bg-slate-100"
          fg="text-slate-600"
        />
        <StatCard
          icon={ShieldCheck}
          label="Compliant"
          value={compliantCount}
          bg="bg-emerald-100"
          fg="text-emerald-600"
        />
        <StatCard
          icon={AlertCircle}
          label="Non-Compliant Flags"
          value={flaggedCount}
          bg={flaggedCount > 0 ? 'bg-red-100' : 'bg-slate-100'}
          fg={flaggedCount > 0 ? 'text-red-600' : 'text-slate-400'}
        />
        <ComplianceProgress rate={rate} />
      </div>

      {/* ── Subcontractors ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Subcontractors</h2>
            <p className="text-sm text-slate-500">Companies assigned to this project.</p>
          </div>
          <AddSubcontractorDialog projectId={id} />
        </div>
        <SubcontractorsTable subcontractors={subcontractors} projectId={id} />
      </section>

      {/* ── Compliance Vault ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Compliance Vault</h2>
            <p className="text-sm text-slate-500">
              All compliance documents uploaded for this project.
            </p>
          </div>
          <UploadDocumentDialog projectId={id} subcontractors={subcontractors} />
        </div>
        <Suspense fallback={<TableSkeleton cols={8} />}>
          <DocumentsTable subcontractorIds={subIds} projectId={id} subcontractors={subcontractors} />
        </Suspense>
      </section>

      {/* ── Danger Zone ── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Project Settings</h2>
          <p className="text-sm text-slate-500">Archive or permanently remove this project.</p>
        </div>
        <ProjectLifecycleControls
          projectId={id}
          projectName={project.name}
          currentStatus={project.status}
        />
      </section>
    </div>
  )
}
