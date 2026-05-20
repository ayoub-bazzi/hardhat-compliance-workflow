'use server'

import { createClient } from '@/lib/supabase'

export type ProjectStatus = {
  name: string
  compliance_status: 'compliant' | 'warning' | 'non_compliant'
}

export type VerificationResult =
  | { found: false }
  | {
      found: true
      company_name: string
      email: string
      isCleared: boolean
      projects: ProjectStatus[]
    }

export async function verifySubcontractor(email: string): Promise<VerificationResult> {
  const supabase = await createClient()

  const { data: subs } = await supabase
    .from('subcontractors')
    .select('company_name, compliance_status, projects(name)')
    .eq('contact_email', email.trim())

  if (!subs || subs.length === 0) return { found: false }

  type SubRow = {
    company_name: string
    compliance_status: 'compliant' | 'warning' | 'non_compliant'
    projects: { name: string } | null
  }

  const rows = subs as SubRow[]
  const isCleared = rows.every((s) => s.compliance_status === 'compliant')

  return {
    found: true,
    company_name: rows[0].company_name,
    email: email.trim(),
    isCleared,
    projects: rows.map((s) => ({
      name: s.projects?.name ?? 'Unknown Project',
      compliance_status: s.compliance_status,
    })),
  }
}
