'use client'

import { useRef, useState, useCallback, useTransition } from 'react'
import Image from 'next/image'
import {
  Camera, Upload, RotateCcw, Loader2, AlertTriangle,
  CheckCircle2, X, BookOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { SiteJournal } from '@/types/database.types'

type Phase = 'idle' | 'camera' | 'preview' | 'analyzing' | 'done' | 'error'

const QUALITY_CONFIG = {
  high:   { label: 'High Quality',   cls: 'bg-emerald-100 text-emerald-700 ring-emerald-200' },
  medium: { label: 'Medium Quality', cls: 'bg-amber-100   text-amber-700   ring-amber-200'   },
  low:    { label: 'Low Quality',    cls: 'bg-red-100     text-red-700     ring-red-200'     },
}

function resizeToJpeg(source: HTMLVideoElement | HTMLImageElement, maxDim = 1280): string {
  const isVideo = source instanceof HTMLVideoElement
  const srcW = isVideo ? source.videoWidth  : (source as HTMLImageElement).naturalWidth
  const srcH = isVideo ? source.videoHeight : (source as HTMLImageElement).naturalHeight

  const scale = Math.min(1, maxDim / Math.max(srcW, srcH))
  const w = Math.round(srcW * scale)
  const h = Math.round(srcH * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  canvas.getContext('2d')!.drawImage(source, 0, 0, w, h)
  return canvas.toDataURL('image/jpeg', 0.88)
}

export function JournalUpload({ projectId }: { projectId?: string }) {
  const videoRef     = useRef<HTMLVideoElement>(null)
  const streamRef    = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [phase,       setPhase]       = useState<Phase>('idle')
  const [dataUrl,     setDataUrl]     = useState<string | null>(null)
  const [journal,     setJournal]     = useState<SiteJournal | null>(null)
  const [errorMsg,    setErrorMsg]    = useState<string | null>(null)
  const [_analyzing, startAnalyze]   = useTransition()

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  async function openCamera() {
    setPhase('camera')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
    } catch {
      setErrorMsg('Camera access denied — please use file upload instead.')
      setPhase('error')
    }
  }

  function captureFrame() {
    if (!videoRef.current) return
    const url = resizeToJpeg(videoRef.current)
    stopCamera()
    setDataUrl(url)
    setPhase('preview')
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = document.createElement('img')
      img.onload = () => {
        const url = resizeToJpeg(img)
        setDataUrl(url)
        setPhase('preview')
      }
      img.src = ev.target?.result as string
    }
    reader.readAsDataURL(file)
    // Reset input so same file can be re-selected
    e.target.value = ''
  }

  function reset() {
    stopCamera()
    setDataUrl(null)
    setJournal(null)
    setErrorMsg(null)
    setPhase('idle')
  }

  function submit() {
    if (!dataUrl) return
    setPhase('analyzing')
    startAnalyze(async () => {
      try {
        const res = await fetch('/api/journal/generate', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ photoDataUrl: dataUrl, projectId: projectId ?? null }),
        })
        const json = await res.json() as { ok?: boolean; journal?: SiteJournal; error?: string }
        if (!res.ok || !json.ok || !json.journal) {
          setErrorMsg(json.error ?? 'Analysis failed — please try again.')
          setPhase('error')
          return
        }
        setJournal(json.journal)
        setPhase('done')
      } catch {
        setErrorMsg('Network error — please check your connection.')
        setPhase('error')
      }
    })
  }

  // ── Render states ──────────────────────────────────────────────

  if (phase === 'done' && journal) {
    const qCfg = QUALITY_CONFIG[journal.photo_quality] ?? QUALITY_CONFIG.medium
    const paragraphs = journal.ai_summary.split('\n\n').filter(Boolean)

    return (
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <h2 className="text-sm font-semibold text-slate-700">Journal Entry Created</h2>
          </div>
          <Button variant="outline" onClick={reset} className="h-7 px-3 text-xs">
            <Camera className="mr-1.5 h-3.5 w-3.5" /> New Entry
          </Button>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {/* Photo thumbnail */}
            {journal.photo_url && (
              <div className="relative aspect-video sm:aspect-square overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200">
                <Image
                  src={journal.photo_url}
                  alt="Site progress photo"
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 33vw"
                />
              </div>
            )}

            {/* Meta */}
            <div className="sm:col-span-2 space-y-3">
              <div className="flex flex-wrap gap-2">
                {journal.work_phase && (
                  <span className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-0.5 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200">
                    {journal.work_phase}
                  </span>
                )}
                <span className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold ring-1 ${qCfg.cls}`}>
                  {qCfg.label}
                </span>
              </div>

              {/* Photo quality warning */}
              {journal.photo_quality === 'low' && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <p className="text-xs text-amber-800">
                    Retake recommended — low photo quality may limit AI accuracy. This entry is marked provisional.
                  </p>
                </div>
              )}

              {/* Timestamp + attendance */}
              <div className="text-xs text-slate-500 space-y-1">
                <p>
                  <span className="font-medium text-slate-700">Recorded:</span>{' '}
                  {new Date(journal.created_at).toLocaleString('en-US', {
                    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
                {journal.attendance_context && (
                  <p>
                    <span className="font-medium text-slate-700">Attendance:</span>{' '}
                    {String((journal.attendance_context as Record<string, unknown>).grantedToday ?? 0)} worker entries,{' '}
                    {String((journal.attendance_context as Record<string, unknown>).uniqueCompanies ?? 0)} compan{Number((journal.attendance_context as Record<string, unknown>).uniqueCompanies) === 1 ? 'y' : 'ies'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* AI Summary */}
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-4 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">AI-Generated Site Summary</p>
            {paragraphs.map((para, i) => (
              <p key={i} className="text-sm text-slate-700 leading-relaxed">{para}</p>
            ))}
          </div>

          {/* Caveats */}
          {journal.caveats && journal.caveats.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">AI Uncertainty Flags</p>
              <div className="flex flex-wrap gap-2">
                {journal.caveats.map((c, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800"
                  >
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <div>
            <p className="text-sm font-semibold text-red-800">{errorMsg}</p>
            <Button onClick={reset} variant="outline" className="mt-3 h-8 text-xs border-red-200 text-red-700 hover:bg-red-100">
              Try again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'analyzing') {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 shadow-sm">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-amber-400" />
            <BookOpen className="absolute inset-0 m-auto h-6 w-6 text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">AI is authoring your journal…</p>
            <p className="mt-1 text-xs text-slate-400">Analysing site progress and attendance data</p>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'preview' && dataUrl) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-700">Review Photo</h2>
          <button type="button" onClick={reset} className="text-slate-400 hover:text-slate-700 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="relative w-full overflow-hidden rounded-lg bg-slate-900" style={{ aspectRatio: '16/9' }}>
            <img src={dataUrl} alt="Preview" className="w-full h-full object-contain" />
          </div>
          <div className="flex gap-3">
            <Button onClick={submit} className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold flex-1">
              <BookOpen className="mr-2 h-4 w-4" /> Generate AI Journal
            </Button>
            <Button onClick={reset} variant="outline">
              <RotateCcw className="mr-2 h-4 w-4" /> Retake
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'camera') {
    return (
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-700">Capture Site Photo</h2>
          <button type="button" onClick={reset} className="text-slate-400 hover:text-slate-700 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="relative w-full overflow-hidden rounded-lg bg-slate-900" style={{ aspectRatio: '16/9' }}>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              ref={videoRef}
              playsInline
              muted
              className="absolute inset-0 h-full w-full object-cover"
            />
            {/* Site photo guide overlay */}
            <div className="absolute inset-4 rounded-lg border-2 border-dashed border-amber-400/60 pointer-events-none" />
          </div>
          <Button
            onClick={captureFrame}
            className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold"
          >
            <Camera className="mr-2 h-4 w-4" /> Capture Photo
          </Button>
        </div>
      </div>
    )
  }

  // Idle state
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-100 bg-slate-50 px-5 py-3.5">
        <h2 className="text-sm font-semibold text-slate-700">New Journal Entry</h2>
        <p className="mt-0.5 text-xs text-slate-400">
          Capture or upload a site photo — AI will author today's progress entry automatically.
        </p>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={openCamera}
            className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-slate-200 p-8 text-center transition-colors hover:border-amber-400 hover:bg-amber-50 group"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 group-hover:bg-amber-100 transition-colors">
              <Camera className="h-6 w-6 text-slate-500 group-hover:text-amber-600 transition-colors" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">Use Camera</p>
              <p className="mt-0.5 text-xs text-slate-400">Rear-facing for site photos</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-slate-200 p-8 text-center transition-colors hover:border-indigo-400 hover:bg-indigo-50 group"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 group-hover:bg-indigo-100 transition-colors">
              <Upload className="h-6 w-6 text-slate-500 group-hover:text-indigo-600 transition-colors" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">Upload Photo</p>
              <p className="mt-0.5 text-xs text-slate-400">JPEG, PNG or WebP</p>
            </div>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={handleFileChange}
        />

        <p className="mt-4 text-center text-[11px] text-slate-400">
          AI analysis uses Gemini vision. Each entry is permanently recorded as a legal daily log.
        </p>
      </div>
    </div>
  )
}
