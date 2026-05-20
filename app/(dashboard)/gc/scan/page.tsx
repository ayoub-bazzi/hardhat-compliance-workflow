'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import jsQR from 'jsqr'
import {
  ArrowLeft, Camera, CameraOff, CheckCircle2, XCircle,
  Loader2, ScanLine, RefreshCw, ShieldCheck, ShieldAlert,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { verifySubcontractor } from './scan-actions'
import type { VerificationResult } from './scan-actions'

type ScanPhase = 'requesting' | 'scanning' | 'verifying' | 'result' | 'denied' | 'error'

function CornerTarget() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="relative h-56 w-56">
        {/* top-left */}
        <span className="absolute left-0 top-0 h-8 w-8 border-l-[3px] border-t-[3px] border-white rounded-tl-sm" />
        {/* top-right */}
        <span className="absolute right-0 top-0 h-8 w-8 border-r-[3px] border-t-[3px] border-white rounded-tr-sm" />
        {/* bottom-left */}
        <span className="absolute bottom-0 left-0 h-8 w-8 border-b-[3px] border-l-[3px] border-white rounded-bl-sm" />
        {/* bottom-right */}
        <span className="absolute bottom-0 right-0 h-8 w-8 border-b-[3px] border-r-[3px] border-white rounded-br-sm" />
        {/* scan line animation */}
        <div className="absolute inset-x-2 top-0 animate-scan-beam h-0.5 rounded-full bg-gradient-to-r from-transparent via-indigo-400 to-transparent" />
      </div>
    </div>
  )
}

function ResultCard({ result, onReset }: { result: VerificationResult; onReset: () => void }) {
  if (!result.found) {
    return (
      <div className="mx-4 overflow-hidden rounded-2xl border-2 border-slate-300 bg-white shadow-xl">
        <div className="flex items-center gap-3 bg-slate-700 px-5 py-4">
          <XCircle className="h-5 w-5 text-white/70" />
          <p className="font-bold text-white">Unknown QR Code</p>
        </div>
        <div className="px-5 py-4 text-center">
          <p className="text-sm text-slate-600">
            This QR code is not registered in the system.
          </p>
          <Button onClick={onReset} variant="outline" size="sm" className="mt-4 gap-2">
            <RefreshCw className="h-3.5 w-3.5" />Scan Again
          </Button>
        </div>
      </div>
    )
  }

  const { company_name, email, isCleared, projects } = result

  return (
    <div className={`mx-4 overflow-hidden rounded-2xl border-2 shadow-xl ${
      isCleared ? 'border-emerald-400' : 'border-red-400'
    }`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-5 py-4 ${
        isCleared ? 'bg-emerald-700' : 'bg-red-700'
      }`}>
        <div className="flex items-center gap-2.5">
          {isCleared
            ? <CheckCircle2 className="h-5 w-5 text-white" />
            : <XCircle className="h-5 w-5 text-white" />
          }
          <p className="text-base font-black uppercase tracking-wider text-white">
            {isCleared ? 'Cleared for Site' : 'Not Cleared'}
          </p>
        </div>
        <div className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
          isCleared ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
        }`}>
          Live Check
        </div>
      </div>

      {/* Sub info */}
      <div className="bg-white px-5 py-4">
        <p className="text-lg font-bold text-slate-900">{company_name}</p>
        <p className="text-xs text-slate-500">{email}</p>

        <div className="mt-4 space-y-2">
          {projects.map((p, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <p className="text-sm font-medium text-slate-700 truncate">{p.name}</p>
              {p.compliance_status === 'compliant' ? (
                <Badge className="shrink-0 border-0 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 gap-1 ml-2">
                  <ShieldCheck className="h-3 w-3" />Compliant
                </Badge>
              ) : (
                <Badge className="shrink-0 border-0 bg-red-100 text-red-700 hover:bg-red-100 gap-1 ml-2">
                  <ShieldAlert className="h-3 w-3" />Issues
                </Badge>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className={`border-t px-5 py-3 ${
        isCleared ? 'border-emerald-100 bg-emerald-50' : 'border-red-100 bg-red-50'
      }`}>
        <Button onClick={onReset} variant="outline" size="sm" className="w-full gap-2">
          <RefreshCw className="h-3.5 w-3.5" />Scan Another
        </Button>
      </div>
    </div>
  )
}

export default function GcScanPage() {
  const videoRef  = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef    = useRef<number | undefined>(undefined)

  const [phase, setPhase]     = useState<ScanPhase>('requesting')
  const [result, setResult]   = useState<VerificationResult | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)

  const stopStream = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  const startCamera = useCallback(async () => {
    setPhase('requesting')
    setScanError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setPhase('scanning')
    } catch {
      setPhase('denied')
    }
  }, [])

  // Scan loop
  useEffect(() => {
    if (phase !== 'scanning') return

    const scan = () => {
      const video  = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas || video.readyState < video.HAVE_ENOUGH_DATA) {
        rafRef.current = requestAnimationFrame(scan)
        return
      }
      canvas.width  = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return
      ctx.drawImage(video, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      })
      if (code?.data) {
        stopStream()
        setPhase('verifying')
        verifySubcontractor(code.data).then((res) => {
          setResult(res)
          setPhase('result')
        }).catch(() => {
          setPhase('error')
          setScanError('Verification failed. Please try again.')
        })
        return
      }
      rafRef.current = requestAnimationFrame(scan)
    }
    rafRef.current = requestAnimationFrame(scan)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [phase, stopStream])

  // Start camera on mount, clean up on unmount
  useEffect(() => {
    startCamera()
    return stopStream
  }, [startCamera, stopStream])

  function handleReset() {
    setResult(null)
    setScanError(null)
    startCamera()
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/gc/projects"
            className="flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Site Scanner</h1>
            <p className="text-xs text-slate-500">Scan a subcontractor&apos;s Safety Pass QR code</p>
          </div>
        </div>
      </div>

      {/* Camera viewfinder */}
      {phase !== 'result' && (
        <div className="relative overflow-hidden rounded-2xl bg-slate-950 aspect-[4/3] w-full max-w-lg mx-auto">
          <video
            ref={videoRef}
            playsInline
            muted
            className="h-full w-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />

          {phase === 'scanning' && <CornerTarget />}

          {/* Status overlay */}
          <div className="absolute bottom-4 inset-x-4 flex justify-center">
            {phase === 'requesting' && (
              <div className="flex items-center gap-2 rounded-full bg-slate-900/80 px-4 py-2 text-xs text-white backdrop-blur-sm">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Starting camera…
              </div>
            )}
            {phase === 'scanning' && (
              <div className="flex items-center gap-2 rounded-full bg-slate-900/70 px-4 py-2 text-xs text-white/80 backdrop-blur-sm">
                <ScanLine className="h-3.5 w-3.5 text-indigo-400" />
                Align QR code within the frame
              </div>
            )}
            {phase === 'verifying' && (
              <div className="flex items-center gap-2 rounded-full bg-slate-900/80 px-4 py-2 text-xs text-white backdrop-blur-sm">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400" />
                Verifying compliance…
              </div>
            )}
          </div>

          {/* Denied overlay */}
          {phase === 'denied' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950/90 text-center px-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-800">
                <CameraOff className="h-7 w-7 text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Camera access denied</p>
                <p className="mt-1 text-xs text-slate-400">
                  Please allow camera access in your browser settings.
                </p>
              </div>
              <Button size="sm" onClick={handleReset} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                <Camera className="h-3.5 w-3.5" />Try Again
              </Button>
            </div>
          )}

          {/* Error overlay */}
          {phase === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/90 px-6 text-center">
              <p className="text-sm text-red-400">{scanError}</p>
              <Button size="sm" onClick={handleReset} className="gap-2">
                <RefreshCw className="h-3.5 w-3.5" />Retry
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Verification result */}
      {phase === 'result' && result && (
        <ResultCard result={result} onReset={handleReset} />
      )}
    </div>
  )
}
