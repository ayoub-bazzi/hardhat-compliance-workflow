import { redirect } from 'next/navigation'
import { createClient, createServiceSupabaseClient } from '@/lib/supabase'
import { SiteMonitorClient } from './monitor-client'

export default async function SiteMonitorPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  const orgId = profile?.organization_id
  if (!orgId) redirect('/onboarding')

  // Fetch the last 100 gate scans for this org, newest first.
  const { data: recentScans } = await supabase
    .from('site_access_logs')
    .select('id, subcontractor_id, result, denial_reasons, gate_location, created_at, photo_url, face_match_score, face_match_result')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(100)

  // Fetch all subs in the org to resolve company names for the realtime feed.
  const { data: subRows } = await supabase
    .from('subcontractors')
    .select('id, company_name, risk_score')
    .eq('organization_id', orgId)

  // Build a name map for the client to use when realtime events arrive.
  const subMap: Record<string, { name: string; riskScore: number }> = {}
  for (const s of subRows ?? []) {
    subMap[s.id] = { name: s.company_name, riskScore: s.risk_score ?? 0 }
  }

  // Resolve storage paths to signed URLs (site-entry-photos bucket is private).
  const service = createServiceSupabaseClient()
  const scans = await Promise.all(
    (recentScans ?? []).map(async (s) => {
      let photoUrl: string | null = s.photo_url ?? null
      if (photoUrl && !photoUrl.startsWith('http')) {
        const { data: signed } = await service.storage
          .from('site-entry-photos')
          .createSignedUrl(photoUrl, 3600)
        photoUrl = signed?.signedUrl ?? null
      }
      return {
        id:              s.id,
        subId:           s.subcontractor_id,
        companyName:     subMap[s.subcontractor_id]?.name ?? 'Unknown Sub',
        riskScore:       subMap[s.subcontractor_id]?.riskScore ?? 0,
        result:          s.result as 'GRANTED' | 'DENIED',
        reasons:         (s.denial_reasons as string[] | null) ?? [],
        gateLocation:    s.gate_location ?? 'QR Gate',
        scannedAt:       s.created_at,
        photoUrl,
        faceMatchScore:  s.face_match_score ?? null,
        faceMatchResult: s.face_match_result ?? null,
      }
    }),
  )

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Site Monitor</h1>
          <p className="mt-1 text-sm text-slate-500">
            Real-time gate scan feed — updates live as guards scan QR passes.
          </p>
        </div>
        {/* Live indicator */}
        <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-emerald-700">LIVE</span>
        </div>
      </div>

      <SiteMonitorClient
        initialScans={scans}
        orgId={orgId}
        subMap={subMap}
        vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''}
      />
    </div>
  )
}
