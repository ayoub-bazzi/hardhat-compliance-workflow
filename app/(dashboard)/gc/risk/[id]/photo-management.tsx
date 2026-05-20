'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Trash2, Loader2, UserCheck, UserX } from 'lucide-react'
import { resetSubcontractorPhoto } from './photo-actions'

export function PhotoManagement({
  subId,
  companyName,
  photoUrl,
}: {
  subId: string
  companyName: string
  photoUrl: string | null
}) {
  const router = useRouter()
  const [resetting, setResetting] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  async function handleReset() {
    if (!confirmed) {
      setConfirmed(true)
      return
    }
    setResetting(true)
    await resetSubcontractorPhoto(subId)
    router.refresh()
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-100 bg-slate-50 px-5 py-3.5">
        <h2 className="text-sm font-semibold text-slate-700">Digital ID Photo</h2>
      </div>

      <div className="px-5 py-5">
        {photoUrl ? (
          <div className="flex items-start gap-5">
            {/* Photo */}
            <div className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoUrl}
                alt={`${companyName} profile photo`}
                className="h-28 w-24 rounded-xl object-cover ring-1 ring-slate-200 shadow-sm"
              />
            </div>

            {/* Info + actions */}
            <div className="flex flex-1 flex-col gap-3">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-slate-800">Photo Enrolled</p>
                  <p className="text-xs text-slate-500">Gate identity verification is active for this subcontractor.</p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {confirmed && !resetting && (
                  <p className="text-xs font-semibold text-red-600">
                    Confirm: this will remove the photo and disable gate ID checks.
                  </p>
                )}
                <button
                  onClick={handleReset}
                  disabled={resetting}
                  className={`inline-flex w-fit items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold transition ${
                    confirmed
                      ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  } disabled:opacity-50`}
                >
                  {resetting ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Resetting…</>
                  ) : confirmed ? (
                    <><Trash2 className="h-3.5 w-3.5" /> Confirm Reset</>
                  ) : (
                    <><Trash2 className="h-3.5 w-3.5" /> Reset Photo</>
                  )}
                </button>
                {confirmed && !resetting && (
                  <button
                    onClick={() => setConfirmed(false)}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 py-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100">
              <UserX className="h-5 w-5 text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">No photo enrolled</p>
              <p className="mt-0.5 text-xs text-slate-500">
                Ask the worker to visit <span className="font-mono text-slate-600">/subcontractor/onboarding/photo</span> in their portal to enroll their ID photo. Gate identity verification will activate automatically once enrolled.
              </p>
            </div>
            <Camera className="ms-auto h-5 w-5 shrink-0 text-slate-300" />
          </div>
        )}
      </div>
    </div>
  )
}
