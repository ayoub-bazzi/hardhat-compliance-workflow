'use client'

import { useRef, useState, useCallback } from 'react'
import { Camera, CheckCircle, AlertTriangle, RotateCcw, Loader2, XCircle } from 'lucide-react'

type FaceMatchResult = 'match' | 'suspected_impersonation' | 'no_profile_photo' | 'error'

type MatchResponse = {
  ok: boolean
  result: FaceMatchResult
  score: number | null
}

type CaptureState =
  | 'idle'
  | 'requesting'
  | 'preview'
  | 'captured'
  | 'uploading'
  | 'done'
  | 'denied'

// ── Image pre-processing ──────────────────────────────────────────────────────
// Per-channel 1st/99th percentile histogram stretch to handle harsh site
// lighting (direct sun, dust haze, orange-biased IP cameras).

function preprocessFrame(video: HTMLVideoElement): string {
  const SIZE = 512
  const canvas = document.createElement('canvas')
  canvas.width  = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')!

  // Center-crop square from video frame
  const vw = video.videoWidth
  const vh = video.videoHeight
  const side = Math.min(vw, vh)
  const sx = (vw - side) / 2
  const sy = (vh - side) / 2
  ctx.drawImage(video, sx, sy, side, side, 0, 0, SIZE, SIZE)

  // Read pixels
  const imageData = ctx.getImageData(0, 0, SIZE, SIZE)
  const d = imageData.data
  const pixelCount = SIZE * SIZE

  // Warm-tint correction for typical site cameras (orange cast)
  for (let i = 0; i < d.length; i += 4) {
    d[i]     = Math.min(255, d[i]     - 5) // R  -5
    d[i + 2] = Math.min(255, d[i + 2] + 8) // B  +8
  }

  // Per-channel histogram
  const hist = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)]
  for (let i = 0; i < d.length; i += 4) {
    hist[0][d[i]]++
    hist[1][d[i + 1]]++
    hist[2][d[i + 2]]++
  }

  // 1st / 99th percentile per channel
  const loThresh = 0.01 * pixelCount
  const hiThresh = 0.99 * pixelCount
  const mins = [0, 0, 0]
  const maxs = [255, 255, 255]
  for (let c = 0; c < 3; c++) {
    let acc = 0
    for (let v = 0; v < 256; v++) {
      acc += hist[c][v]
      if (acc < loThresh) mins[c] = v
      if (acc >= hiThresh) { maxs[c] = v; break }
    }
  }

  // Stretch channels to full range
  for (let i = 0; i < d.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const range = maxs[c] - mins[c] || 1
      d[i + c] = Math.min(255, Math.max(0, Math.round(((d[i + c] - mins[c]) / range) * 255)))
    }
  }

  ctx.putImageData(imageData, 0, 0)
  return canvas.toDataURL('image/jpeg', 0.78)
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CameraCapture({
  logId,
  subcontractorId,
}: {
  logId:            string | null
  subcontractorId:  string
}) {
  const videoRef   = useRef<HTMLVideoElement>(null)
  const streamRef  = useRef<MediaStream | null>(null)
  const [state,     setState]   = useState<CaptureState>('idle')
  const [dataUrl,   setDataUrl] = useState<string | null>(null)
  const [matchResult, setMatchResult] = useState<MatchResponse | null>(null)

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  async function openCamera() {
    setState('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setState('preview')
    } catch {
      setState('denied')
    }
  }

  function takePhoto() {
    if (!videoRef.current) return
    const url = preprocessFrame(videoRef.current)
    setDataUrl(url)
    stopStream()
    setState('captured')
  }

  function retake() {
    setDataUrl(null)
    setState('idle')
  }

  async function submit() {
    if (!dataUrl || !logId) return
    setState('uploading')
    try {
      const res = await fetch('/api/gate/verify-face', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logId, subcontractorId, photoDataUrl: dataUrl }),
      })
      const json = await res.json() as MatchResponse
      setMatchResult(json)
      setState('done')
    } catch {
      setMatchResult({ ok: false, result: 'error', score: null })
      setState('done')
    }
  }

  // If no logId (log insert failed), render nothing — camera is tied to the log entry.
  if (!logId) return null

  // ── Idle: camera trigger bar ────────────────────────────────────────────────
  if (state === 'idle' || state === 'requesting') {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-black/80 px-4 pb-safe-area-inset-bottom backdrop-blur-sm">
        <button
          onClick={openCamera}
          disabled={state === 'requesting'}
          className="flex min-h-[72px] w-full items-center justify-center gap-3 rounded-none text-white active:bg-white/10 touch-manipulation"
        >
          {state === 'requesting'
            ? <Loader2 className="h-6 w-6 animate-spin text-white/60" />
            : <Camera  className="h-6 w-6" />
          }
          <span className="text-base font-bold tracking-wide">
            {state === 'requesting' ? 'Starting camera…' : 'Capture Entry Photo'}
          </span>
        </button>
      </div>
    )
  }

  // ── Camera denied ───────────────────────────────────────────────────────────
  if (state === 'denied') {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-red-500/20 bg-black/80 px-4 pb-safe-area-inset-bottom backdrop-blur-sm">
        <div className="flex min-h-[72px] items-center justify-center gap-2 text-red-400">
          <XCircle className="h-5 w-5 shrink-0" />
          <span className="text-sm font-semibold">Camera access denied — enable in browser settings</span>
        </div>
      </div>
    )
  }

  // ── Live preview ────────────────────────────────────────────────────────────
  if (state === 'preview') {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-black/90 backdrop-blur-sm">
        {/* Video feed */}
        <div className="relative w-full" style={{ maxHeight: '55dvh', overflow: 'hidden' }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
            style={{ maxHeight: '55dvh' }}
          />
          {/* Viewfinder overlay */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-48 w-48 rounded-2xl border-2 border-white/60 shadow-lg" />
          </div>
        </div>
        {/* Capture button */}
        <div className="flex items-center justify-between px-6 pb-6 pt-3">
          <button
            onClick={retake}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-white touch-manipulation active:bg-white/20"
          >
            <XCircle className="h-6 w-6" />
          </button>
          {/* Large shutter button */}
          <button
            onClick={takePhoto}
            className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-white shadow-xl touch-manipulation active:scale-95 transition-transform"
            aria-label="Take photo"
          >
            <div className="h-14 w-14 rounded-full bg-white ring-2 ring-slate-200" />
          </button>
          <div className="h-14 w-14" />
        </div>
      </div>
    )
  }

  // ── Still preview ───────────────────────────────────────────────────────────
  if (state === 'captured') {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-black/90 backdrop-blur-sm">
        {dataUrl && (
          <div className="relative w-full" style={{ maxHeight: '55dvh', overflow: 'hidden' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={dataUrl} alt="Captured entry photo" className="h-full w-full object-cover" style={{ maxHeight: '55dvh' }} />
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 px-4 py-4">
          <button
            onClick={retake}
            className="flex min-h-[64px] items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 text-sm font-bold text-white touch-manipulation active:bg-white/20"
          >
            <RotateCcw className="h-5 w-5" /> Retake
          </button>
          <button
            onClick={submit}
            className="flex min-h-[64px] items-center justify-center gap-2 rounded-xl bg-white text-sm font-bold text-slate-900 shadow-lg touch-manipulation active:bg-slate-100"
          >
            <CheckCircle className="h-5 w-5" /> Submit Photo
          </button>
        </div>
      </div>
    )
  }

  // ── Uploading ───────────────────────────────────────────────────────────────
  if (state === 'uploading') {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-black/80 px-4 pb-safe-area-inset-bottom backdrop-blur-sm">
        <div className="flex min-h-[72px] items-center justify-center gap-3 text-white">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm font-semibold">Verifying identity…</span>
        </div>
      </div>
    )
  }

  // ── Done: face match result ─────────────────────────────────────────────────
  if (state === 'done' && matchResult) {
    const isMatch    = matchResult.result === 'match'
    const isNoPhoto  = matchResult.result === 'no_profile_photo'
    const isError    = matchResult.result === 'error'
    const isFlag     = matchResult.result === 'suspected_impersonation'

    return (
      <div className={`fixed bottom-0 left-0 right-0 z-50 border-t px-4 pb-safe-area-inset-bottom backdrop-blur-sm ${
        isMatch   ? 'border-emerald-500/30 bg-emerald-950/90'
        : isFlag  ? 'border-red-500/30 bg-red-950/90'
        : 'border-white/10 bg-black/80'
      }`}>
        <div className="flex min-h-[72px] items-center justify-center gap-3">
          {isMatch && (
            <>
              <CheckCircle className="h-6 w-6 text-emerald-400" />
              <div>
                <p className="text-sm font-bold text-emerald-300">Identity Confirmed</p>
                {matchResult.score !== null && (
                  <p className="text-xs text-emerald-500">{matchResult.score}% confidence</p>
                )}
              </div>
            </>
          )}
          {isFlag && (
            <>
              <AlertTriangle className="h-6 w-6 text-red-400" />
              <div>
                <p className="text-sm font-bold text-red-300">Suspected Impersonation</p>
                <p className="text-xs text-red-500">PM alerted — verify identity manually</p>
              </div>
            </>
          )}
          {isNoPhoto && (
            <>
              <Camera className="h-6 w-6 text-slate-400" />
              <div>
                <p className="text-sm font-bold text-slate-300">Photo Saved</p>
                <p className="text-xs text-slate-500">No profile photo on file for comparison</p>
              </div>
            </>
          )}
          {isError && (
            <>
              <XCircle className="h-6 w-6 text-amber-400" />
              <p className="text-sm font-semibold text-amber-300">Verification unavailable — photo saved</p>
            </>
          )}
        </div>
      </div>
    )
  }

  return null
}
