'use server'

import { createClient } from '@/lib/supabase'

const REQUIRED_TYPES = ['COI', 'W9', 'Certified Payroll'] as const

export type SubIssue = {
  type: string
  issue: 'Rejected' | 'Not Uploaded'
  reason: string | null
  last_notified_at: string | null
}

export type AtRiskSub = {
  id: string
  company_name: string
  contact_email: string
  issues: SubIssue[]
}

export type AtRiskDetailsResult = {
  error: string | null
  subs: AtRiskSub[]
}

export async function getAtRiskDetails(projectId: string): Promise<AtRiskDetailsResult> {
  const supabase = await createClient()

  const { data: subs, error: subsError } = await supabase
    .from('subcontractors')
    .select('id, company_name, contact_email')
    .eq('project_id', projectId)
    .eq('compliance_status', 'non_compliant')
    .order('company_name')

  if (subsError) return { error: subsError.message, subs: [] }
  if (!subs || subs.length === 0) return { error: null, subs: [] }

  const subIds = subs.map((s) => s.id)

  const { data: docs, error: docsError } = await supabase
    .from('documents')
    .select('type, status, rejection_reason, last_notified_at, subcontractor_id, created_at')
    .in('subcontractor_id', subIds)
    .order('created_at', { ascending: false })

  if (docsError) return { error: docsError.message, subs: [] }

  const allDocs = docs ?? []

  const result: AtRiskSub[] = subs.map((sub) => {
    const subDocs = allDocs.filter((d) => d.subcontractor_id === sub.id)
    const issues: SubIssue[] = []

    for (const type of REQUIRED_TYPES) {
      // docs already ordered desc — first match is the latest
      const latest = subDocs.find((d) => d.type === type)
      if (!latest) {
        issues.push({ type, issue: 'Not Uploaded', reason: null, last_notified_at: null })
      } else if (latest.status === 'rejected') {
        issues.push({ type, issue: 'Rejected', reason: latest.rejection_reason, last_notified_at: latest.last_notified_at ?? null })
      }
    }

    return { ...sub, issues }
  })

  return { error: null, subs: result.filter((s) => s.issues.length > 0) }
}

export type BulkReminderResult = { error: string | null; count: number }

export async function sendBulkReminder(projectId: string): Promise<BulkReminderResult> {
  await new Promise<void>((r) => setTimeout(r, 1500))

  const supabase = await createClient()
  const { data } = await supabase
    .from('subcontractors')
    .select('id')
    .eq('project_id', projectId)
    .eq('compliance_status', 'non_compliant')

  return { error: null, count: (data ?? []).length }
}
