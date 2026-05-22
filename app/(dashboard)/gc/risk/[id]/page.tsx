import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, ShieldCheck, ShieldAlert, ShieldX,
  FileText, Clock, Phone, Mail, GitBranch,
} from 'lucide-react'
import { createClient, createServiceSupabaseClient } from '@/lib/supabase'
import { QRPass } from '@/components/qr-pass'
import { Badge } from '@/components/ui/badge'
import { AuditTimeline } from '@/components/audit-timeline'
import { AuditExportButton } from '@/components/audit-export-button'
import { RiskDetailBar } from '@/components/risk-score-bar'
import { PrequalReview } from './prequal-review'
import { PhotoManagement } from './photo-management'
import { InductionPanel } from './induction-panel'
import type { AuditEvent, PrequalSubmission } from '@/types/database.types'

export default async function SubcontractorPassPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  // Get profile for org_id
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('profiles').select('organization_id').eq('id', user.id).single()
    : { data: null }

  const orgId = profile?.organization_id
  if (!orgId) notFound()

  // Fetch the sub (RLS ensures it belongs to this org)
  const { data: sub } = await supabase
    .from('subcontractors')
    .select('id, company_name, contact_email, compliance_status, risk_score, primary_contact_name, primary_contact_phone, profile_photo_url, safety_induction_complete, induction_date')
    .eq('id', id)
    .single()

  if (!sub) notFound()

  // Compliance docs
  const { data: complianceDocs } = await supabase
    .from('compliance_docs')
    .select('id, doc_name, doc_type, audit_status, expiry_date')
    .eq('subcontractor_id', id)
    .order('expiry_date', { ascending: true })

  // Legacy documents
  const { data: legacyDocs } = await supabase
    .from('documents')
    .select('id, type, status, expiry_date')
    .eq('subcontractor_id', id)
    .order('expiry_date', { ascending: true })

  // Golden Thread audit events — newest first
  const { data: auditEvents } = await supabase
    .from('audit_events')
    .select('*')
    .eq('subcontractor_id', id)
    .order('created_at', { ascending: false })
    .limit(100)

  // Prequal submission (one per sub)
  const { data: prequal } = await supabase
    .from('prequal_submissions')
    .select('*')
    .eq('subcontractor_id', id)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const allDocs = complianceDocs ?? []
  const hasExpired = allDocs.some((d) => d.expiry_date && d.expiry_date < today)
  const hasFlagged = allDocs.some((d) => d.audit_status === 'Flagged')
  const hasLegacyIssues = (legacyDocs ?? []).some(
    (d) => d.status === 'rejected' || (d.expiry_date && d.expiry_date < today)
  )

  const isGranted = !hasExpired && !hasFlagged && !hasLegacyIssues && allDocs.length > 0

  // Resolve profile photo storage path to a signed URL (profile-photos bucket is private).
  const rawPhotoPath = sub.profile_photo_url ?? null
  let profilePhotoUrl: string | null = rawPhotoPath
  if (rawPhotoPath && !rawPhotoPath.startsWith('http')) {
    const { data: signed } = await createServiceSupabaseClient().storage
      .from('profile-photos')
      .createSignedUrl(rawPhotoPath, 3600)
    profilePhotoUrl = signed?.signedUrl ?? null
  }

  return (
    <div className="space-y-6">
      {/* Back nav */}
      <div>
        <Link
          href="/gc/risk"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Risk Overview
        </Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{sub.company_name}</h1>
            <p className="mt-0.5 text-sm text-slate-500">Site Access Pass &amp; Compliance Profile</p>
          </div>
          <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ring-1 shrink-0 mt-1 ${
            isGranted
              ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
              : 'bg-red-50 text-red-700 ring-red-200'
          }`}>
            {isGranted
              ? <><ShieldCheck className="h-4 w-4" /> Site Ready</>
              : <><ShieldX className="h-4 w-4" /> Not Cleared</>
            }
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: QR Pass */}
        <div className="flex flex-col items-center gap-4">
          <QRPass
            subcontractorId={sub.id}
            orgId={orgId}
            companyName={sub.company_name}
          />
          <p className="text-center text-xs text-slate-400 max-w-[240px]">
            Guard scans with camera at <span className="font-mono">/gc/scan</span> or opens the link directly. Token is valid for 24 hours.
          </p>
        </div>

        {/* Right: Info + Docs */}
        <div className="lg:col-span-2 space-y-4">
          {/* Contact info */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Contact</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                {sub.contact_email}
              </div>
              {sub.primary_contact_name && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                  {sub.primary_contact_name}
                  {sub.primary_contact_phone && (
                    <span className="text-slate-400">— {sub.primary_contact_phone}</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Compliance docs */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50 px-5 py-3.5 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">Insurance Vault — This Sub</h2>
              <Link
                href="/gc/insurance"
                className="text-xs text-indigo-600 hover:underline"
              >
                Manage →
              </Link>
            </div>

            {allDocs.length === 0 && (legacyDocs ?? []).length === 0 ? (
              <div className="flex items-center gap-3 px-5 py-6">
                <ShieldAlert className="h-8 w-8 text-amber-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-slate-700">No compliance documents</p>
                  <p className="text-xs text-slate-500">Upload COIs and licenses in the Insurance Vault to enable site access.</p>
                </div>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['Document', 'Type', 'Status', 'Expiry'].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 first:pl-5 last:pr-5">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {allDocs.map((doc) => {
                    const isExp = doc.expiry_date && doc.expiry_date < today
                    return (
                      <tr key={doc.id}>
                        <td className="py-3 pl-5 pr-4 font-medium text-slate-800">{doc.doc_name}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{doc.doc_type}</td>
                        <td className="px-4 py-3">
                          <Badge className={`border-0 text-xs font-semibold ring-1 ${
                            doc.audit_status === 'Verified'
                              ? 'bg-emerald-950 text-emerald-400 ring-emerald-800'
                              : doc.audit_status === 'Flagged'
                              ? 'bg-red-950 text-red-400 ring-red-800'
                              : 'bg-slate-100 text-slate-500 ring-slate-300'
                          }`}>
                            {doc.audit_status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 pr-5">
                          {doc.expiry_date ? (
                            <span className={`text-xs flex items-center gap-1 ${isExp ? 'text-red-600 font-semibold' : 'text-slate-600'}`}>
                              {isExp && <Clock className="h-3 w-3" />}
                              {doc.expiry_date}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {(legacyDocs ?? []).map((doc) => {
                    const isExp = doc.expiry_date && doc.expiry_date < today
                    return (
                      <tr key={doc.id} className="bg-slate-50/50">
                        <td className="py-3 pl-5 pr-4 text-slate-600 italic">{doc.type}</td>
                        <td className="px-4 py-3 text-xs text-slate-400">Legacy</td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className={`text-xs ${
                            doc.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                            doc.status === 'rejected' ? 'bg-red-100 text-red-700' : ''
                          }`}>
                            {doc.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 pr-5">
                          {doc.expiry_date ? (
                            <span className={`text-xs ${isExp ? 'text-red-600 font-semibold' : 'text-slate-600'}`}>
                              {doc.expiry_date}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Risk score bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Live Risk Score</p>
        <RiskDetailBar score={sub.risk_score ?? 0} />
      </div>

      {/* Profile photo management */}
      <PhotoManagement
        subId={sub.id}
        companyName={sub.company_name}
        photoUrl={profilePhotoUrl}
      />

      {/* Safety induction tracker */}
      <InductionPanel
        subId={sub.id}
        isComplete={sub.safety_induction_complete}
        inductionDate={sub.induction_date ?? null}
      />

      {/* Prequal review — only shown when a submission exists */}
      {prequal && (
        <PrequalReview prequal={prequal as PrequalSubmission} subId={id} />
      )}

      {/* Hint */}
      <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        <p className="text-xs text-slate-500">
          The QR token is signed with HMAC-SHA256 and expires in 24 hours. Every scan is logged to the{' '}
          <Link href="/gc/audit" className="text-indigo-600 hover:underline">Audit Trails</Link>{' '}
          and the Golden Thread below. Refresh this page to generate a fresh pass.
        </p>
      </div>

      {/* ── Golden Thread Audit Timeline ─────────────────────────── */}
      <div className="rounded-xl border border-slate-700/60 bg-slate-900 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700/60 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <GitBranch className="h-4 w-4 text-indigo-400" />
            <div>
              <h2 className="text-sm font-bold text-white">Golden Thread</h2>
              <p className="text-xs text-slate-500">Immutable compliance audit ledger</p>
            </div>
          </div>
          <AuditExportButton companyName={sub.company_name} />
        </div>

        {/* Print-target container — only this div's innerHTML is sent to the print window */}
        <div id="golden-thread-report" className="px-5 py-5">
          <AuditTimeline events={(auditEvents ?? []) as AuditEvent[]} />
        </div>
      </div>
    </div>
  )
}
