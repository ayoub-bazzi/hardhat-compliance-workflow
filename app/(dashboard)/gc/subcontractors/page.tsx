import { createClient } from '@/lib/supabase'
import { SubcontractorDirectory } from './subcontractor-directory'
import type { ComplianceStatus } from '@/types/database.types'

export type SubcontractorProfile = {
  company_name: string
  contact_email: string
  globalCompliance: ComplianceStatus
  activeProjectCount: number
  assignments: {
    subcontractorId: string
    projectId: string
    projectName: string
    projectStatus: 'active' | 'archived'
    complianceStatus: ComplianceStatus
  }[]
}

export default async function SubcontractorsPage() {
  const supabase = await createClient()

  const { data: rows } = await supabase
    .from('subcontractors')
    .select('id, company_name, contact_email, compliance_status, project_id, projects(id, name, status)')
    .order('company_name')

  // Group by company_name + contact_email
  const map = new Map<string, SubcontractorProfile>()

  for (const row of rows ?? []) {
    const key = `${row.company_name}||${row.contact_email}`

    if (!map.has(key)) {
      map.set(key, {
        company_name: row.company_name,
        contact_email: row.contact_email,
        globalCompliance: 'compliant',
        activeProjectCount: 0,
        assignments: [],
      })
    }

    const profile = map.get(key)!
    const project = row.projects as { id: string; name: string; status: string } | null

    profile.assignments.push({
      subcontractorId: row.id,
      projectId: row.project_id,
      projectName: project?.name ?? 'Unknown Project',
      projectStatus: (project?.status ?? 'archived') as 'active' | 'archived',
      complianceStatus: row.compliance_status,
    })

    if (project?.status === 'active') {
      profile.activeProjectCount += 1
    }

    // Escalate global compliance: non_compliant > warning > compliant
    const current = profile.globalCompliance
    const incoming = row.compliance_status
    if (incoming === 'non_compliant') {
      profile.globalCompliance = 'non_compliant'
    } else if (incoming === 'warning' && current !== 'non_compliant') {
      profile.globalCompliance = 'warning'
    }
  }

  const profiles = Array.from(map.values())

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Subcontractor Directory</h1>
        <p className="mt-1 text-sm text-slate-500">
          All subcontractors across every project — {profiles.length} compan{profiles.length === 1 ? 'y' : 'ies'}
        </p>
      </div>
      <SubcontractorDirectory profiles={profiles} />
    </div>
  )
}
