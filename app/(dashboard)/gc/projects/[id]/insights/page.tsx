import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { InsightsDashboard } from './insights-client'
import type { Json } from '@/types/database.types'

export default async function ProjectInsightsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [projectResult, analyticsResult, historyResult, subsResult] = await Promise.all([
    supabase.from('projects').select('id, name, location, status').eq('id', id).single(),
    supabase.from('project_risk_analytics').select('*').eq('project_id', id).single(),
    supabase
      .from('project_risk_history')
      .select('snapshot_date, avg_risk_score')
      .eq('project_id', id)
      .order('snapshot_date', { ascending: true })
      .limit(4),
    supabase
      .from('subcontractors')
      .select('id, company_name, risk_score, compliance_status, payment_status')
      .eq('project_id', id)
      .order('risk_score', { ascending: false })
      .limit(3),
  ])

  if (!projectResult.data) notFound()

  const project   = projectResult.data
  const analytics = analyticsResult.data ?? {
    total_subs: 0,
    avg_risk_score: 0,
    site_ready_pct: 0,
    payment_blocked_pct: 0,
    critical_count: 0,
    elevated_count: 0,
  }
  const history  = historyResult.data ?? []
  const topSubs  = subsResult.data ?? []

  // Aggregate AI-identified hazards from safety_documents for this project's subs
  const subIds = topSubs.map((s) => s.id)
  let top5Hazards: Array<{ hazard: string; count: number }> = []

  if (subIds.length > 0) {
    const { data: safetyDocs } = await supabase
      .from('safety_documents')
      .select('identified_hazards')
      .in('subcontractor_id', subIds)

    const hazardCounts = new Map<string, number>()
    for (const doc of safetyDocs ?? []) {
      for (const h of (doc.identified_hazards as Json[])) {
        if (typeof h === 'string') {
          hazardCounts.set(h, (hazardCounts.get(h) ?? 0) + 1)
        }
      }
    }
    top5Hazards = [...hazardCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([hazard, count]) => ({ hazard, count }))
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href={`/gc/projects/${id}`}
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            {project.name}
          </Link>
        </div>
      </div>

      <InsightsDashboard
        projectId={id}
        projectName={project.name}
        analytics={{
          total_subs:          analytics.total_subs,
          avg_risk_score:      analytics.avg_risk_score,
          site_ready_pct:      analytics.site_ready_pct,
          payment_blocked_pct: analytics.payment_blocked_pct,
          critical_count:      analytics.critical_count,
          elevated_count:      analytics.elevated_count,
        }}
        history={history.map((h) => ({
          snapshot_date:  h.snapshot_date,
          avg_risk_score: h.avg_risk_score,
        }))}
        topSubs={topSubs.map((s) => ({
          id:               s.id,
          company_name:     s.company_name,
          risk_score:       s.risk_score,
          compliance_status: s.compliance_status,
          payment_status:   s.payment_status,
        }))}
        top5Hazards={top5Hazards}
      />
    </div>
  )
}
