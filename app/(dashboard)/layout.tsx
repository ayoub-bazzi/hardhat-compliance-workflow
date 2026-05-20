import { Suspense } from 'react'
import { createClient } from '@/lib/supabase'
import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { GlobalComplianceStatus } from '@/components/global-compliance-status'
import { LanguageProvider } from '@/components/language-provider'
import { SidebarProvider } from '@/components/sidebar-context'
import { SidebarContentOffset } from '@/components/sidebar-content-offset'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = user
    ? await supabase
        .from('profiles')
        .select('full_name, role, app_role')
        .eq('id', user.id)
        .single()
    : { data: null }

  const isGC = profile?.role === 'gc'

  let initialUnreadCount = 0
  if (isGC && user) {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 7)
    const { count } = await supabase
      .from('gc_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('is_read', false)
      .gte('created_at', cutoff.toISOString())
    initialUnreadCount = count ?? 0
  }

  return (
    <LanguageProvider>
      <SidebarProvider>
        <div className="min-h-screen bg-slate-50">
          <DashboardSidebar
            fullName={profile?.full_name ?? null}
            role={profile?.role ?? null}
            appRole={profile?.app_role ?? null}
            initialUnreadCount={initialUnreadCount}
          />
          <SidebarContentOffset>
            {isGC && (
              <Suspense fallback={null}>
                <GlobalComplianceStatus />
              </Suspense>
            )}
            <main className="min-h-screen p-6 lg:p-8">{children}</main>
          </SidebarContentOffset>
        </div>
      </SidebarProvider>
    </LanguageProvider>
  )
}
