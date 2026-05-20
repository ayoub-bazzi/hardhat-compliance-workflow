import { redirect } from 'next/navigation'
import { createClient, createServiceSupabaseClient } from '@/lib/supabase'
import { TeamClient } from './team-client'

export default async function TeamManagementPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('app_role, organization_id')
    .eq('id', user.id)
    .single()

  // Middleware already guards this route; this is defense-in-depth.
  if (callerProfile?.app_role !== 'admin') redirect('/unauthorized')

  const orgId = callerProfile.organization_id
  if (!orgId) redirect('/onboarding')

  // Fetch all GC profiles in this org.
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, company_name, app_role, created_at')
    .eq('organization_id', orgId)
    .eq('role', 'gc')
    .order('created_at', { ascending: true })

  // Retrieve emails via the service-role admin API.
  const service = createServiceSupabaseClient()
  const { data: { users: authUsers } } = await service.auth.admin.listUsers({ perPage: 200 })
  const emailMap = new Map(authUsers.map((u) => [u.id, u.email ?? '']))

  const members = (profiles ?? []).map((p) => ({
    id:          p.id,
    fullName:    p.full_name ?? '',
    companyName: p.company_name ?? '',
    email:       emailMap.get(p.id) ?? '',
    appRole:     p.app_role,
    joinedAt:    p.created_at,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Team Management</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage roles for your organization&apos;s GC team members and invite new colleagues.
        </p>
      </div>
      <TeamClient members={members} currentUserId={user.id} />
    </div>
  )
}
