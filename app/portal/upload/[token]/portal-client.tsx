'use client'

import { useRef, useState, useMemo, useTransition, useEffect } from 'react'
import {
  Upload, Loader2, ShieldCheck, ShieldX, ShieldAlert,
  CheckCircle2, AlertCircle, FileText, ChevronRight,
  ClipboardList, Lock, Activity, AlertTriangle, Languages,
  HardHat, Flame,
} from 'lucide-react'
import {
  uploadAndVerify,
  reAuditDoc,
  submitPortal,
  uploadSafetyDoc,
  reAuditSafetyDoc,
} from './portal-actions'
import type {
  PortalDashboardData, PortalDoc, UploadAndVerifyResult,
  SafetyDoc, UploadSafetyDocResult,
} from './portal-actions'
import type { DocumentType, SafetyDocType } from '@/types/database.types'
import type { Locale, PortalDict } from '@/lib/i18n'
import enDict from '@/messages/en.json'
import arDict from '@/messages/ar.json'

// ── Constants ─────────────────────────────────────────────────────

const TODAY = new Date().toISOString().split('T')[0]
const REQUIRED_TYPES: DocumentType[] = ['COI', 'Certified Payroll', 'W9']
const SAFETY_DOC_TYPES: SafetyDocType[] = ['RAMS', 'Safety Policy', 'Training Records']
const STORAGE_KEY = 'hhc-portal-locale'

// ── Helpers ───────────────────────────────────────────────────────

function isDocExpired(doc: PortalDoc): boolean {
  return !!doc.expiry_date && doc.expiry_date < TODAY
}

function extractAiFeedback(notes: string | null): string[] {
  if (!notes) return []
  const idx = notes.indexOf('Flagged reasons:')
  if (idx === -1) return []
  return notes
    .slice(idx + 'Flagged reasons:'.length)
    .split('\n')
    .map((line) => line.replace(/^\s*•\s*/, '').trim())
    .filter(Boolean)
}

function scoreColor(score: number) {
  if (score < 30) return { bar: 'bg-emerald-500', text: 'text-emerald-400' }
  if (score < 70) return { bar: 'bg-amber-500', text: 'text-amber-400' }
  return { bar: 'bg-red-500', text: 'text-red-400' }
}

function getDocConfig(t: PortalDict): Record<DocumentType, { label: string; description: string }> {
  return {
    COI:               { label: t.coi_label,               description: t.coi_desc },
    'Certified Payroll': { label: t.certified_payroll_label, description: t.certified_payroll_desc },
    W9:                { label: t.w9_label,                description: t.w9_desc },
  }
}

function getSafetyDocConfig(t: PortalDict): Record<SafetyDocType, { label: string; description: string }> {
  return {
    'RAMS':             { label: t.rams_label,             description: t.rams_desc },
    'Safety Policy':    { label: t.safety_policy_label,    description: t.safety_policy_desc },
    'Training Records': { label: t.training_records_label, description: t.training_records_desc },
  }
}

function extractRejectionReasons(aiFeedback: string | null): string[] {
  if (!aiFeedback) return []
  const idx = aiFeedback.indexOf('Compliance gaps:')
  if (idx === -1) return []
  return aiFeedback
    .slice(idx + 'Compliance gaps:'.length)
    .split('\n')
    .map((line) => line.replace(/^\s*•\s*/, '').trim())
    .filter(Boolean)
}

function extractHazardsFromFeedback(aiFeedback: string | null, identified_hazards: string[]): string[] {
  if (identified_hazards.length > 0) return identified_hazards
  if (!aiFeedback) return []
  const idx = aiFeedback.indexOf('Identified hazards:')
  if (idx === -1) return []
  return aiFeedback
    .slice(idx + 'Identified hazards:'.length)
    .split('\n')
    .map((line) => line.replace(/^\s*•\s*/, '').trim())
    .filter(Boolean)
}

const RISK_LEVEL_COLOR: Record<string, string> = {
  Low:      'bg-emerald-950 text-emerald-400 ring-emerald-800',
  Medium:   'bg-amber-950 text-amber-400 ring-amber-800',
  High:     'bg-orange-950 text-orange-400 ring-orange-800',
  Critical: 'bg-red-950 text-red-400 ring-red-800',
}

// ── Risk Score Bar ────────────────────────────────────────────────

function RiskScoreBar({ score, t }: { score: number; t: PortalDict }) {
  const c = scoreColor(score)
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] uppercase tracking-wider text-slate-600 shrink-0">{t.risk}</span>
      <div className="flex-1 h-1 rounded-full bg-slate-700/80">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${c.bar}`}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
      <span className={`text-xs font-mono font-bold tabular-nums w-6 text-right ${c.text}`}>
        {score}
      </span>
    </div>
  )
}

// ── Site Access Banner ────────────────────────────────────────────

function SiteAccessBanner({
  riskScore,
  companyName,
  blockingIssues,
  qrCodeDataUrl,
  t,
  dir,
}: {
  riskScore: number
  companyName: string
  blockingIssues: string[]
  qrCodeDataUrl: string
  t: PortalDict
  dir: 'ltr' | 'rtl'
}) {
  const isAr = dir === 'rtl'
  const accessStatus = riskScore < 30 ? 'GRANTED' : riskScore > 70 ? 'REVOKED' : 'REVIEW'

  if (accessStatus === 'GRANTED') {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-emerald-950 ring-1 ring-emerald-800 shadow-2xl shadow-emerald-950/50">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_0%_0%,rgba(16,185,129,0.18),transparent)]" />
        <div className="relative flex flex-col sm:flex-row items-center gap-6 p-7 sm:p-8">
          <div className="flex-1 text-center sm:text-start">
            <div className="mb-2 flex items-center gap-2 justify-center sm:justify-start">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-600">
                {t.all_systems_verified}
              </span>
            </div>
            <div className="leading-none mb-1">
              {isAr ? (
                <>
                  <p className="font-arabic text-[2.6rem] font-black text-emerald-400 leading-none">
                    {t.access_word_1}
                  </p>
                  <p className="font-arabic text-[2.6rem] font-black text-white leading-none mb-3">
                    {t.access_granted}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[2.75rem] font-black tracking-tight text-emerald-400 leading-none">
                    {t.access_word_1}
                  </p>
                  <p className="text-[2.75rem] font-black tracking-tight text-white leading-none mb-3">
                    {t.access_granted}
                  </p>
                </>
              )}
            </div>
            <p className="text-sm text-emerald-700/80">
              {companyName} · Risk Score {riskScore}
            </p>
            <div className="mt-3 flex items-center gap-2 justify-center sm:justify-start">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span className="text-xs text-emerald-700">{t.present_qr}</span>
            </div>
          </div>

          <div className="shrink-0 flex flex-col items-center gap-2">
            <div className="rounded-xl bg-white p-3 shadow-xl ring-2 ring-emerald-500/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrCodeDataUrl} alt="Site Access QR Code" width={164} height={164} />
            </div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-emerald-800/70">
              {t.site_pass_ttl}
            </p>
          </div>
        </div>
        <div className="border-t border-emerald-900/70 bg-emerald-950/60 px-7 py-3">
          <RiskScoreBar score={riskScore} t={t} />
        </div>
      </div>
    )
  }

  if (accessStatus === 'REVOKED') {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-red-950 ring-1 ring-red-800/80 shadow-2xl shadow-red-950/50">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_100%_0%,rgba(239,68,68,0.18),transparent)]" />
        <div className="relative p-7 sm:p-8">
          <div className="mb-2 flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-red-600">
              {t.site_access_blocked}
            </span>
          </div>
          <div className="leading-none mb-4">
            {isAr ? (
              <>
                <p className="font-arabic text-[2.6rem] font-black text-red-400 leading-none">
                  {t.access_word_1}
                </p>
                <p className="font-arabic text-[2.6rem] font-black text-white leading-none">
                  {t.access_revoked}
                </p>
              </>
            ) : (
              <>
                <p className="text-[2.75rem] font-black tracking-tight text-red-400 leading-none">
                  {t.access_word_1}
                </p>
                <p className="text-[2.75rem] font-black tracking-tight text-white leading-none">
                  {t.access_revoked}
                </p>
              </>
            )}
          </div>

          {blockingIssues.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-red-700">
                {t.blocking_issues}
              </p>
              {blockingIssues.map((issue, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <ShieldX className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                  <span className="text-sm text-red-300/90">{issue}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="border-t border-red-900/70 bg-red-950/60 px-7 py-3">
          <RiskScoreBar score={riskScore} t={t} />
        </div>
      </div>
    )
  }

  // 30–70: Under Review
  return (
    <div className="relative overflow-hidden rounded-2xl bg-amber-950/40 ring-1 ring-amber-800/50 shadow-xl">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(245,158,11,0.12),transparent)]" />
      <div className="relative p-7 sm:p-8">
        <div className="mb-2 flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-amber-600">
            {t.compliance_in_progress}
          </span>
        </div>
        <div className="leading-none mb-3">
          {isAr ? (
            <>
              <p className="font-arabic text-[2.6rem] font-black text-amber-400 leading-none">
                {t.under}
              </p>
              <p className="font-arabic text-[2.6rem] font-black text-white leading-none">
                {t.review}
              </p>
            </>
          ) : (
            <>
              <p className="text-[2.75rem] font-black tracking-tight text-amber-400 leading-none">
                {t.under}
              </p>
              <p className="text-[2.75rem] font-black tracking-tight text-white leading-none">
                {t.review}
              </p>
            </>
          )}
        </div>
        <p className="text-sm text-amber-700/80">
          {companyName} · {t.fix_issues}
        </p>
      </div>
      <div className="border-t border-amber-900/50 bg-amber-950/30 px-7 py-3">
        <RiskScoreBar score={riskScore} t={t} />
      </div>
    </div>
  )
}

// ── Fix Doc Card ──────────────────────────────────────────────────

type FixCardState =
  | { phase: 'idle' }
  | { phase: 'uploading'; progress: number }
  | { phase: 'done'; result: UploadAndVerifyResult }
  | { phase: 'error'; message: string }

function FixDocCard({
  doc,
  inviteToken,
  t,
  docConfig,
  onVerified,
}: {
  doc: PortalDoc
  inviteToken: string
  t: PortalDict
  docConfig: Record<DocumentType, { label: string; description: string }>
  onVerified: (docId: string, result: UploadAndVerifyResult) => void
}) {
  const [state, setState] = useState<FixCardState>({ phase: 'idle' })
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const isExpired = isDocExpired(doc)
  const aiFeedback = extractAiFeedback(doc.notes)
  const config = docConfig[doc.doc_type]

  async function handleFile(file: File) {
    setState({ phase: 'uploading', progress: 0 })

    intervalRef.current = setInterval(() => {
      setState((prev) => {
        if (prev.phase !== 'uploading') return prev
        return { phase: 'uploading', progress: Math.min(prev.progress + 3, 84) }
      })
    }, 180)

    const fd = new FormData()
    fd.append('file', file)

    try {
      const result = await reAuditDoc(inviteToken, doc.id, fd)
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
      setState({ phase: 'done', result })
      if (result.ok) onVerified(doc.id, result)
    } catch {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
      setState({ phase: 'error', message: t.upload_failed })
    }
  }

  const isUploading = state.phase === 'uploading'
  const isDone = state.phase === 'done'
  const isError = state.phase === 'error'
  const resultStatus = isDone ? state.result.audit_status : null

  const borderColor = isDone
    ? resultStatus === 'approved'
      ? 'border-emerald-700 bg-emerald-950/20'
      : 'border-amber-800/60 bg-amber-950/20'
    : 'border-red-900/60 bg-red-950/20'

  return (
    <div className={`rounded-xl border p-5 transition-colors duration-300 ${borderColor}`}>
      <div className="flex items-start gap-3 mb-3">
        <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
          isDone && resultStatus === 'approved'
            ? 'bg-emerald-500'
            : 'bg-red-900/60 ring-1 ring-red-800'
        }`}>
          {isDone && resultStatus === 'approved'
            ? <CheckCircle2 className="h-4 w-4 text-white" />
            : isExpired
            ? <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
            : <ShieldAlert className="h-3.5 w-3.5 text-red-400" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">{config.label}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            {isExpired && !isDone && (
              <span className="rounded-full bg-red-950 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-400 ring-1 ring-red-800">
                {t.expired_label} {doc.expiry_date}
              </span>
            )}
            {doc.audit_status === 'rejected' && !isDone && (
              <span className="rounded-full bg-red-950 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-400 ring-1 ring-red-800">
                {t.flagged_label}
              </span>
            )}
            {isDone && resultStatus === 'approved' && (
              <span className="rounded-full bg-emerald-950 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-400 ring-1 ring-emerald-800">
                {t.cleared_by_ai}
              </span>
            )}
            {isDone && resultStatus === 'rejected' && (
              <span className="rounded-full bg-amber-950 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-400 ring-1 ring-amber-800">
                {t.still_flagged_label}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* AI Feedback (initial notes from DB) */}
      {!isDone && aiFeedback.length > 0 && (
        <div className="mb-3 rounded-lg bg-slate-900/60 px-3.5 py-3 ring-1 ring-slate-700/60">
          <div className="mb-1.5 flex items-center gap-1.5">
            <Activity className="h-3 w-3 text-slate-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {t.ai_audit_feedback}
            </span>
          </div>
          <ul className="space-y-1">
            {aiFeedback.map((fb, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 text-amber-500">›</span>
                <span className="text-xs text-amber-300/90">{fb}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Post-upload flag reasons */}
      {isDone && (state.result.flag_reasons ?? []).length > 0 && (
        <div className="mb-3 rounded-lg bg-slate-900/60 px-3.5 py-3 ring-1 ring-slate-700/60">
          <div className="mb-1.5 flex items-center gap-1.5">
            <Activity className="h-3 w-3 text-amber-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
              {t.still_flagged}
            </span>
          </div>
          <ul className="space-y-1">
            {(state.result.flag_reasons ?? []).map((fb, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 text-amber-500">›</span>
                <span className="text-xs text-amber-300/90">{fb}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isDone && state.result.ok && resultStatus === 'approved' && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-emerald-950/50 px-3.5 py-2.5 ring-1 ring-emerald-800/50">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
          <p className="text-sm text-emerald-400 font-medium">{t.verified_by_ai}</p>
        </div>
      )}

      {isError && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-950/50 px-3.5 py-2.5 ring-1 ring-red-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <p className="text-sm text-red-300">{state.phase === 'error' ? state.message : ''}</p>
        </div>
      )}

      {isDone && !state.result.ok && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-950/50 px-3.5 py-2.5 ring-1 ring-red-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <p className="text-sm text-red-300">{state.result.error}</p>
        </div>
      )}

      {/* Progress bar */}
      {isUploading && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin text-amber-400" />
              <span className="text-xs text-amber-400 font-medium">{t.ai_auditing}</span>
            </div>
            <span className="text-xs font-mono text-amber-600">{state.progress}%</span>
          </div>
          <div className="h-1 rounded-full bg-slate-700">
            <div
              className="h-full rounded-full bg-amber-500 transition-all duration-300"
              style={{ width: `${state.progress}%` }}
            />
          </div>
        </div>
      )}

      {!isDone && !isUploading && (
        <div
          className="relative flex cursor-pointer items-center justify-center gap-2.5 rounded-lg border-2 border-dashed border-red-800/60 px-4 py-3 transition-colors hover:border-amber-700 hover:bg-amber-950/20"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-4 w-4 text-slate-400 shrink-0" />
          <span className="text-sm font-medium text-slate-300">{t.upload_corrected}</span>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleFile(f)
              e.target.value = ''
            }}
          />
        </div>
      )}

      {isDone && (
        <>
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-700 px-4 py-2.5 text-sm text-slate-500 hover:border-slate-600 hover:text-slate-400 transition-colors"
            onClick={() => { setState({ phase: 'idle' }); setTimeout(() => inputRef.current?.click(), 0) }}
          >
            <Upload className="h-3.5 w-3.5" />
            {t.replace_file}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleFile(f)
              e.target.value = ''
            }}
          />
        </>
      )}
    </div>
  )
}

// ── New Doc Card ──────────────────────────────────────────────────

type NewDocCardState =
  | { phase: 'idle' }
  | { phase: 'uploading'; progress: number }
  | { phase: 'done'; result: UploadAndVerifyResult }
  | { phase: 'error'; message: string }

function NewDocCard({
  docType,
  inviteToken,
  t,
  docConfig,
  onUploaded,
}: {
  docType: DocumentType
  inviteToken: string
  t: PortalDict
  docConfig: Record<DocumentType, { label: string; description: string }>
  onUploaded: (result: UploadAndVerifyResult) => void
}) {
  const [state, setState] = useState<NewDocCardState>({ phase: 'idle' })
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const config = docConfig[docType]

  async function handleFile(file: File) {
    setState({ phase: 'uploading', progress: 0 })

    intervalRef.current = setInterval(() => {
      setState((prev) => {
        if (prev.phase !== 'uploading') return prev
        return { phase: 'uploading', progress: Math.min(prev.progress + 3, 84) }
      })
    }, 180)

    const fd = new FormData()
    fd.append('file', file)
    fd.append('doc_type', docType)
    fd.append('doc_name', `${config.label} — ${file.name}`)

    try {
      const result = await uploadAndVerify(inviteToken, fd)
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
      setState({ phase: 'done', result })
      if (result.ok) onUploaded(result)
    } catch {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
      setState({ phase: 'error', message: t.upload_failed })
    }
  }

  const isUploading = state.phase === 'uploading'
  const isDone = state.phase === 'done'
  const isError = state.phase === 'error'
  const resultStatus = isDone ? state.result.audit_status : null

  return (
    <div className={`rounded-xl border p-5 transition-colors duration-300 ${
      isDone
        ? resultStatus === 'approved'
          ? 'border-emerald-700 bg-emerald-950/20'
          : 'border-amber-800/60 bg-amber-950/20'
        : 'border-slate-700 bg-slate-800/40'
    }`}>
      <div className="flex items-start gap-3 mb-3">
        <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
          isDone && resultStatus === 'approved' ? 'bg-emerald-500' : 'bg-slate-700 ring-1 ring-slate-600'
        }`}>
          {isDone && resultStatus === 'approved'
            ? <CheckCircle2 className="h-3.5 w-3.5 text-white" />
            : <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
          }
        </div>
        <div>
          <p className="text-sm font-semibold text-white">{config.label}</p>
          <p className="mt-0.5 text-xs text-slate-400">{config.description}</p>
        </div>
      </div>

      {isDone && state.result.ok && resultStatus === 'approved' && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-emerald-950/50 px-3.5 py-2.5 ring-1 ring-emerald-800/50">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
          <p className="text-sm text-emerald-400 font-medium">{t.verified_by_ai}</p>
          {state.result.expiry_date && (
            <span className="ms-auto text-xs text-emerald-700">Exp: {state.result.expiry_date}</span>
          )}
        </div>
      )}

      {isDone && state.result.ok && resultStatus === 'rejected' && (
        <div className="mb-3 space-y-1.5 rounded-lg bg-amber-950/40 px-3.5 py-3 ring-1 ring-amber-800/50">
          <div className="flex items-center gap-1.5 mb-1">
            <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs font-semibold text-amber-400">{t.still_flagged}</span>
          </div>
          {(state.result.flag_reasons ?? []).map((r, i) => (
            <p key={i} className="text-xs text-amber-500">· {r}</p>
          ))}
        </div>
      )}

      {isError && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-950/50 px-3.5 py-2.5 ring-1 ring-red-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <p className="text-sm text-red-300">{state.phase === 'error' ? state.message : ''}</p>
        </div>
      )}

      {isUploading && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin text-amber-400" />
              <span className="text-xs text-amber-400 font-medium">{t.ai_auditing}</span>
            </div>
            <span className="text-xs font-mono text-amber-600">{state.progress}%</span>
          </div>
          <div className="h-1 rounded-full bg-slate-700">
            <div
              className="h-full rounded-full bg-amber-500 transition-all duration-300"
              style={{ width: `${state.progress}%` }}
            />
          </div>
        </div>
      )}

      {!isUploading && (
        <div
          className={`relative flex cursor-pointer items-center justify-center gap-2.5 rounded-lg border-2 border-dashed px-4 py-3 transition-colors ${
            isDone
              ? 'border-slate-700 opacity-60 hover:opacity-80'
              : 'border-slate-600 hover:border-amber-600 hover:bg-amber-950/20'
          }`}
          onClick={() => inputRef.current?.click()}
        >
          {isDone ? <FileText className="h-4 w-4 text-slate-500" /> : <Upload className="h-4 w-4 text-slate-400" />}
          <span className="text-sm font-medium text-slate-400">
            {isDone ? t.replace_file : t.upload_document}
          </span>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleFile(f)
              e.target.value = ''
            }}
          />
        </div>
      )}
    </div>
  )
}

// ── Safety Status Card ────────────────────────────────────────────
// Shows an existing safety doc with status, hazard pills, and re-upload for Rejected.

type SafetyCardState =
  | { phase: 'idle' }
  | { phase: 'uploading'; progress: number }
  | { phase: 'done'; result: UploadSafetyDocResult }
  | { phase: 'error'; message: string }

function SafetyStatusCard({
  doc,
  inviteToken,
  t,
  safetyDocConfig,
  onReAudited,
}: {
  doc: SafetyDoc
  inviteToken: string
  t: PortalDict
  safetyDocConfig: Record<SafetyDocType, { label: string; description: string }>
  onReAudited: (docId: string, result: UploadSafetyDocResult) => void
}) {
  const [state, setState] = useState<SafetyCardState>({ phase: 'idle' })
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const config = safetyDocConfig[doc.doc_type]
  const isDone = state.phase === 'done'
  const isUploading = state.phase === 'uploading'
  const isError = state.phase === 'error'

  const displayDoc: SafetyDoc = isDone && state.result.doc ? state.result.doc : doc
  const rejectionReasons = extractRejectionReasons(displayDoc.ai_feedback)
  const hazards = extractHazardsFromFeedback(displayDoc.ai_feedback, displayDoc.identified_hazards)

  async function handleReUpload(file: File) {
    setState({ phase: 'uploading', progress: 0 })
    intervalRef.current = setInterval(() => {
      setState((prev) =>
        prev.phase !== 'uploading' ? prev : { phase: 'uploading', progress: Math.min(prev.progress + 3, 84) }
      )
    }, 180)

    const fd = new FormData()
    fd.append('file', file)

    try {
      const result = await reAuditSafetyDoc(inviteToken, doc.id, fd)
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
      setState({ phase: 'done', result })
      if (result.ok) onReAudited(doc.id, result)
    } catch {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
      setState({ phase: 'error', message: t.upload_failed })
    }
  }

  const status = displayDoc.approval_status
  const borderClass =
    status === 'Approved'
      ? 'border-emerald-800/60 bg-emerald-950/20'
      : status === 'Rejected'
      ? 'border-red-900/60 bg-red-950/20'
      : 'border-slate-700 bg-slate-800/30'

  return (
    <div className={`rounded-xl border p-5 transition-colors duration-300 ${borderClass}`}>
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
          status === 'Approved'
            ? 'bg-emerald-500'
            : status === 'Rejected'
            ? 'bg-red-900/60 ring-1 ring-red-800'
            : 'bg-amber-900/60 ring-1 ring-amber-800'
        }`}>
          {status === 'Approved'
            ? <CheckCircle2 className="h-4 w-4 text-white" />
            : status === 'Rejected'
            ? <ShieldX className="h-3.5 w-3.5 text-red-400" />
            : <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">{config.label}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${
              status === 'Approved'
                ? 'bg-emerald-950 text-emerald-400 ring-emerald-800'
                : status === 'Rejected'
                ? 'bg-red-950 text-red-400 ring-red-800'
                : 'bg-amber-950 text-amber-500 ring-amber-800'
            }`}>
              {status === 'Approved' ? t.approved : status === 'Rejected' ? t.rejected : t.under_review}
            </span>
            {displayDoc.risk_level && (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${RISK_LEVEL_COLOR[displayDoc.risk_level] ?? ''}`}>
                {t.overall_risk_level}: {displayDoc.risk_level}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Approved: show compliance checks + hazard pills */}
      {status === 'Approved' && (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium ring-1 ${
              displayDoc.has_risk_matrix
                ? 'bg-emerald-950/60 text-emerald-400 ring-emerald-800/60'
                : 'bg-slate-800 text-slate-500 ring-slate-700'
            }`}>
              <CheckCircle2 className="h-3 w-3" />
              {t.risk_matrix_label} — {displayDoc.has_risk_matrix ? t.present : t.missing}
            </span>
            <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium ring-1 ${
              displayDoc.has_emergency_procedures
                ? 'bg-emerald-950/60 text-emerald-400 ring-emerald-800/60'
                : 'bg-slate-800 text-slate-500 ring-slate-700'
            }`}>
              <CheckCircle2 className="h-3 w-3" />
              {t.emergency_procedures_label} — {displayDoc.has_emergency_procedures ? t.present : t.missing}
            </span>
          </div>
          {hazards.length > 0 && (
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {t.hazards_identified}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {hazards.map((hazard, i) => (
                  <span key={i} className="inline-flex items-center gap-1 rounded-full bg-amber-950/50 px-2.5 py-1 text-[11px] font-medium text-amber-400 ring-1 ring-amber-800/60">
                    <Flame className="h-2.5 w-2.5 shrink-0" />
                    {hazard}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Rejected: show compliance gaps + re-upload */}
      {status === 'Rejected' && !isUploading && (
        <>
          {rejectionReasons.length > 0 && (
            <div className="mb-3 rounded-lg bg-slate-900/60 px-3.5 py-3 ring-1 ring-slate-700/60">
              <div className="mb-1.5 flex items-center gap-1.5">
                <Activity className="h-3 w-3 text-red-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-600">
                  {t.safety_issues_label}
                </span>
              </div>
              <ul className="space-y-1">
                {rejectionReasons.map((r, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-0.5 shrink-0 text-red-500">›</span>
                    <span className="text-xs text-red-300/90">{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div
            className="relative flex cursor-pointer items-center justify-center gap-2.5 rounded-lg border-2 border-dashed border-red-800/60 px-4 py-3 transition-colors hover:border-amber-700 hover:bg-amber-950/20"
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="text-sm font-medium text-slate-300">{t.replace_safety_doc}</span>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleReUpload(f)
                e.target.value = ''
              }}
            />
          </div>
        </>
      )}

      {/* Progress bar during re-upload */}
      {isUploading && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin text-amber-400" />
              <span className="text-xs text-amber-400 font-medium">{t.safety_ai_analyzing}</span>
            </div>
            <span className="text-xs font-mono text-amber-600">{state.phase === 'uploading' ? state.progress : 0}%</span>
          </div>
          <div className="h-1 rounded-full bg-slate-700">
            <div
              className="h-full rounded-full bg-amber-500 transition-all duration-300"
              style={{ width: `${state.phase === 'uploading' ? state.progress : 0}%` }}
            />
          </div>
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-2 rounded-lg bg-red-950/50 px-3.5 py-2.5 ring-1 ring-red-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <p className="text-sm text-red-300">{state.phase === 'error' ? state.message : ''}</p>
        </div>
      )}

      {/* Under Review: neutral indicator */}
      {status === 'Under Review' && !isUploading && (
        <p className="text-xs text-amber-600/70 italic">{t.under_review} — {t.safety_ai_analyzing}</p>
      )}
    </div>
  )
}

// ── Safety Upload Card ────────────────────────────────────────────
// Upload card for a safety doc type not yet submitted.

function SafetyUploadCard({
  docType,
  inviteToken,
  t,
  safetyDocConfig,
  onUploaded,
}: {
  docType: SafetyDocType
  inviteToken: string
  t: PortalDict
  safetyDocConfig: Record<SafetyDocType, { label: string; description: string }>
  onUploaded: (result: UploadSafetyDocResult) => void
}) {
  const [state, setState] = useState<SafetyCardState>({ phase: 'idle' })
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const config = safetyDocConfig[docType]

  async function handleFile(file: File) {
    setState({ phase: 'uploading', progress: 0 })
    intervalRef.current = setInterval(() => {
      setState((prev) =>
        prev.phase !== 'uploading' ? prev : { phase: 'uploading', progress: Math.min(prev.progress + 3, 84) }
      )
    }, 180)

    const fd = new FormData()
    fd.append('file', file)
    fd.append('doc_type', docType)
    fd.append('doc_name', `${config.label} — ${file.name}`)

    try {
      const result = await uploadSafetyDoc(inviteToken, fd)
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
      setState({ phase: 'done', result })
      if (result.ok) onUploaded(result)
    } catch {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
      setState({ phase: 'error', message: t.upload_failed })
    }
  }

  const isDone = state.phase === 'done'
  const isUploading = state.phase === 'uploading'
  const isError = state.phase === 'error'
  const resultStatus = isDone && state.result.doc ? state.result.doc.approval_status : null

  return (
    <div className={`rounded-xl border p-5 transition-colors duration-300 ${
      isDone
        ? resultStatus === 'Approved'
          ? 'border-emerald-700 bg-emerald-950/20'
          : 'border-amber-800/60 bg-amber-950/20'
        : 'border-slate-700 bg-slate-800/40'
    }`}>
      <div className="flex items-start gap-3 mb-3">
        <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
          isDone && resultStatus === 'Approved' ? 'bg-emerald-500' : 'bg-slate-700 ring-1 ring-slate-600'
        }`}>
          {isDone && resultStatus === 'Approved'
            ? <CheckCircle2 className="h-3.5 w-3.5 text-white" />
            : <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
          }
        </div>
        <div>
          <p className="text-sm font-semibold text-white">{config.label}</p>
          <p className="mt-0.5 text-xs text-slate-400">{config.description}</p>
        </div>
      </div>

      {isDone && state.result.ok && resultStatus === 'Approved' && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-emerald-950/50 px-3.5 py-2.5 ring-1 ring-emerald-800/50">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
          <p className="text-sm text-emerald-400 font-medium">{t.safety_compliant}</p>
        </div>
      )}

      {isDone && state.result.ok && resultStatus === 'Rejected' && (
        <div className="mb-3 space-y-1.5 rounded-lg bg-amber-950/40 px-3.5 py-3 ring-1 ring-amber-800/50">
          <div className="flex items-center gap-1.5 mb-1">
            <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs font-semibold text-amber-400">{t.safety_issues_label}</span>
          </div>
          {extractRejectionReasons(state.result.doc?.ai_feedback ?? null).map((r, i) => (
            <p key={i} className="text-xs text-amber-500">· {r}</p>
          ))}
        </div>
      )}

      {isError && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-950/50 px-3.5 py-2.5 ring-1 ring-red-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <p className="text-sm text-red-300">{state.phase === 'error' ? state.message : ''}</p>
        </div>
      )}

      {isUploading && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin text-amber-400" />
              <span className="text-xs text-amber-400 font-medium">{t.safety_ai_analyzing}</span>
            </div>
            <span className="text-xs font-mono text-amber-600">{state.progress}%</span>
          </div>
          <div className="h-1 rounded-full bg-slate-700">
            <div
              className="h-full rounded-full bg-amber-500 transition-all duration-300"
              style={{ width: `${state.progress}%` }}
            />
          </div>
        </div>
      )}

      {!isUploading && (
        <div
          className={`relative flex cursor-pointer items-center justify-center gap-2.5 rounded-lg border-2 border-dashed px-4 py-3 transition-colors ${
            isDone
              ? 'border-slate-700 opacity-60 hover:opacity-80'
              : 'border-slate-600 hover:border-amber-600 hover:bg-amber-950/20'
          }`}
          onClick={() => inputRef.current?.click()}
        >
          {isDone ? <FileText className="h-4 w-4 text-slate-500" /> : <Upload className="h-4 w-4 text-slate-400" />}
          <span className="text-sm font-medium text-slate-400">
            {isDone ? t.replace_safety_doc : t.upload_safety_doc}
          </span>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleFile(f)
              e.target.value = ''
            }}
          />
        </div>
      )}
    </div>
  )
}

// ── Prequal Form ──────────────────────────────────────────────────

function PrequalForm({
  inviteToken,
  t,
  onSubmitted,
}: {
  inviteToken: string
  t: PortalDict
  onSubmitted: () => void
}) {
  const [hadIncident, setHadIncident] = useState(false)
  const [bondingCapacity, setBondingCapacity] = useState('')
  const [tradeAccreditation, setTradeAccreditation] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, startSubmitting] = useTransition()

  function handleSubmit() {
    setSubmitError(null)
    startSubmitting(async () => {
      const result = await submitPortal(inviteToken, hadIncident, bondingCapacity, tradeAccreditation)
      if (result.ok) {
        onSubmitted()
      } else {
        setSubmitError(result.error ?? 'Submission failed.')
      }
    })
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-700 bg-slate-800/40 p-5">
      <div>
        <p className="mb-2 text-sm font-medium text-slate-200">{t.site_incident_q}</p>
        <div className="flex gap-5">
          {([{ label: t.yes, value: true }, { label: t.no, value: false }] as const).map(({ label, value }) => (
            <label key={label} className="flex cursor-pointer items-center gap-2.5">
              <button
                type="button"
                onClick={() => setHadIncident(value)}
                className={`flex h-4 w-4 items-center justify-center rounded-full border-2 transition-colors ${
                  hadIncident === value
                    ? 'border-amber-400 bg-amber-400'
                    : 'border-slate-500 bg-transparent'
                }`}
              >
                {hadIncident === value && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
              </button>
              <span className="text-sm text-slate-300">{label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-200">{t.bonding_capacity}</label>
        <input
          type="text"
          placeholder={t.bonding_placeholder}
          value={bondingCapacity}
          onChange={(e) => setBondingCapacity(e.target.value)}
          className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-200">{t.trade_accreditation}</label>
        <input
          type="text"
          placeholder={t.trade_placeholder}
          value={tradeAccreditation}
          onChange={(e) => setTradeAccreditation(e.target.value)}
          className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
        />
      </div>

      {submitError && (
        <div className="flex items-center gap-2 rounded-lg bg-red-950/60 px-4 py-3 ring-1 ring-red-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <p className="text-sm text-red-300">{submitError}</p>
        </div>
      )}

      <button
        type="button"
        disabled={isSubmitting}
        onClick={handleSubmit}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-3.5 text-sm font-bold text-slate-900 transition-all hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {t.submitting}
          </>
        ) : (
          <>
            {t.submit_prequal}
            <ChevronRight className="h-4 w-4" />
          </>
        )}
      </button>
    </div>
  )
}

// ── Main Portal Client ────────────────────────────────────────────

export function PortalClient({
  inviteToken,
  data,
}: {
  inviteToken: string
  data: PortalDashboardData
}) {
  const [locale, setLocaleState] = useState<Locale>('en')
  const [riskScore, setRiskScore] = useState(data.riskScore)
  const [docs, setDocs] = useState<PortalDoc[]>(data.complianceDocs)
  const [safetyDocs, setSafetyDocs] = useState<SafetyDoc[]>(data.safetyDocs)
  const [prequalSubmitted, setPrequalSubmitted] = useState(data.prequalSubmitted)
  const [showPrequalForm, setShowPrequalForm] = useState(false)

  // Hydrate locale from localStorage after mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null
    if (stored === 'ar' || stored === 'en') setLocaleState(stored)
  }, [])

  const t = locale === 'ar' ? (arDict.portal as PortalDict) : (enDict.portal as PortalDict)
  const dir: 'ltr' | 'rtl' = locale === 'ar' ? 'rtl' : 'ltr'
  const isAr = dir === 'rtl'

  const docConfig = useMemo(() => getDocConfig(t), [t])
  const safetyDocConfig = useMemo(() => getSafetyDocConfig(t), [t])

  // Most recent safety doc per type
  const safetyDocByType = useMemo(() => {
    const map = new Map<SafetyDocType, SafetyDoc>()
    for (const doc of safetyDocs) {
      if (!map.has(doc.doc_type)) map.set(doc.doc_type, doc)
    }
    return map
  }, [safetyDocs])

  function toggleLocale() {
    const next: Locale = locale === 'en' ? 'ar' : 'en'
    setLocaleState(next)
    localStorage.setItem(STORAGE_KEY, next)
  }

  // Most recent doc per type (server returns DESC)
  const docByType = useMemo(() => {
    const map = new Map<DocumentType, PortalDoc>()
    for (const doc of docs) {
      if (!map.has(doc.doc_type)) map.set(doc.doc_type, doc)
    }
    return map
  }, [docs])

  const fixDocs = useMemo(
    () => [...docByType.values()].filter((doc) => doc.audit_status === 'rejected' || isDocExpired(doc)),
    [docByType],
  )

  const missingTypes = useMemo(
    () => REQUIRED_TYPES.filter((t) => !docByType.has(t)),
    [docByType],
  )

  const verifiedTypes = useMemo(
    () => REQUIRED_TYPES.filter((type) => docByType.get(type)?.audit_status === 'approved'),
    [docByType],
  )

  const blockingIssues = useMemo(() => {
    const issues: string[] = []
    for (const doc of fixDocs) {
      const feedback = extractAiFeedback(doc.notes)
      if (feedback.length > 0) {
        feedback.forEach((fb) => issues.push(`${docConfig[doc.doc_type].label}: ${fb}`))
      } else if (doc.audit_status === 'rejected') {
        issues.push(`${docConfig[doc.doc_type].label} ${t.flagged_label.toLowerCase()}`)
      }
      if (isDocExpired(doc)) {
        issues.push(`${docConfig[doc.doc_type].label} ${t.expired_label.toLowerCase()} ${doc.expiry_date}`)
      }
    }
    if (!prequalSubmitted) issues.push(t.prequal_form)
    return issues
  }, [fixDocs, prequalSubmitted, docConfig, t])

  function handleVerified(docId: string, result: UploadAndVerifyResult) {
    setDocs((prev) =>
      prev.map((d) =>
        d.id === docId
          ? {
              ...d,
              audit_status: result.audit_status!,
              expiry_date: result.expiry_date ?? d.expiry_date,
              notes: result.updated_notes ?? d.notes,
            }
          : d,
      ),
    )
    if (result.updated_risk_score !== undefined) setRiskScore(result.updated_risk_score)
  }

  function handleNewUploaded(result: UploadAndVerifyResult) {
    if (!result.doc_id || !result.doc_type) return
    const newDoc: PortalDoc = {
      id: result.doc_id,
      doc_type: result.doc_type,
      audit_status: result.audit_status ?? 'pending',
      expiry_date: result.expiry_date ?? null,
      notes: result.updated_notes ?? null,
    }
    setDocs((prev) => [newDoc, ...prev])
    if (result.updated_risk_score !== undefined) setRiskScore(result.updated_risk_score)
  }

  function handleSafetyUploaded(result: UploadSafetyDocResult) {
    if (!result.doc) return
    setSafetyDocs((prev) => [result.doc!, ...prev])
    if (result.updated_risk_score !== undefined) setRiskScore(result.updated_risk_score)
  }

  function handleSafetyReAudited(docId: string, result: UploadSafetyDocResult) {
    if (!result.doc) return
    setSafetyDocs((prev) => prev.map((d) => (d.id === docId ? result.doc! : d)))
    if (result.updated_risk_score !== undefined) setRiskScore(result.updated_risk_score)
  }

  return (
    <div dir={dir} className="mx-auto max-w-3xl px-4 sm:px-6 pb-20 pt-5 space-y-8">
      {/* ── Language switcher + portal subtitle ── */}
      <div className="flex items-center justify-between">
        <p className={`text-[10px] uppercase tracking-[0.18em] text-slate-500 ${isAr ? 'font-arabic' : ''}`}>
          {t.self_correction_portal} · {data.projectName}
        </p>
        <button
          type="button"
          onClick={toggleLocale}
          className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-amber-600 hover:text-amber-400"
          aria-label="Switch language"
        >
          <Languages className="h-3.5 w-3.5" />
          {isAr
            ? <span>English</span>
            : <span className="font-arabic" lang="ar">عربي</span>
          }
        </button>
      </div>

      {/* ── Site Access Banner ── */}
      <SiteAccessBanner
        riskScore={riskScore}
        companyName={data.companyName}
        blockingIssues={blockingIssues}
        qrCodeDataUrl={data.qrCodeDataUrl}
        t={t}
        dir={dir}
      />

      {/* ── Fix List ── */}
      {fixDocs.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-950 ring-1 ring-red-800">
              <ShieldX className="h-4 w-4 text-red-400" />
            </div>
            <div>
              <h2 className={`text-sm font-bold uppercase tracking-wider text-white ${isAr ? 'font-arabic' : ''}`}>
                {t.fix_required}
              </h2>
              <p className={`text-xs text-slate-500 ${isAr ? 'font-arabic' : ''}`}>
                {t.fix_required_desc}
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {fixDocs.map((doc) => (
              <FixDocCard
                key={doc.id}
                doc={doc}
                inviteToken={inviteToken}
                t={t}
                docConfig={docConfig}
                onVerified={handleVerified}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Missing Doc Types ── */}
      {missingTypes.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-800 ring-1 ring-slate-700">
              <Upload className="h-4 w-4 text-slate-400" />
            </div>
            <div>
              <h2 className={`text-sm font-bold uppercase tracking-wider text-white ${isAr ? 'font-arabic' : ''}`}>
                {t.upload_documents}
              </h2>
              <p className={`text-xs text-slate-500 ${isAr ? 'font-arabic' : ''}`}>
                {t.upload_not_submitted}
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {missingTypes.map((docType) => (
              <NewDocCard
                key={docType}
                docType={docType}
                inviteToken={inviteToken}
                t={t}
                docConfig={docConfig}
                onUploaded={handleNewUploaded}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Verified summary ── */}
      {verifiedTypes.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-950 ring-1 ring-emerald-800">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            </div>
            <h2 className={`text-sm font-bold uppercase tracking-wider text-white ${isAr ? 'font-arabic' : ''}`}>
              {t.verified}
            </h2>
          </div>
          <div className="divide-y divide-slate-800 rounded-xl border border-slate-700/60 bg-slate-800/20 overflow-hidden">
            {verifiedTypes.map((type) => {
              const doc = docByType.get(type)!
              return (
                <div key={type} className="flex items-center gap-3 px-5 py-3">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  <span className={`text-sm text-slate-300 flex-1 ${isAr ? 'font-arabic' : ''}`}>
                    {docConfig[type].label}
                  </span>
                  {doc.expiry_date && (
                    <span className="text-xs text-slate-600 tabular-nums">
                      Exp: {doc.expiry_date}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Safety Vault ── */}
      <section>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-950/60 ring-1 ring-amber-800/60">
            <HardHat className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <h2 className={`text-sm font-bold uppercase tracking-wider text-white ${isAr ? 'font-arabic' : ''}`}>
              {t.safety_vault}
            </h2>
            <p className={`text-xs text-slate-500 ${isAr ? 'font-arabic' : ''}`}>
              {t.safety_vault_desc}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {SAFETY_DOC_TYPES.map((docType) => {
            const existing = safetyDocByType.get(docType)
            if (existing) {
              return (
                <SafetyStatusCard
                  key={existing.id}
                  doc={existing}
                  inviteToken={inviteToken}
                  t={t}
                  safetyDocConfig={safetyDocConfig}
                  onReAudited={handleSafetyReAudited}
                />
              )
            }
            return (
              <SafetyUploadCard
                key={docType}
                docType={docType}
                inviteToken={inviteToken}
                t={t}
                safetyDocConfig={safetyDocConfig}
                onUploaded={handleSafetyUploaded}
              />
            )
          })}
        </div>
      </section>

      {/* ── Prequalification ── */}
      <section>
        <div className="mb-4 flex items-center gap-3">
          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 ${
            prequalSubmitted ? 'bg-emerald-950 ring-emerald-800' : 'bg-amber-950/60 ring-amber-800/60'
          }`}>
            <ClipboardList className={`h-4 w-4 ${prequalSubmitted ? 'text-emerald-400' : 'text-amber-400'}`} />
          </div>
          <div>
            <h2 className={`text-sm font-bold uppercase tracking-wider text-white ${isAr ? 'font-arabic' : ''}`}>
              {t.prequal_form}
            </h2>
            <p className={`text-xs text-slate-500 ${isAr ? 'font-arabic' : ''}`}>
              {t.prequal_safety}
            </p>
          </div>
        </div>

        {prequalSubmitted ? (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-800/50 bg-emerald-950/20 px-5 py-4">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
            <div>
              <p className={`text-sm font-semibold text-emerald-400 ${isAr ? 'font-arabic' : ''}`}>
                {t.prequal_submitted}
              </p>
              <p className={`text-xs text-slate-500 ${isAr ? 'font-arabic' : ''}`}>
                {t.prequal_submitted_desc}
              </p>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-3 flex items-start gap-3 rounded-xl border border-amber-800/50 bg-amber-950/20 px-5 py-4">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`text-sm font-semibold text-amber-300 ${isAr ? 'font-arabic' : ''}`}>
                    {t.required_action}
                  </p>
                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-500 ring-1 ring-amber-500/30">
                    {t.needed_to_unlock}
                  </span>
                </div>
              </div>
              {!showPrequalForm && (
                <button
                  type="button"
                  onClick={() => setShowPrequalForm(true)}
                  className={`shrink-0 flex items-center gap-1.5 rounded-lg bg-amber-500 px-3.5 py-2 text-xs font-bold text-slate-900 hover:bg-amber-400 transition-colors ${isAr ? 'font-arabic' : ''}`}
                >
                  {t.complete_now}
                  {isAr ? <ChevronRight className="h-3.5 w-3.5 rotate-180" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </button>
              )}
            </div>

            {showPrequalForm && (
              <PrequalForm
                inviteToken={inviteToken}
                t={t}
                onSubmitted={() => {
                  setPrequalSubmitted(true)
                  setShowPrequalForm(false)
                }}
              />
            )}
          </div>
        )}
      </section>

      {/* ── Footer ── */}
      <p className={`text-center text-xs text-slate-700 ${isAr ? 'font-arabic' : ''}`}>
        {t.footer}
      </p>
    </div>
  )
}
