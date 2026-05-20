import { Suspense } from 'react'
import Image from 'next/image'
import { BookOpen, AlertTriangle } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase'
import { JournalUpload } from './journal-upload'
import type { SiteJournal } from '@/types/database.types'

const QUALITY_BADGE: Record<string, string> = {
  high:   'bg-emerald-100 text-emerald-700 ring-emerald-200',
  medium: 'bg-amber-100   text-amber-700   ring-amber-200',
  low:    'bg-red-100     text-red-700     ring-red-200',
}

async function JournalFeed() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('site_journals')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)

  const journals = (data ?? []) as SiteJournal[]

  if (journals.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center">
        <BookOpen className="mx-auto h-10 w-10 text-slate-200" />
        <p className="mt-4 text-sm font-medium text-slate-500">No journal entries yet.</p>
        <p className="mt-1 text-xs text-slate-400">Capture your first site photo above to begin.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {journals.map((j) => {
        const paragraphs   = j.ai_summary.split('\n\n').filter(Boolean)
        const badgeCls     = QUALITY_BADGE[j.photo_quality] ?? QUALITY_BADGE.medium
        const ctx          = j.attendance_context as Record<string, unknown>

        return (
          <div key={j.id} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="grid grid-cols-1 sm:grid-cols-4">
              {/* Photo */}
              {j.photo_url ? (
                <div className="relative sm:col-span-1 aspect-video sm:aspect-auto min-h-[140px] bg-slate-100">
                  <Image
                    src={j.photo_url}
                    alt={`Site journal ${j.created_at}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 25vw"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center sm:col-span-1 min-h-[140px] bg-slate-100">
                  <BookOpen className="h-8 w-8 text-slate-300" />
                </div>
              )}

              {/* Content */}
              <div className="sm:col-span-3 p-5 space-y-3">
                {/* Meta row */}
                <div className="flex flex-wrap items-center gap-2">
                  {j.work_phase && (
                    <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200">
                      {j.work_phase}
                    </span>
                  )}
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${badgeCls}`}>
                    {j.photo_quality.charAt(0).toUpperCase() + j.photo_quality.slice(1)} Quality
                  </span>
                  <span className="ml-auto text-xs text-slate-400">
                    {new Date(j.created_at).toLocaleDateString('en-US', {
                      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                    })}
                    {' '}
                    {new Date(j.created_at).toLocaleTimeString('en-US', {
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>

                {/* Attendance context */}
                {ctx && (
                  <p className="text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">{String(ctx.grantedToday ?? 0)}</span> worker entries ·{' '}
                    <span className="font-semibold text-slate-700">{String(ctx.uniqueCompanies ?? 0)}</span> compan{Number(ctx.uniqueCompanies) === 1 ? 'y' : 'ies'} on site
                  </p>
                )}

                {/* Summary (first paragraph only in feed) */}
                <p className="text-sm text-slate-700 leading-relaxed">
                  {paragraphs[0] ?? j.ai_summary}
                </p>

                {/* Caveats */}
                {j.caveats && j.caveats.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {j.caveats.map((c, i) => (
                      <span
                        key={i}
                        className="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-medium text-amber-800"
                      >
                        <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function FeedSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <Skeleton className="h-40 w-40 shrink-0 rounded-none" />
          <div className="flex-1 space-y-3 p-5">
            <div className="flex gap-2">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function JournalPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
          <BookOpen className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Daily Site Journal</h1>
          <p className="text-sm text-slate-500">
            AI-authored progress logs from site photos — permanent legal daily record.
          </p>
        </div>
      </div>

      {/* Upload / camera component */}
      <JournalUpload />

      {/* Historical feed */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Journal History</h2>
        <Suspense fallback={<FeedSkeleton />}>
          <JournalFeed />
        </Suspense>
      </div>
    </div>
  )
}
