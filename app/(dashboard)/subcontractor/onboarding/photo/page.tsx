import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, HardHat } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { EnrollmentClient } from './enrollment-client'

export default async function PhotoEnrollmentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: subs } = await supabase
    .from('subcontractors')
    .select('id, company_name, profile_photo_url')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (!subs || subs.length === 0) redirect('/subcontractor/portal')

  const primarySub = subs[0]
  const existingPhotoUrl = primarySub.profile_photo_url ?? null

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <Link
          href="/subcontractor/portal"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          My Portal
        </Link>
        <div className="mt-4 flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-900">
            <HardHat className="h-6 w-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Digital Site ID</h1>
            <p className="text-sm text-slate-500">
              {existingPhotoUrl
                ? 'Update your site pass photo.'
                : 'Position your face in the frame to activate your site pass.'}
            </p>
          </div>
        </div>
      </div>

      <EnrollmentClient
        companyName={primarySub.company_name}
        existingPhotoUrl={existingPhotoUrl}
      />

      <p className="text-center text-xs text-slate-400">
        Your photo is used only for identity verification at site gates.
        General Contractors can reset it at any time.
      </p>
    </div>
  )
}
