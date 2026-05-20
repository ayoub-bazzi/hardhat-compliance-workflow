import QRCode from 'qrcode'
import { createSitePassToken } from '@/lib/site-pass-token'
import { HardHat, ShieldCheck, Clock } from 'lucide-react'

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

export async function QRPass({
  subcontractorId,
  orgId,
  companyName,
}: {
  subcontractorId: string
  orgId: string
  companyName: string
}) {
  const token = createSitePassToken(subcontractorId, orgId)
  const gateUrl = `${appUrl}/gate/verify/${token}`

  const qrDataUrl = await QRCode.toDataURL(gateUrl, {
    width: 240,
    margin: 2,
    errorCorrectionLevel: 'H',
    color: { dark: '#1e293b', light: '#ffffff' },
  })

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const initials = companyName
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="w-full max-w-xs overflow-hidden rounded-2xl bg-slate-900 ring-1 ring-slate-700 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/60">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-700">
            <HardHat className="h-4 w-4 text-white" />
          </div>
          <div className="leading-tight">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-300">HardHat</p>
            <p className="text-[9px] uppercase tracking-widest text-slate-500">Site Access Pass</p>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-emerald-950 px-2 py-0.5 ring-1 ring-emerald-800">
          <ShieldCheck className="h-3 w-3 text-emerald-400" />
          <span className="text-[10px] font-semibold text-emerald-400">Active</span>
        </div>
      </div>

      {/* Sub name */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-700 text-sm font-bold text-white ring-1 ring-slate-600">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{companyName}</p>
            <p className="text-[10px] text-slate-500">Present to site security for scan</p>
          </div>
        </div>
      </div>

      {/* QR Code */}
      <div className="flex items-center justify-center bg-white mx-5 rounded-xl py-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} alt={`Site access QR for ${companyName}`} width={200} height={200} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-700/60">
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
          <Clock className="h-3 w-3" />
          <span>Expires {expiresAt}</span>
        </div>
        <span className="text-[9px] font-mono uppercase tracking-wider text-slate-600">
          {subcontractorId.slice(0, 8)}
        </span>
      </div>
    </div>
  )
}
