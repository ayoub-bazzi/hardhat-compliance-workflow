import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ShieldCheck, ShieldAlert, Clock, AlertTriangle, HardHat,
  BadgeCheck, CircleDollarSign, Camera, UserCheck, Landmark,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatRejectionReason } from '@/lib/utils'
import { createClient, createServiceSupabaseClient } from '@/lib/supabase'
import { SubUploadDialog } from './sub-upload-dialog'
import { SafetyPass } from './safety-pass'
import { ComplianceClearancePdf } from '@/components/compliance-clearance-pdf'
import { InvoiceUpload } from './invoice-upload'
import type { Document, DocumentType, Project, Subcontractor } from '@/types/database.types'

// ── Constants ─────────────────────────────────────────────────

const REQUIRED_TYPES: DocumentType[] = ['COI', 'W9', 'Certified Payroll']

// ── Helpers ───────────────────────────────────────────────────

type SubWithProject = Subcontractor & { projects: Project | null }

function latestDoc(docs: Document[], type: DocumentType): Document | undefined {
  return docs
    .filter((d) => d.type === type)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
}

// ── Badge components ──────────────────────────────────────────

function DocStatusBadge({ doc }: { doc: Document | undefined }) {
  if (!doc) {
    return (
      <Badge className="border border-slate-200 bg-white text-slate-400 hover:bg-white gap-1">
        Not Uploaded
      </Badge>
    )
  }
  if (doc.status === 'approved') {
    return (
      <Badge className="border-0 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 gap-1">
        <ShieldCheck className="h-3 w-3" />Approved
      </Badge>
    )
  }
  if (doc.status === 'rejected') {
    return (
      <Badge className="border-0 bg-red-100 text-red-700 hover:bg-red-100 gap-1">
        <ShieldAlert className="h-3 w-3" />Rejected
      </Badge>
    )
  }
  return (
    <Badge className="border-0 bg-amber-100 text-amber-700 hover:bg-amber-100 gap-1">
      <Clock className="h-3 w-3" />Pending Review
    </Badge>
  )
}

function ComplianceBadge({ status }: { status: Subcontractor['compliance_status'] }) {
  const cfg = {
    compliant:     'border-0 bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
    warning:       'border-0 bg-amber-100  text-amber-700  hover:bg-amber-100',
    non_compliant: 'border-0 bg-red-100    text-red-700    hover:bg-red-100',
  } as const
  const labels = { compliant: 'Compliant', warning: 'Warning', non_compliant: 'Non-Compliant' } as const
  return <Badge className={cfg[status]}>{labels[status]}</Badge>
}

// ── Project card ──────────────────────────────────────────────

function ProjectCard({
  sub,
  docs,
}: {
  sub: SubWithProject
  docs: Document[]
}) {
  const project = sub.projects

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <p className="font-semibold text-slate-900">{project?.name ?? 'Unknown Project'}</p>
          {project?.location && (
            <p className="text-xs text-slate-500 mt-0.5">{project.location}</p>
          )}
        </div>
        <ComplianceBadge status={sub.compliance_status} />
      </div>

      {/* Required documents */}
      <div className="divide-y divide-slate-100">
        {REQUIRED_TYPES.map((type) => {
          const doc = latestDoc(docs, type)
          const needsUpload = !doc || doc.status === 'rejected'

          return (
            <div key={type} className="flex items-center justify-between px-5 py-3.5">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-slate-800">{type}</p>
                {doc?.status === 'rejected' && doc.rejection_reason && (
                  <ul className="space-y-0.5">
                    {formatRejectionReason(doc.rejection_reason).map((reason, i) => (
                      <li key={i} className="text-xs text-red-500">· {reason}</li>
                    ))}
                  </ul>
                )}
                {doc?.expiry_date && doc.status !== 'rejected' && (
                  <p className="text-xs text-slate-400">
                    Expires{' '}
                    {new Date(doc.expiry_date).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <DocStatusBadge doc={doc} />
                {needsUpload && (
                  <SubUploadDialog
                    subcontractorId={sub.id}
                    projectId={sub.project_id}
                    defaultDocType={type}
                    triggerLabel={doc?.status === 'rejected' ? 'Re-upload' : `Upload ${type}`}
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────

export default async function SubcontractorPortalPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // First-login claim: bind any unclaimed subcontractor records (where
  // contact_email matches and user_id is still NULL) to this auth.uid().
  // Idempotent — subsequent calls update 0 rows and return nothing.
  if (user.email) {
    await supabase
      .from('subcontractors')
      .update({ user_id: user.id })
      .eq('contact_email', user.email)
      .is('user_id', null)
  }

  // Query by user_id — the cryptographic binding set during the claim above.
  const { data: subRows } = await supabase
    .from('subcontractors')
    .select('*, projects(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const subs = (subRows ?? []) as SubWithProject[]

  // Fetch all their documents
  const subIds = subs.map((s) => s.id)
  const { data: allDocs } = subIds.length > 0
    ? await supabase
        .from('documents')
        .select('*')
        .in('subcontractor_id', subIds)
        .eq('is_current', true)
        .order('created_at', { ascending: false })
    : { data: [] }

  const docs = (allDocs ?? []) as Document[]

  // Group documents by subcontractor_id
  const docsBySubId = docs.reduce<Record<string, Document[]>>((acc, doc) => {
    if (!acc[doc.subcontractor_id]) acc[doc.subcontractor_id] = []
    acc[doc.subcontractor_id].push(doc)
    return acc
  }, {})

  // Fetch payment certificates (service client bypasses sub's RLS)
  const service = createServiceSupabaseClient()
  const { data: certRows } = subIds.length > 0
    ? await service
        .from('payment_certificates')
        .select('id, amount, period_start, period_end, status')
        .in('subcontractor_id', subIds)
        .order('created_at', { ascending: false })
    : { data: [] }
  const certs = (certRows ?? []) as Array<{
    id: string
    amount: number
    period_start: string
    period_end: string
    status: string | null
  }>

  // Fetch GC org name for clearance PDF
  let orgName = 'HardHat Compliance'
  const orgId = subs[0]?.organization_id
  if (orgId) {
    const { data: org } = await service
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .single()
    if (org) orgName = (org as { name: string }).name
  }

  // Valid approved docs for clearance PDF
  const validDocs = docs
    .filter((d) => d.status === 'approved')
    .map((d) => ({ type: d.type, expiry_date: d.expiry_date }))

  // Collect all action-required items (rejected docs)
  const rejectedDocs = docs.filter((d) => d.status === 'rejected')

  // Safety Pass: cleared only if every sub record is compliant
  const isCleared = subs.length > 0 && subs.every((s) => s.compliance_status === 'compliant')
  const companyName = subs[0]?.company_name ?? 'Unknown Company'

  // Payment status: any hold → show warning; all clear + compliant → show celebration
  const anyOnHold    = subs.some((s) => s.payment_status === 'Compliance Hold')
  const allClearToPay = subs.length > 0 && subs.every((s) => s.payment_status === 'Clear to Pay') && isCleared

  const hasProfilePhoto = subs.some((s) => s.profile_photo_url)

  // ── Empty state ──
  if (subs.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Compliance Portal</h1>
          <p className="mt-1 text-sm text-slate-500">
            Your compliance documents and project assignments.
          </p>
        </div>
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
            <HardHat className="h-7 w-7 text-slate-400" />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-slate-900">No projects assigned yet</h3>
          <p className="mt-1 max-w-xs text-sm text-slate-500">
            Ask your General Contractor to invite you to a project using{' '}
            <strong>{user.email}</strong>.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Compliance Portal</h1>
        <p className="mt-1 text-sm text-slate-500">
          {subs.length === 1
            ? '1 project assignment'
            : `${subs.length} project assignments`}
        </p>
      </div>

      {/* Safety Pass */}
      <div className="mx-auto max-w-sm">
        <SafetyPass
          email={user.email ?? ''}
          isCleared={isCleared}
          companyName={companyName}
        />
      </div>

      {/* Compliance Clearance Certificate download */}
      <ComplianceClearancePdf
        subId={subs[0].id}
        companyName={companyName}
        riskScore={subs[0].risk_score ?? 100}
        isCleared={isCleared}
        validDocs={validDocs}
        orgName={orgName}
      />

      {/* Digital ID enrollment status */}
      {hasProfilePhoto ? (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3.5">
          <UserCheck className="h-5 w-5 shrink-0 text-emerald-600" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-emerald-800">Digital ID Active</p>
            <p className="mt-0.5 text-xs text-emerald-700">Your gate identity photo is enrolled and verified.</p>
          </div>
          <Link
            href="/subcontractor/onboarding/photo"
            className="shrink-0 text-xs font-semibold text-emerald-700 underline hover:text-emerald-900"
          >
            Update photo
          </Link>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <Camera className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">Complete Your Digital Site ID</p>
            <p className="mt-0.5 text-xs text-amber-700">
              Enroll your face photo to activate gate identity verification for your site pass.
            </p>
            <Link
              href="/subcontractor/onboarding/photo"
              className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-amber-900 underline hover:text-amber-700"
            >
              Set up now →
            </Link>
          </div>
        </div>
      )}

      {/* Payment Hold Released banner */}
      {allClearToPay && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
          <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">Payments Cleared</p>
            <p className="mt-0.5 text-xs text-emerald-700">
              Your compliance is fully restored. All pending payments have been automatically released.
            </p>
          </div>
        </div>
      )}

      {/* Compliance Hold warning */}
      {anyOnHold && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <CircleDollarSign className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div>
            <p className="text-sm font-semibold text-red-800">Payments on Compliance Hold</p>
            <p className="mt-0.5 text-xs text-red-700">
              Pending payments are frozen until all compliance issues are resolved. Upload corrected
              documents below — your hold will release automatically once your risk score clears.
            </p>
          </div>
        </div>
      )}

      {/* Action Required banner */}
      {rejectedDocs.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {rejectedDocs.length === 1
                ? '1 document requires attention'
                : `${rejectedDocs.length} documents require attention`}
            </p>
            <p className="mt-0.5 text-xs text-amber-700">
              Re-upload the rejected documents below to restore compliance.
            </p>
          </div>
        </div>
      )}

      {/* Project cards */}
      <div className="space-y-6">
        {subs.map((sub) => (
          <ProjectCard
            key={sub.id}
            sub={sub}
            docs={docsBySubId[sub.id] ?? []}
          />
        ))}
      </div>

      {/* Payment Certificates & Invoice Upload */}
      {certs.length > 0 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Landmark className="h-5 w-5 text-slate-500" />
              Payment Certificates
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Upload your invoice for each certificate — AI cross-checks the amount automatically.
            </p>
          </div>
          <div className="space-y-6">
            {certs.map((cert) => (
              <div key={cert.id} className="space-y-3">
                {/* Cert header */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-sm font-semibold text-slate-700">
                      CERT-{cert.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="text-xs text-slate-400">
                      {cert.period_start} → {cert.period_end} ·{' '}
                      {(cert.amount ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                    cert.status === 'released' ? 'bg-indigo-100 text-indigo-700' :
                    cert.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                    cert.status === 'escrowed' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {cert.status ? cert.status.charAt(0).toUpperCase() + cert.status.slice(1) : 'Pending'}
                  </span>
                </div>
                {/* Invoice upload (not shown for released certs) */}
                {cert.status !== 'released' && (
                  <InvoiceUpload certId={cert.id} amountClaimed={cert.amount ?? 0} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
