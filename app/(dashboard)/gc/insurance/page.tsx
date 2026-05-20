import { createClient } from '@/lib/supabase'
import { getOrgId } from '@/lib/org'
import { Vault, ShieldCheck, Clock, Flag, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { AuditStatus, ComplianceDocType } from '@/types/database.types'

function AuditStatusBadge({ status }: { status: AuditStatus }) {
  const styles: Record<AuditStatus, string> = {
    Pending:  'bg-slate-100 text-slate-600 ring-slate-300',
    Verified: 'bg-emerald-950 text-emerald-400 ring-emerald-800',
    Flagged:  'bg-red-950 text-red-400 ring-red-800',
  }
  return (
    <Badge className={`border-0 ring-1 font-semibold ${styles[status]}`}>
      {status}
    </Badge>
  )
}

function DocTypeBadge({ type }: { type: ComplianceDocType }) {
  const styles: Record<ComplianceDocType, string> = {
    'COI':           'bg-indigo-100 text-indigo-700',
    'License':       'bg-violet-100 text-violet-700',
    'Golden Thread': 'bg-amber-100 text-amber-700',
  }
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${styles[type]}`}>
      {type}
    </span>
  )
}

async function InsuranceVaultData() {
  const supabase = await createClient()
  const orgId = await getOrgId()
  const today = new Date().toISOString().split('T')[0]

  const { data: docs } = orgId
    ? await supabase
        .from('compliance_docs')
        .select(`
          id, doc_type, doc_name, audit_status, expiry_date, notes, created_at,
          subcontractors ( company_name )
        `)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
    : { data: null }

  const allDocs = docs ?? []
  const pending  = allDocs.filter((d) => d.audit_status === 'Pending').length
  const verified = allDocs.filter((d) => d.audit_status === 'Verified').length
  const flagged  = allDocs.filter((d) => d.audit_status === 'Flagged').length
  const expiring = allDocs.filter(
    (d) => d.expiry_date && d.expiry_date >= today &&
      new Date(d.expiry_date).getTime() - Date.now() < 30 * 86_400_000
  ).length

  return (
    <div className="space-y-6">
      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Docs', value: allDocs.length, icon: Vault, bg: 'bg-slate-100', fg: 'text-slate-600' },
          { label: 'Pending Review', value: pending, icon: Clock, bg: 'bg-slate-100', fg: 'text-slate-500' },
          { label: 'Verified', value: verified, icon: ShieldCheck, bg: 'bg-emerald-100', fg: 'text-emerald-600' },
          { label: 'Flagged', value: flagged, icon: Flag, bg: flagged > 0 ? 'bg-red-100' : 'bg-slate-100', fg: flagged > 0 ? 'text-red-600' : 'text-slate-400' },
        ].map(({ label, value, icon: Icon, bg, fg }) => (
          <div key={label} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bg}`}>
              <Icon className={`h-5 w-5 ${fg}`} />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">{label}</p>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {expiring > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">{expiring} document{expiring > 1 ? 's' : ''}</span> expiring within 30 days — review and renew before gate access is blocked.
          </p>
        </div>
      )}

      {/* Documents table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-700">Insurance Vault</h2>
          <button className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-slate-700">
            <Plus className="h-3.5 w-3.5" />
            Add Document
          </button>
        </div>

        {allDocs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Vault className="h-10 w-10 text-slate-300" />
            <p className="text-sm font-medium text-slate-500">No compliance documents yet</p>
            <p className="text-xs text-slate-400">
              Upload COIs, licenses, and Golden Thread documents for your subs.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Subcontractor', 'Document', 'Type', 'Status', 'Expiry', 'Notes'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 first:pl-5 last:pr-5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {allDocs.map((doc) => {
                  const isExpired = doc.expiry_date && doc.expiry_date < today
                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 pl-5 pr-4 font-medium text-slate-900">
                        {(doc.subcontractors as { company_name: string } | null)?.company_name ?? '—'}
                      </td>
                      <td className="px-4 py-3.5 text-slate-700">{doc.doc_name}</td>
                      <td className="px-4 py-3.5">
                        <DocTypeBadge type={doc.doc_type as ComplianceDocType} />
                      </td>
                      <td className="px-4 py-3.5">
                        <AuditStatusBadge status={doc.audit_status as AuditStatus} />
                      </td>
                      <td className="px-4 py-3.5">
                        {doc.expiry_date ? (
                          <span className={isExpired ? 'font-semibold text-red-600' : 'text-slate-600'}>
                            {doc.expiry_date}
                            {isExpired && <span className="ml-1 text-xs">(Expired)</span>}
                          </span>
                        ) : (
                          <span className="text-slate-400">No expiry</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 pr-5 text-slate-500 text-xs">
                        {doc.notes ?? '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default function InsuranceVaultPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Insurance Vault</h1>
        <p className="mt-1 text-sm text-slate-500">
          COIs, licenses, and Golden Thread documents — the source of truth for gate decisions.
        </p>
      </div>
      <InsuranceVaultData />
    </div>
  )
}
