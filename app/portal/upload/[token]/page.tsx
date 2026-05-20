import { HardHat, ShieldAlert } from 'lucide-react'
import { getPortalDashboardData } from './portal-actions'
import { PortalClient } from './portal-client'

export const dynamic = 'force-dynamic'

function InvalidPortal({ reason }: { reason: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-950 px-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-5 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-800 ring-1 ring-slate-700">
          <ShieldAlert className="h-8 w-8 text-slate-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Link Unavailable</h1>
          <p
            className="mt-0.5 font-arabic text-base font-semibold text-slate-500"
            dir="rtl"
            lang="ar"
          >
            الرابط غير متاح
          </p>
          <p className="mt-3 text-sm text-slate-400">{reason}</p>
        </div>
        <p className="text-xs text-slate-600">
          Contact your General Contractor to request a new invitation link.
        </p>
        <div className="flex items-center gap-2 opacity-30">
          <HardHat className="h-4 w-4 text-white" />
          <span className="text-xs text-white">HardHat Compliance</span>
        </div>
      </div>
    </div>
  )
}

export default async function PortalPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const data = await getPortalDashboardData(token)

  if (!data) {
    return (
      <InvalidPortal reason="This invitation link is invalid or has expired. Links are valid for 7 days from when they were sent." />
    )
  }

  return (
    <div className="min-h-dvh bg-slate-950">
      {/* Sticky header — the lang switcher lives inside PortalClient */}
      <div
        id="portal-topbar"
        className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md px-6 py-4"
      >
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 ring-1 ring-amber-500/30">
              <HardHat className="h-5 w-5 text-amber-400" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold text-white">HardHat Compliance</p>
            </div>
          </div>
          {/* PortalClient renders its own lang switcher + portal subtitle here via a portal,
              so the topbar subtitle and switcher are managed client-side */}
        </div>
      </div>

      <PortalClient inviteToken={token} data={data} />
    </div>
  )
}
