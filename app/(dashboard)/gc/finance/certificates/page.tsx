import { Suspense } from 'react'
import Link from 'next/link'
import {
  Landmark, ShieldCheck, Lock, Clock, CheckCircle2,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase'
import { CertificateStatusBadge, CertificateRowActions } from './certificate-row-actions'
import type { PaymentCertificate } from '@/types/database.types'

const ESCROW_THRESHOLD = 30

type CertRow = PaymentCertificate & {
  subcontractors: {
    company_name:      string
    risk_score:        number
    compliance_status: string
  } | null
  projects: { name: string } | null
}

async function CertificatesData() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('payment_certificates')
    .select(`
      *,
      subcontractors ( company_name, risk_score, compliance_status ),
      projects       ( name )
    `)
    .order('created_at', { ascending: false })

  const certs = (data ?? []) as unknown as CertRow[]

  const pending  = certs.filter((c) => c.status === 'pending').length
  const escrowed = certs.filter((c) => c.status === 'escrowed').length
  const approved = certs.filter((c) => c.status === 'approved').length
  const released = certs.filter((c) => c.status === 'released').length

  const totalEscrowedAmt = certs
    .filter((c) => c.status === 'escrowed')
    .reduce((s, c) => s + (c.amount ?? 0), 0)

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Pending',  value: pending,  icon: Clock,        bg: 'bg-slate-100',   fg: 'text-slate-600',   border: 'border-slate-200'  },
          { label: 'Escrowed', value: escrowed, icon: Lock,         bg: 'bg-amber-100',   fg: 'text-amber-600',   border: escrowed > 0 ? 'border-amber-200 ring-1 ring-amber-100' : 'border-slate-200' },
          { label: 'Approved', value: approved, icon: ShieldCheck,  bg: 'bg-emerald-100', fg: 'text-emerald-600', border: 'border-slate-200'  },
          { label: 'Released', value: released, icon: CheckCircle2, bg: 'bg-indigo-100',  fg: 'text-indigo-600',  border: 'border-slate-200'  },
        ].map(({ label, value, icon: Icon, bg, fg, border }) => (
          <div key={label} className={`flex items-center gap-4 rounded-xl border bg-white p-5 shadow-sm ${border}`}>
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${bg}`}>
              <Icon className={`h-5 w-5 ${fg}`} />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">{label}</p>
              <p className="text-3xl font-bold text-slate-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Escrow warning */}
      {escrowed > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-semibold text-amber-900">
              {escrowed} certificate{escrowed > 1 ? 's' : ''} in compliance escrow
            </p>
            <p className="mt-0.5 text-xs text-amber-800">
              Total held: {totalEscrowedAmt.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}.
              Payment is approved but held until subcontractors clear their compliance issues.
              Risk score must drop to ≤{ESCROW_THRESHOLD} before automatic release is permitted.
            </p>
          </div>
        </div>
      )}

      {/* Certificates table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-700">Payment Certificates</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Risk score &gt;{ESCROW_THRESHOLD} triggers compliance escrow. Finance override requires a written reason logged to the Golden Thread.
          </p>
        </div>

        {certs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Landmark className="h-10 w-10 text-slate-300" />
            <p className="text-sm text-slate-500">No payment certificates yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  {['Certificate', 'Subcontractor', 'Period', 'Amount', 'Risk', 'Status', 'Action'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 first:pl-5 last:pr-5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {certs.map((cert) => {
                  const sub        = cert.subcontractors
                  const riskScore  = sub?.risk_score ?? 0
                  const isHighRisk = riskScore > ESCROW_THRESHOLD

                  return (
                    <tr
                      key={cert.id}
                      className={`transition-colors hover:bg-slate-50/80 ${
                        cert.status === 'escrowed' ? 'bg-amber-50/30' :
                        cert.status === 'released' ? 'bg-emerald-50/20' : ''
                      }`}
                    >
                      {/* Certificate */}
                      <td className="py-3.5 pl-5 pr-4">
                        <p className="font-mono text-xs font-semibold text-slate-700">CERT-{cert.id.slice(0, 8).toUpperCase()}</p>
                        <p className="text-[10px] text-slate-400">
                          {cert.created_at ? new Date(cert.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                        </p>
                      </td>

                      {/* Sub */}
                      <td className="px-4 py-3.5">
                        {sub ? (
                          <Link href={`/gc/risk/${cert.subcontractor_id}`} className="group">
                            <p className="text-sm font-medium text-slate-900 group-hover:text-indigo-600 transition-colors">
                              {sub.company_name}
                            </p>
                            <p className="text-xs text-slate-400">{cert.projects?.name ?? '—'}</p>
                          </Link>
                        ) : <span className="text-slate-400">—</span>}
                      </td>

                      {/* Period */}
                      <td className="px-4 py-3.5 text-xs text-slate-500">
                        <span className="font-mono">{cert.period_start}</span>
                        <span className="mx-1 text-slate-300">→</span>
                        <span className="font-mono">{cert.period_end}</span>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-800 tabular-nums">
                          {(cert.amount ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
                        </p>
                      </td>

                      {/* Risk score */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-sm font-bold tabular-nums ${
                            riskScore >= 71 ? 'text-red-600' :
                            riskScore >= 31 ? 'text-amber-600' : 'text-emerald-600'
                          }`}>
                            {riskScore}
                          </span>
                          {isHighRisk && <Lock className="h-3 w-3 text-amber-500" />}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <CertificateStatusBadge status={cert.status} />
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 pr-5">
                        <CertificateRowActions
                          certId={cert.id}
                          status={cert.status}
                          riskScore={riskScore}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-slate-400">
        All escrow decisions and releases are permanently recorded in the{' '}
        <Link href="/gc/audit" className="text-indigo-600 hover:underline">Golden Thread</Link>.
        Funds approved-but-held preserve contractual payment obligations while enforcing compliance.
      </p>
    </div>
  )
}

export default function CertificatesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Payment Certificates</h1>
          <p className="mt-1 text-sm text-slate-500">
            Compliance-gated payment pipeline. High-risk subcontractors enter escrow — payment approved but held.
          </p>
        </div>
        <Link href="/gc/finance" className="text-sm font-semibold text-indigo-600 hover:underline">
          ← Finance Hub
        </Link>
      </div>

      <Suspense fallback={<div className="space-y-4"><Skeleton className="h-24 w-full rounded-xl" /><Skeleton className="h-96 w-full rounded-xl" /></div>}>
        <CertificatesData />
      </Suspense>
    </div>
  )
}
