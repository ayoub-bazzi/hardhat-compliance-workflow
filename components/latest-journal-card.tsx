import Image from 'next/image'
import Link from 'next/link'
import { BookOpen, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { getOrgId } from '@/lib/org'
import type { SiteJournal } from '@/types/database.types'

const QUALITY_DOT: Record<string, string> = {
  high:   'bg-emerald-500',
  medium: 'bg-amber-400',
  low:    'bg-red-500',
}

export async function LatestJournalCard() {
  const supabase = await createClient()
  const orgId = await getOrgId()

  const { data } = orgId
    ? await supabase
        .from('site_journals')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null }

  const journal = data as SiteJournal | null

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-amber-500" />
          <h2 className="text-sm font-semibold text-slate-700">Latest Site Update</h2>
        </div>
        <Link href="/gc/journal" className="text-xs font-semibold text-indigo-600 hover:underline">
          Full Journal →
        </Link>
      </div>

      {!journal ? (
        <div className="px-5 py-8 text-center text-sm text-slate-400">
          No site journal entries yet.
          <Link href="/gc/journal" className="mt-2 block text-xs font-semibold text-indigo-600 hover:underline">
            Create first entry →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3">
          {/* Thumbnail */}
          {journal.photo_url ? (
            <div className="relative aspect-video sm:aspect-auto min-h-[120px] bg-slate-100 sm:col-span-1">
              <Image
                src={journal.photo_url}
                alt="Latest site photo"
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 25vw"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center bg-slate-100 min-h-[120px] sm:col-span-1">
              <BookOpen className="h-7 w-7 text-slate-300" />
            </div>
          )}

          {/* Content */}
          <div className="sm:col-span-2 p-4 space-y-2.5">
            {/* Phase + quality */}
            <div className="flex items-center gap-2 flex-wrap">
              {journal.work_phase && (
                <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-700 ring-1 ring-indigo-200">
                  {journal.work_phase}
                </span>
              )}
              <span className="flex items-center gap-1 text-[10px] text-slate-400">
                <span className={`h-1.5 w-1.5 rounded-full ${QUALITY_DOT[journal.photo_quality] ?? 'bg-slate-400'}`} />
                {journal.photo_quality.charAt(0).toUpperCase() + journal.photo_quality.slice(1)} quality
              </span>
              <span className="ml-auto text-[10px] text-slate-400">
                {new Date(journal.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>

            {/* First paragraph of summary */}
            <p className="text-xs text-slate-600 leading-relaxed line-clamp-4">
              {journal.ai_summary.split('\n\n')[0] ?? journal.ai_summary}
            </p>

            {/* Caveats */}
            {journal.caveats && journal.caveats.length > 0 && (
              <div className="flex items-center gap-1.5 text-[10px] text-amber-700">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                {journal.caveats.length} AI uncertainty {journal.caveats.length === 1 ? 'flag' : 'flags'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
