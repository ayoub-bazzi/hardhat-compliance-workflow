import Link from 'next/link'
import { ShieldCheck, ShieldX, HardHat, RefreshCw, AlertCircle } from 'lucide-react'
import { verifySitePassToken } from '@/lib/site-pass-token'
import { checkGateReadiness } from '@/lib/gate-readiness'
import { CameraCapture } from './camera-capture'

export const dynamic = 'force-dynamic'

// ── Bilingual label component ─────────────────────────────────────
// Renders a large English word above a smaller Arabic translation,
// both visible at a glance for bilingual gate staff.

function BilingualLabel({
  en,
  ar,
  enClass,
  arClass,
}: {
  en: string
  ar: string
  enClass: string
  arClass: string
}) {
  return (
    <div>
      <p className={enClass}>{en}</p>
      <p className={`font-arabic leading-snug ${arClass}`} dir="rtl" lang="ar">
        {ar}
      </p>
    </div>
  )
}

// ── Granted screen ────────────────────────────────────────────────
// Touch-target design: all interactive elements ≥ 64px height.
// select-none prevents accidental text selection by gloved hands.

function GrantedScreen({
  companyName,
  checkedAt,
  token,
}: {
  companyName: string
  checkedAt: string
  token: string
}) {
  const time = new Date(checkedAt).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-emerald-600 px-6 select-none">
      <div className="flex w-full max-w-sm flex-col items-center gap-7 text-center">

        {/* Shield icon with pulse ring — larger for outdoor visibility */}
        <div className="relative flex h-32 w-32 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-emerald-400/30 animate-ping" />
          <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-emerald-500 ring-4 ring-emerald-400/50">
            <ShieldCheck className="h-16 w-16 text-white" strokeWidth={1.5} />
          </div>
        </div>

        {/* Primary status — bilingual, stacked */}
        <div className="space-y-1">
          <p className="text-[5.5rem] font-black uppercase tracking-tighter leading-none text-white drop-shadow-lg">
            GRANTED
          </p>
          <p
            className="font-arabic text-4xl font-black leading-snug text-emerald-100 tracking-normal"
            dir="rtl"
            lang="ar"
          >
            تم السماح بالدخول
          </p>
        </div>

        {/* Divider */}
        <div className="h-px w-20 bg-emerald-400/40" />

        {/* Company name */}
        <div className="space-y-1">
          <p className="text-xl font-bold text-white">{companyName}</p>
          <div className="flex flex-col items-center gap-0.5">
            <p className="text-sm text-emerald-200">Cleared for site access</p>
            <p
              className="font-arabic text-sm text-emerald-300"
              dir="rtl"
              lang="ar"
            >
              مسموح بالدخول إلى الموقع
            </p>
          </div>
        </div>

        {/* Timestamp */}
        <p className="text-xs text-emerald-300/80 tabular-nums">
          Checked {time}
        </p>

        {/* Recheck — min 64px height, full width, no JS required */}
        <div className="flex w-full flex-col gap-2">
          <Link
            href={`/gate/verify/${token}`}
            className="flex min-h-[64px] items-center justify-center gap-2.5 rounded-xl bg-white/20 py-5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/30 ring-1 ring-white/20 touch-manipulation"
          >
            <RefreshCw className="h-5 w-5" />
            <span>Recheck Live Status</span>
            <span className="font-arabic text-emerald-200" dir="rtl" lang="ar">
              · إعادة الفحص
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2 opacity-40">
          <HardHat className="h-4 w-4 text-white" />
          <span className="text-xs text-white">HardHat Compliance</span>
        </div>
      </div>
    </div>
  )
}

// ── Denied screen ─────────────────────────────────────────────────

function DeniedScreen({
  companyName,
  reasons,
  checkedAt,
  token,
}: {
  companyName: string
  reasons: string[]
  checkedAt: string
  token: string
}) {
  const time = new Date(checkedAt).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-red-600 px-6 select-none">
      <div className="flex w-full max-w-sm flex-col items-center gap-7 text-center">

        {/* Shield icon — 32×32 base to match granted screen */}
        <div className="flex h-32 w-32 items-center justify-center rounded-full bg-red-500 ring-4 ring-red-400/50">
          <ShieldX className="h-16 w-16 text-white" strokeWidth={1.5} />
        </div>

        {/* Primary status — bilingual */}
        <div className="space-y-1">
          <p className="text-[5.5rem] font-black uppercase tracking-tighter leading-none text-white drop-shadow-lg">
            DENIED
          </p>
          <p
            className="font-arabic text-4xl font-black leading-snug text-red-100 tracking-normal"
            dir="rtl"
            lang="ar"
          >
            تم رفض الدخول
          </p>
        </div>

        {/* Divider */}
        <div className="h-px w-20 bg-red-400/40" />

        {/* Company name */}
        <div className="space-y-1">
          <p className="text-xl font-bold text-white">{companyName}</p>
          <div className="flex flex-col items-center gap-0.5">
            <p className="text-sm text-red-200">Access blocked — do not permit entry</p>
            <p
              className="font-arabic text-sm text-red-300"
              dir="rtl"
              lang="ar"
            >
              الدخول محظور — لا تسمح بالمرور
            </p>
          </div>
        </div>

        {/* Reasons */}
        {reasons.length > 0 && (
          <div className="w-full rounded-xl bg-red-700/50 p-4 backdrop-blur-sm ring-1 ring-red-500/40">
            {/* English heading */}
            <div className="mb-2 flex items-center gap-1.5 justify-center">
              <AlertCircle className="h-3.5 w-3.5 text-red-300 shrink-0" />
              <p className="text-xs font-bold uppercase tracking-wider text-red-300">
                Denial Reasons
              </p>
            </div>
            {/* Arabic heading */}
            <p
              className="font-arabic mb-3 text-xs font-semibold text-red-400"
              dir="rtl"
              lang="ar"
            >
              أسباب الرفض
            </p>
            <ul className="space-y-2">
              {reasons.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-red-100 text-left">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-300" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Timestamp */}
        <p className="text-xs text-red-300/80 tabular-nums">
          Checked {time}
        </p>

        {/* Recheck — 64px touch target */}
        <div className="flex w-full flex-col gap-2">
          <Link
            href={`/gate/verify/${token}`}
            className="flex min-h-[64px] items-center justify-center gap-2.5 rounded-xl bg-white/20 py-5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/30 ring-1 ring-white/20 touch-manipulation"
          >
            <RefreshCw className="h-5 w-5" />
            <span>Recheck Live Status</span>
            <span className="font-arabic text-red-200" dir="rtl" lang="ar">
              · إعادة الفحص
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2 opacity-40">
          <HardHat className="h-4 w-4 text-white" />
          <span className="text-xs text-white">HardHat Compliance</span>
        </div>
      </div>
    </div>
  )
}

// ── Invalid token screen ──────────────────────────────────────────

function InvalidTokenScreen() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-900 px-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-800 ring-2 ring-slate-700">
          <ShieldX className="h-10 w-10 text-slate-500" strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-2xl font-bold text-white">Invalid Pass</p>
          <p
            className="font-arabic mt-0.5 text-xl font-bold text-slate-400"
            dir="rtl"
            lang="ar"
          >
            تصريح غير صالح
          </p>
          <p className="mt-3 text-sm text-slate-400">
            This QR code is invalid or has expired. Ask the subcontractor to
            generate a fresh pass from the HardHat dashboard.
          </p>
          <p
            className="font-arabic mt-2 text-sm text-slate-500"
            dir="rtl"
            lang="ar"
          >
            رمز QR هذا غير صالح أو منتهي الصلاحية.
          </p>
        </div>
        <div className="flex items-center gap-2 mt-2 opacity-30">
          <HardHat className="h-4 w-4 text-white" />
          <span className="text-xs text-white">HardHat Compliance</span>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────

export default async function GateVerifyPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const payload = verifySitePassToken(token)
  if (!payload) return <InvalidTokenScreen />

  const result = await checkGateReadiness(payload.sub, payload.org)

  if (result.status === 'GRANTED') {
    return (
      <>
        <GrantedScreen companyName={result.companyName} checkedAt={result.checkedAt} token={token} />
        <CameraCapture logId={result.logId} subcontractorId={result.subcontractorId} />
      </>
    )
  }

  return (
    <>
      <DeniedScreen
        companyName={result.companyName}
        reasons={result.reasons}
        checkedAt={result.checkedAt}
        token={token}
      />
      <CameraCapture logId={result.logId} subcontractorId={result.subcontractorId} />
    </>
  )
}
