'use client'

import { useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Camera, CheckCircle, RotateCcw, Loader2, XCircle, AlertTriangle, UserCheck,
} from 'lucide-react'

type EnrollState =
  | 'idle'
  | 'requesting'
  | 'preview'
  | 'captured'
  | 'uploading'
  | 'error'
  | 'success'

// ── Head-and-shoulders portrait crop ─────────────────────────────────────────
// Crops the largest 4:5 portrait region from the video frame, anchored slightly
// above vertical center (~35% down) so the composition is head-heavy rather
// than chin-heavy — capturing forehead + shoulders naturally on a selfie camera.

function cropHeadAndShoulders(video: HTMLVideoElement): string {
  const OUT_W = 480
  const OUT_H = 600
  const canvas = document.createElement('canvas')
  canvas.width = OUT_W
  canvas.height = OUT_H
  const ctx = canvas.getContext('2d')!

  const vw = video.videoWidth
  const vh = video.videoHeight
  const targetAspect = OUT_W / OUT_H // 0.8 (4:5 portrait)
  const frameAspect = vw / vh

  let srcW: number, srcH: number
  if (frameAspect > targetAspect) {
    srcH = vh
    srcW = srcH * targetAspect
  } else {
    srcW = vw
    srcH = srcW / targetAspect
  }

  const sx = (vw - srcW) / 2
  // Bias 35% from top instead of 50% — more head, less chin
  const sy = Math.max(0, (vh - srcH) * 0.35)

  ctx.drawImage(video, sx, sy, srcW, srcH, 0, 0, OUT_W, OUT_H)
  return canvas.toDataURL('image/jpeg', 0.88)
}

// ── Component ─────────────────────────────────────────────────────────────────

export function EnrollmentClient({
  companyName,
  existingPhotoUrl,
}: {
  companyName: string
  existingPhotoUrl: string | null
}) {
  const router = useRouter()
  const videoRef   = useRef<HTMLVideoElement>(null)
  const streamRef  = useRef<MediaStream | null>(null)
  const [state,    setState]    = useState<EnrollState>('idle')
  const [dataUrl,  setDataUrl]  = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string>('')

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  async function openCamera() {
    setState('requesting')
    try {
      // Front camera for ID enrollment selfie
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setState('preview')
    } catch {
      setState('idle')
      setFeedback('Camera access denied — enable camera permissions in your browser settings.')
    }
  }

  function takePhoto() {
    if (!videoRef.current) return
    const url = cropHeadAndShoulders(videoRef.current)
    setDataUrl(url)
    stopStream()
    setState('captured')
  }

  function retake() {
    setDataUrl(null)
    setFeedback('')
    setState('idle')
  }

  async function savePhoto() {
    if (!dataUrl) return
    setState('uploading')
    setFeedback('')
    try {
      const res = await fetch('/api/portal/enroll-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoDataUrl: dataUrl }),
      })
      const json = await res.json() as { ok: boolean; feedback?: string; error?: string }

      if (json.ok) {
        setState('success')
        router.refresh()
      } else {
        setFeedback(json.feedback ?? json.error ?? 'Something went wrong — please try again.')
        setState('error')
      }
    } catch {
      setFeedback('Network error — please check your connection and try again.')
      setState('error')
    }
  }

  // ── Success ──────────────────────────────────────────────────────────────────
  if (state === 'success') {
    return (
      <div className="flex flex-col items-center gap-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-8 py-10 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 ring-4 ring-emerald-200">
          <UserCheck className="h-8 w-8 text-emerald-600" />
        </div>
        <div>
          <p className="text-lg font-bold text-emerald-900">Digital ID Activated</p>
          <p className="mt-1 text-sm text-emerald-700">
            Your site pass photo has been saved. Gate scanners can now verify your identity.
          </p>
        </div>
        {dataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={dataUrl}
            alt="Your enrolled ID photo"
            className="h-40 w-32 rounded-xl object-cover ring-2 ring-emerald-300 shadow-md"
          />
        )}
        <button
          onClick={retake}
          className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
        >
          <RotateCcw className="h-4 w-4" /> Retake Photo
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Existing photo preview */}
      {existingPhotoUrl && state === 'idle' && (
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={existingPhotoUrl}
            alt="Current ID photo"
            className="h-16 w-14 rounded-lg object-cover ring-1 ring-slate-200"
          />
          <div>
            <p className="text-sm font-semibold text-slate-800">Current ID Photo</p>
            <p className="text-xs text-slate-500">{companyName}</p>
          </div>
          <CheckCircle className="ms-auto h-5 w-5 text-emerald-500 shrink-0" />
        </div>
      )}

      {/* Error feedback */}
      {(state === 'error' || (state === 'idle' && feedback)) && feedback && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-800">{feedback}</p>
        </div>
      )}

      {/* ── Idle / Error: CTA ──────────────────────────────────────────────── */}
      {(state === 'idle' || state === 'error') && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Instructions */}
          <div className="space-y-3 px-6 py-6">
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">1</span>
              Face the camera in good lighting
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">2</span>
              Align your head and shoulders in the guide frame
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">3</span>
              Tap the shutter — AI will verify the photo quality
            </div>
          </div>
          <button
            onClick={openCamera}
            className="flex w-full items-center justify-center gap-3 bg-slate-900 py-4 text-base font-bold text-white transition hover:bg-slate-800 active:bg-slate-950"
          >
            <Camera className="h-5 w-5 text-amber-400" />
            {existingPhotoUrl ? 'Update ID Photo' : 'Open Camera'}
          </button>
        </div>
      )}

      {/* ── Requesting camera ──────────────────────────────────────────────── */}
      {state === 'requesting' && (
        <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="text-sm font-medium">Starting camera…</span>
          </div>
        </div>
      )}

      {/* ── Live preview ───────────────────────────────────────────────────── */}
      {state === 'preview' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-black shadow-sm">
          <div className="relative" style={{ aspectRatio: '4/5', maxHeight: '66dvh' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 h-full w-full object-cover"
            />
            {/* Portrait guide overlay — mirrors the 4:5 crop window */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center"
              style={{ paddingTop: '5%' }}
            >
              <div
                className="rounded-3xl border-2 border-white/70 shadow-lg"
                style={{ width: '72%', aspectRatio: '4/5' }}
              />
            </div>
            {/* Shoulder guide line */}
            <div className="pointer-events-none absolute inset-x-0 bottom-[22%] flex items-center justify-center">
              <div className="h-px w-[72%] bg-white/30" />
            </div>
            <p className="absolute bottom-3 left-0 right-0 text-center text-xs text-white/60">
              Align head + shoulders within the frame
            </p>
          </div>
          {/* Shutter row */}
          <div className="flex items-center justify-between bg-black px-8 py-5">
            <button
              onClick={() => { stopStream(); setState('idle') }}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white active:bg-white/20 touch-manipulation"
            >
              <XCircle className="h-6 w-6" />
            </button>
            <button
              onClick={takePhoto}
              aria-label="Take photo"
              className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-white shadow-xl touch-manipulation active:scale-95 transition-transform"
            >
              <div className="h-14 w-14 rounded-full bg-white ring-2 ring-slate-200" />
            </button>
            <div className="h-12 w-12" />
          </div>
        </div>
      )}

      {/* ── Captured still ─────────────────────────────────────────────────── */}
      {state === 'captured' && dataUrl && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-black shadow-sm">
          <div className="relative" style={{ aspectRatio: '4/5', maxHeight: '66dvh' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={dataUrl}
              alt="Captured ID photo preview"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 bg-black px-4 py-4">
            <button
              onClick={retake}
              className="flex min-h-[56px] items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 text-sm font-bold text-white touch-manipulation active:bg-white/20"
            >
              <RotateCcw className="h-4 w-4" /> Retake
            </button>
            <button
              onClick={savePhoto}
              className="flex min-h-[56px] items-center justify-center gap-2 rounded-xl bg-amber-400 text-sm font-bold text-slate-900 shadow touch-manipulation active:bg-amber-300"
            >
              <CheckCircle className="h-4 w-4" /> Save as ID Photo
            </button>
          </div>
        </div>
      )}

      {/* ── Uploading ──────────────────────────────────────────────────────── */}
      {state === 'uploading' && (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 rounded-2xl border border-slate-200 bg-white">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-700">Verifying photo quality…</p>
            <p className="mt-1 text-xs text-slate-400">AI is checking your photo — this takes a moment</p>
          </div>
        </div>
      )}
    </div>
  )
}
