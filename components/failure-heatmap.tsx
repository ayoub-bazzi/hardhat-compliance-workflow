import { createClient } from '@/lib/supabase'
import { getOrgId } from '@/lib/org'

type HeatmapCell = {
  label: string
  source: string
  total: number
  rejected: number
  rate: number
}

function rateColor(rate: number): string {
  if (rate === 0)    return 'bg-emerald-100 text-emerald-700 ring-emerald-200'
  if (rate < 0.15)   return 'bg-yellow-100  text-yellow-700  ring-yellow-200'
  if (rate < 0.35)   return 'bg-orange-100  text-orange-700  ring-orange-200'
  if (rate < 0.6)    return 'bg-red-200     text-red-800     ring-red-300'
  return                    'bg-red-950     text-red-300     ring-red-800'
}

function rateLabel(rate: number): string {
  if (rate === 0)  return 'Clean'
  if (rate < 0.15) return 'Low'
  if (rate < 0.35) return 'Med'
  if (rate < 0.6)  return 'High'
  return                  'Critical'
}

export async function FailureHeatmap() {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return null

  // compliance_docs — flagged counts per doc_type
  const { data: complianceDocs } = await supabase
    .from('compliance_docs')
    .select('doc_type, audit_status')
    .eq('organization_id', orgId)

  // legacy documents — rejected counts per type
  const { data: legacyDocs } = await supabase
    .from('documents')
    .select('type, status')
    .eq('organization_id', orgId)

  // safety_documents — rejected counts per doc_type
  const { data: safetyDocs } = await supabase
    .from('safety_documents')
    .select('doc_type, approval_status')
    .eq('organization_id', orgId)

  // Aggregate compliance_docs
  const compMap: Record<string, { total: number; rejected: number }> = {}
  for (const d of complianceDocs ?? []) {
    if (!compMap[d.doc_type]) compMap[d.doc_type] = { total: 0, rejected: 0 }
    compMap[d.doc_type].total++
    if (d.audit_status === 'Flagged') compMap[d.doc_type].rejected++
  }

  // Aggregate legacy documents
  const legacyMap: Record<string, { total: number; rejected: number }> = {}
  for (const d of legacyDocs ?? []) {
    if (!legacyMap[d.type]) legacyMap[d.type] = { total: 0, rejected: 0 }
    legacyMap[d.type].total++
    if (d.status === 'rejected') legacyMap[d.type].rejected++
  }

  // Aggregate safety_documents
  const safetyMap: Record<string, { total: number; rejected: number }> = {}
  for (const d of safetyDocs ?? []) {
    if (!safetyMap[d.doc_type]) safetyMap[d.doc_type] = { total: 0, rejected: 0 }
    safetyMap[d.doc_type].total++
    if (d.approval_status === 'Rejected') safetyMap[d.doc_type].rejected++
  }

  const cells: HeatmapCell[] = [
    ...Object.entries(compMap).map(([k, v]) => ({
      label: k, source: 'Compliance', total: v.total, rejected: v.rejected,
      rate: v.total > 0 ? v.rejected / v.total : 0,
    })),
    ...Object.entries(legacyMap).map(([k, v]) => ({
      label: k, source: 'Document', total: v.total, rejected: v.rejected,
      rate: v.total > 0 ? v.rejected / v.total : 0,
    })),
    ...Object.entries(safetyMap).map(([k, v]) => ({
      label: k, source: 'Safety', total: v.total, rejected: v.rejected,
      rate: v.total > 0 ? v.rejected / v.total : 0,
    })),
  ].sort((a, b) => b.rate - a.rate)

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-100 bg-slate-50 px-5 py-3.5">
        <h2 className="text-sm font-semibold text-slate-700">AI Rejection Heatmap</h2>
        <p className="mt-0.5 text-xs text-slate-400">Failure rates by document type — updated live</p>
      </div>

      {cells.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-slate-400">No document data yet.</div>
      ) : (
        <div className="p-5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
            {cells.map((cell) => {
              const colorClass = rateColor(cell.rate)
              return (
                <div
                  key={`${cell.source}-${cell.label}`}
                  className={`flex flex-col rounded-lg p-3 ring-1 ${colorClass}`}
                >
                  <p className="text-xs font-bold leading-tight">{cell.label}</p>
                  <p className="mt-0.5 text-[10px] opacity-70">{cell.source}</p>
                  <div className="mt-2 flex items-end justify-between">
                    <span className="text-lg font-black tabular-nums leading-none">
                      {cell.total > 0 ? Math.round(cell.rate * 100) : '—'}
                      {cell.total > 0 && '%'}
                    </span>
                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${colorClass}`}>
                      {rateLabel(cell.rate)}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] opacity-60">
                    {cell.rejected}/{cell.total} rejected
                  </p>
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-3">
            {[
              { label: 'Clean (0%)',    bg: 'bg-emerald-200' },
              { label: 'Low (<15%)',   bg: 'bg-yellow-300' },
              { label: 'Med (<35%)',   bg: 'bg-orange-300' },
              { label: 'High (<60%)',  bg: 'bg-red-400' },
              { label: 'Critical',     bg: 'bg-red-900' },
            ].map(({ label, bg }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-sm ${bg}`} />
                <span className="text-[10px] text-slate-500">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
