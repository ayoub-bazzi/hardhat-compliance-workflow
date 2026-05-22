'use client'

import { useState, useEffect, useRef } from 'react'
import { ShieldCheck, ShieldX, Bell, BellOff, Loader2, AlertTriangle, Camera } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createBrowserClient } from '@/lib/supabase'
import { getEntryPhotoSignedUrl } from './photo-actions'

// ── Types ─────────────────────────────────────────────────────

type ScanEntry = {
  id:              string
  subId:           string
  companyName:     string
  riskScore:       number
  result:          'GRANTED' | 'DENIED'
  reasons:         string[]
  gateLocation:    string
  scannedAt:       string
  photoUrl:        string | null
  faceMatchScore:  number | null
  faceMatchResult: string | null
}

type SubInfo = { name: string; riskScore: number }

// ── Helpers ───────────────────────────────────────────────────

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(b64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

function riskBand(score: number): string {
  if (score >= 71) return 'Critical'
  if (score >= 41) return 'Elevated'
  if (score >= 21) return 'Moderate'
  return 'Low'
}

function riskColor(score: number): string {
  if (score >= 71) return 'bg-red-950 text-red-400 ring-red-700'
  if (score >= 41) return 'bg-orange-950 text-orange-400 ring-orange-700'
  if (score >= 21) return 'bg-amber-950 text-amber-400 ring-amber-700'
  return 'bg-slate-800 text-slate-400 ring-slate-600'
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  })
}

// ── Photo thumbnail with face match ring ──────────────────────

function PhotoThumb({
  photoUrl,
  faceMatchResult,
  faceMatchScore,
}: {
  photoUrl:        string | null
  faceMatchResult: string | null
  faceMatchScore:  number | null
}) {
  if (!photoUrl) {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 ring-1 ring-slate-200"
           title="No photo captured">
        <Camera className="h-4 w-4 text-slate-300" />
      </div>
    )
  }

  const ringColor =
    faceMatchResult === 'match'                  ? 'ring-emerald-400'
    : faceMatchResult === 'suspected_impersonation' ? 'ring-red-500'
    : 'ring-slate-200'

  const title =
    faceMatchResult === 'match'                  ? `Identity confirmed (${faceMatchScore}%)`
    : faceMatchResult === 'suspected_impersonation' ? `Suspected impersonation (${faceMatchScore}%)`
    : faceMatchResult === 'no_profile_photo'       ? 'Photo saved — no profile for comparison'
    : 'Entry photo'

  return (
    <a href={photoUrl} target="_blank" rel="noopener noreferrer" title={title}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photoUrl}
        alt="Entry photo"
        className={`h-8 w-8 rounded-lg object-cover ring-2 ${ringColor}`}
      />
    </a>
  )
}

// ── Scan row ──────────────────────────────────────────────────

function ScanRow({ scan, isNew }: { scan: ScanEntry; isNew: boolean }) {
  const granted = scan.result === 'GRANTED'

  return (
    <div className={`grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 rounded-xl border px-4 py-3 transition-all duration-500 ${
      isNew
        ? granted
          ? 'border-emerald-300 bg-emerald-50 shadow-sm'
          : 'border-red-300 bg-red-50 shadow-sm'
        : 'border-slate-200 bg-white'
    }`}>
      {/* Result icon */}
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
        granted ? 'bg-emerald-100' : 'bg-red-100'
      }`}>
        {granted
          ? <ShieldCheck className="h-5 w-5 text-emerald-600" />
          : <ShieldX    className="h-5 w-5 text-red-600" />
        }
      </div>

      {/* Company + reasons */}
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900 truncate">{scan.companyName}</p>
        {scan.reasons.length > 0 && (
          <p className="mt-0.5 text-xs text-slate-500 truncate">
            {scan.reasons[0]}{scan.reasons.length > 1 ? ` +${scan.reasons.length - 1} more` : ''}
          </p>
        )}
      </div>

      {/* Risk badge */}
      <Badge className={`border-0 text-[10px] font-bold ring-1 shrink-0 ${riskColor(scan.riskScore)}`}>
        {riskBand(scan.riskScore)}
      </Badge>

      {/* Result badge */}
      <Badge className={`border-0 text-xs font-bold ring-1 shrink-0 ${
        granted
          ? 'bg-emerald-950 text-emerald-400 ring-emerald-700'
          : 'bg-red-950 text-red-400 ring-red-700'
      }`}>
        {scan.result}
      </Badge>

      {/* Live entry photo + face match indicator */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        <PhotoThumb photoUrl={scan.photoUrl} faceMatchResult={scan.faceMatchResult} faceMatchScore={scan.faceMatchScore} />
        <div className="text-right">
          <p className="text-[11px] font-medium tabular-nums text-slate-500">{timeLabel(scan.scannedAt)}</p>
          <p className="text-[10px] text-slate-400">{dateLabel(scan.scannedAt)}</p>
        </div>
      </div>
    </div>
  )
}

// ── Push subscribe button ──────────────────────────────────────

function PushSubscribeButton({ vapidPublicKey }: { vapidPublicKey: string }) {
  const [state,    setState]   = useState<'idle' | 'loading' | 'subscribed' | 'denied' | 'unsupported'>('idle')
  const [endpoint, setEndpoint] = useState<string | null>(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported')
      return
    }
    navigator.serviceWorker.ready.then((reg) =>
      reg.pushManager.getSubscription().then((sub) => {
        if (sub) { setState('subscribed'); setEndpoint(sub.endpoint) }
      })
    )
  }, [])

  async function subscribe() {
    if (!vapidPublicKey) return
    setState('loading')
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as unknown as BufferSource,
      })
      setEndpoint(sub.endpoint)
      const json = sub.toJSON()
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint, keys: json.keys }),
      })
      setState('subscribed')
    } catch {
      setState('denied')
    }
  }

  async function unsubscribe() {
    setState('loading')
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      await sub?.unsubscribe()
      if (endpoint) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint }),
        })
      }
      setState('idle')
      setEndpoint(null)
    } catch {
      setState('idle')
    }
  }

  if (state === 'unsupported') return null

  if (state === 'subscribed') {
    return (
      <Button variant="outline" size="sm" onClick={unsubscribe}
              className="gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
        <Bell className="h-3.5 w-3.5" /> Alerts On
      </Button>
    )
  }

  if (state === 'denied') {
    return (
      <Button variant="outline" size="sm" disabled className="gap-1.5 text-red-500">
        <BellOff className="h-3.5 w-3.5" /> Blocked
      </Button>
    )
  }

  return (
    <Button variant="outline" size="sm" onClick={subscribe} disabled={state === 'loading' || !vapidPublicKey}
            className="gap-1.5">
      {state === 'loading' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
      {vapidPublicKey ? 'Enable Alerts' : 'Alerts Unavailable'}
    </Button>
  )
}

// ── Root export ───────────────────────────────────────────────

export function SiteMonitorClient({
  initialScans,
  orgId,
  subMap,
  vapidPublicKey,
}: {
  initialScans:   ScanEntry[]
  orgId:          string
  subMap:         Record<string, SubInfo>
  vapidPublicKey: string
}) {
  const [scans,    setScans]    = useState<ScanEntry[]>(initialScans)
  const [newIds,   setNewIds]   = useState<Set<string>>(new Set())
  const subMapRef = useRef(subMap)

  // Subscribe to new gate scans via Supabase Realtime.
  useEffect(() => {
    const supabase = createBrowserClient()

    const channel = supabase
      .channel('site-monitor-feed')
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'site_access_logs',
          filter: `organization_id=eq.${orgId}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string
            subcontractor_id: string
            result: string
            denial_reasons: string[] | null
            gate_location: string | null
            created_at: string
            photo_url: string | null
            face_match_score: number | null
            face_match_result: string | null
          }

          const info = subMapRef.current[row.subcontractor_id]

          const entry: ScanEntry = {
            id:              row.id,
            subId:           row.subcontractor_id,
            companyName:     info?.name ?? 'Unknown Sub',
            riskScore:       info?.riskScore ?? 0,
            result:          row.result as 'GRANTED' | 'DENIED',
            reasons:         row.denial_reasons ?? [],
            gateLocation:    row.gate_location ?? 'QR Gate',
            scannedAt:       row.created_at,
            photoUrl:        row.photo_url ?? null,
            faceMatchScore:  row.face_match_score ?? null,
            faceMatchResult: row.face_match_result ?? null,
          }

          setScans((prev) => [entry, ...prev.slice(0, 99)])
          setNewIds((prev) => new Set(prev).add(entry.id))

          // Remove the "new" highlight after 4 seconds.
          setTimeout(() => {
            setNewIds((prev) => {
              const next = new Set(prev)
              next.delete(entry.id)
              return next
            })
          }, 4000)
        },
      )
      .on(
        'postgres_changes',
        {
          event:  'UPDATE',
          schema: 'public',
          table:  'site_access_logs',
          filter: `organization_id=eq.${orgId}`,
        },
        async (payload) => {
          // Fires when the face-match API writes photo_url / face_match_result back.
          const row = payload.new as {
            id: string
            photo_url: string | null
            face_match_score: number | null
            face_match_result: string | null
          }
          // photo_url is now a storage path — resolve it to a signed URL for display.
          let resolvedPhotoUrl = row.photo_url
          if (resolvedPhotoUrl && !resolvedPhotoUrl.startsWith('http')) {
            resolvedPhotoUrl = await getEntryPhotoSignedUrl(resolvedPhotoUrl)
          }
          setScans((prev) =>
            prev.map((scan) =>
              scan.id === row.id
                ? { ...scan, photoUrl: resolvedPhotoUrl, faceMatchScore: row.face_match_score, faceMatchResult: row.face_match_result }
                : scan
            )
          )
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [orgId])

  return (
    <div className="space-y-4">
      {/* Column header + push subscribe */}
      <div className="flex items-center justify-between">
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 flex-1 mr-4">
          <div className="w-9" />
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Subcontractor</p>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Risk</p>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Result</p>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 w-8 text-right">Cam / Time</p>
        </div>
        <PushSubscribeButton vapidPublicKey={vapidPublicKey} />
      </div>

      {/* VAPID not configured notice */}
      {!vapidPublicKey && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Push notifications require VAPID keys. Run{' '}
          <code className="font-mono">npx web-push generate-vapid-keys</code> and add to .env.
        </div>
      )}

      {/* Feed */}
      {scans.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white py-20 text-center">
          <ShieldCheck className="h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-500">No gate scans yet</p>
          <p className="mt-1 text-xs text-slate-400">
            Scans appear here in real time as guards verify QR passes at the gate.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {scans.map((scan) => (
            <ScanRow key={scan.id} scan={scan} isNew={newIds.has(scan.id)} />
          ))}
        </div>
      )}
    </div>
  )
}
