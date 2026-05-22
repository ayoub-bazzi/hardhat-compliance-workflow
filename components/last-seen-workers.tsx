import Image from 'next/image'
import Link from 'next/link'
import { Users, HardHat } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { createServiceSupabaseClient } from '@/lib/supabase'
import { getOrgId } from '@/lib/org'
import type { LastSeenWorker } from '@/types/database.types'

function timeAgo(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1)  return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24)   return `${diffH}h ago`
  return `${Math.floor(diffH / 24)}d ago`
}

export async function LastSeenWorkers({ limit = 5 }: { limit?: number }) {
  const supabase = await createClient()
  const orgId = await getOrgId()

  const { data } = orgId
    ? await supabase
        .from('last_seen_workers')
        .select('log_id, subcontractor_id, last_seen_at, company_name, profile_photo_url')
        .eq('organization_id', orgId)
        .order('last_seen_at', { ascending: false })
        .limit(limit)
    : { data: null }

  const rawWorkers = (data ?? []) as LastSeenWorker[]

  // Resolve storage paths to short-lived signed URLs (profile-photos bucket is private).
  const service = createServiceSupabaseClient()
  const workers = await Promise.all(
    rawWorkers.map(async (w) => {
      if (!w.profile_photo_url || w.profile_photo_url.startsWith('http')) {
        return w
      }
      const { data: signed } = await service.storage
        .from('profile-photos')
        .createSignedUrl(w.profile_photo_url, 3600)
      return { ...w, profile_photo_url: signed?.signedUrl ?? null }
    }),
  )

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-700">Last Seen On Site</h2>
        </div>
        <Link href="/gc/attendance" className="text-xs font-semibold text-indigo-600 hover:underline">
          Attendance →
        </Link>
      </div>

      {workers.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-slate-400">
          No site entries recorded yet.
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {workers.map((w) => (
            <Link
              key={w.log_id}
              href={`/gc/risk/${w.subcontractor_id}`}
              className="flex items-center gap-3.5 px-5 py-3 transition-colors hover:bg-slate-50"
            >
              {/* Avatar */}
              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-slate-200 ring-2 ring-white">
                {w.profile_photo_url ? (
                  <Image
                    src={w.profile_photo_url}
                    alt={w.company_name}
                    fill
                    className="object-cover"
                    sizes="36px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <HardHat className="h-4 w-4 text-slate-400" />
                  </div>
                )}
              </div>

              {/* Name */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">{w.company_name}</p>
                <p className="text-xs text-slate-400">Last scan</p>
              </div>

              {/* Time */}
              <span className="shrink-0 text-xs font-medium text-slate-500">
                {timeAgo(w.last_seen_at)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
