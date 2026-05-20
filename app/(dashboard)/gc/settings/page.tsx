import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { SettingsTabs } from './settings-tabs'

export default async function GcSettingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, company_name, role')
    .eq('id', user.id)
    .single()

  const resendConfigured = Boolean(process.env.RESEND_API_KEY)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your profile, compliance rules, and account security.
        </p>
      </div>

      <SettingsTabs
        fullName={profile?.full_name ?? ''}
        companyName={profile?.company_name ?? ''}
        email={user.email ?? ''}
        resendConfigured={resendConfigured}
      />
    </div>
  )
}
