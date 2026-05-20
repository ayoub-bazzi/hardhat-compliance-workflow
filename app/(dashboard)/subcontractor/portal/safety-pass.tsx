import QRCode from 'qrcode'
import { CheckCircle2, Ban, HardHat } from 'lucide-react'

export async function SafetyPass({
  email,
  isCleared,
  companyName,
}: {
  email: string
  isCleared: boolean
  companyName: string
}) {
  const qrDataUrl = await QRCode.toDataURL(email, {
    width: 280,
    margin: 2,
    color: { dark: '#0f172a', light: '#ffffff' },
    errorCorrectionLevel: 'H',
  })

  const today = new Date().toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })

  return (
    <div className={`overflow-hidden rounded-2xl border-2 shadow-lg ${
      isCleared ? 'border-emerald-400' : 'border-red-400'
    }`}>
      {/* Badge header */}
      <div className={`flex items-center justify-between px-6 py-4 ${
        isCleared ? 'bg-emerald-700' : 'bg-red-700'
      }`}>
        <div className="flex items-center gap-2">
          <HardHat className="h-5 w-5 text-white/80" />
          <div className="leading-tight">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">
              HardHat Compliance
            </p>
            <p className="text-sm font-black uppercase tracking-wider text-white">
              Site Access Pass
            </p>
          </div>
        </div>
        <div className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
          isCleared ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {isCleared ? 'Active' : 'Blocked'}
        </div>
      </div>

      {/* QR code area */}
      <div className={`flex justify-center py-8 ${
        isCleared ? 'bg-emerald-50' : 'bg-red-50'
      }`}>
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt="Safety QR Code"
            width={200}
            height={200}
            className={`rounded-lg ${
              isCleared ? '' : 'blur-md opacity-30 select-none pointer-events-none'
            }`}
            draggable={false}
          />
          {!isCleared && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <div className={`rounded-full bg-red-100 p-4 ring-4 ring-red-300`}>
                <Ban className="h-12 w-12 text-red-600" />
              </div>
              <span className="rounded-full bg-red-600 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-white">
                Access Blocked
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Status footer */}
      <div className={`border-t px-6 py-5 text-center ${
        isCleared
          ? 'border-emerald-200 bg-white'
          : 'border-red-200 bg-white'
      }`}>
        <div className="flex items-center justify-center gap-2">
          {isCleared ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          ) : (
            <Ban className="h-5 w-5 text-red-600" />
          )}
          <p className={`text-lg font-black uppercase tracking-wider ${
            isCleared ? 'text-emerald-700' : 'text-red-700'
          }`}>
            {isCleared ? 'Cleared for Site' : 'Not Cleared'}
          </p>
        </div>

        <p className="mt-1 text-base font-semibold text-slate-800">{companyName}</p>

        <p className={`mt-0.5 text-xs font-medium ${
          isCleared ? 'text-emerald-600' : 'text-red-500'
        }`}>
          {isCleared
            ? 'All 3 compliance documents approved'
            : 'Compliance issues detected — see portal'}
        </p>

        {isCleared && (
          <p className="mt-2 text-[11px] text-slate-400">
            Verified {today}
          </p>
        )}
      </div>
    </div>
  )
}
