'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Upload, AlertCircle, Loader2, AlertTriangle, CheckCircle2, Sparkles, FileText, PenLine,
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { uploadDocument } from '@/app/gc/projects/[id]/actions'
import { scanDocumentFile, type ScanResult } from '@/app/gc/projects/[id]/ai-actions'
import type { Subcontractor } from '@/types/database.types'

const DOC_TYPES = ['COI', 'W9', 'Certified Payroll'] as const

type Phase = 'idle' | 'scanning' | 'review' | 'manual'

function namesMatch(a: string, b: string): boolean {
  const norm = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim()
  return norm(a) === norm(b)
}

// ── Left panel: document preview ──────────────────────────────

function DocPreview({ file, previewUrl, phase }: {
  file: File | null
  previewUrl: string | null
  phase: Phase
}) {
  const isImage = file?.type.startsWith('image/')
  const isPdf   = file?.type === 'application/pdf'

  if (!file || !previewUrl) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
          <Upload className="h-7 w-7 text-white/60" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white/80">Drop document here</p>
          <p className="mt-1 text-xs text-white/40">PDF, PNG, or JPEG</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      {isImage && (
        <img
          src={previewUrl}
          alt="Document preview"
          className="h-full w-full object-contain p-3"
        />
      )}
      {isPdf && (
        <iframe
          src={previewUrl}
          className="h-full w-full"
          title="Document preview"
        />
      )}
      {!isImage && !isPdf && (
        <div className="flex h-full items-center justify-center gap-3">
          <FileText className="h-8 w-8 text-white/40" />
          <span className="text-sm text-white/60 truncate max-w-[160px]">{file.name}</span>
        </div>
      )}

      {/* Gemini scanning overlay */}
      {phase === 'scanning' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-slate-950/85 backdrop-blur-[2px]">
          <div className="relative flex items-center justify-center">
            <div className="absolute h-24 w-24 animate-ping rounded-full bg-indigo-500/15" />
            <div
              className="absolute h-16 w-16 animate-ping rounded-full bg-indigo-500/20"
              style={{ animationDelay: '0.3s' }}
            />
            <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 shadow-lg shadow-indigo-500/40">
              <Sparkles className="h-5 w-5 animate-pulse text-white" />
            </div>
          </div>

          <div className="text-center">
            <p className="text-sm font-semibold tracking-wide text-white">
              Gemini is Inspecting...
            </p>
            <p className="mt-1 text-xs text-indigo-300/70">
              Extracting compliance data
            </p>
          </div>

          <div
            className="animate-scan-beam absolute left-6 right-6 h-0.5 rounded-full bg-gradient-to-r from-transparent via-indigo-400 to-transparent"
            style={{ top: 0 }}
          />
        </div>
      )}
    </div>
  )
}

// ── Main dialog ────────────────────────────────────────────────

export function UploadDocumentDialog({
  projectId,
  subcontractors,
  defaultSubId,
  defaultDocType,
  open: controlledOpen,
  onOpenChange: onControlledOpenChange,
}: {
  projectId: string
  subcontractors: Subcontractor[]
  defaultSubId?: string
  defaultDocType?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const router    = useRouter()
  const inputRef  = useRef<HTMLInputElement>(null)
  const isControlled = controlledOpen !== undefined
  const [internalOpen, setInternalOpen] = useState(false)
  const open = isControlled ? controlledOpen! : internalOpen

  const [subId, setSubId]     = useState(defaultSubId ?? '')
  const [docType, setDocType] = useState(defaultDocType ?? '')
  const [file, setFile]       = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [dragging, setDragging]     = useState(false)

  const [phase, setPhase]           = useState<Phase>('idle')
  const [aiName, setAiName]         = useState<string | null>(null)
  const [aiCoverage, setAiCoverage] = useState<number | null>(null)
  const [editedCompany, setEditedCompany] = useState('')
  const [editedExpiry, setEditedExpiry]   = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  useEffect(() => {
    if (!file) { setPreviewUrl(null); return }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const selectedSub = subcontractors.find((s) => s.id === subId) ?? null
  const hasMismatch = Boolean(
    aiName && selectedSub && !namesMatch(aiName, selectedSub.company_name),
  )

  useEffect(() => {
    if (open) {
      if (defaultSubId)  setSubId(defaultSubId)
      if (defaultDocType) setDocType(defaultDocType)
    }
  }, [open, defaultSubId, defaultDocType])

  function reset() {
    setSubId(''); setDocType(''); setFile(null); setPreviewUrl(null)
    setPhase('idle'); setAiName(null); setAiCoverage(null)
    setEditedCompany(''); setEditedExpiry('')
    setSaving(false); setError(null); setDragging(false)
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    if (!isControlled) setInternalOpen(next)
    onControlledOpenChange?.(next)
  }

  async function handleFile(f: File) {
    const allowed = ['application/pdf', 'image/png', 'image/jpeg']
    if (!allowed.includes(f.type)) {
      setError('Only PDF, PNG, and JPEG files are supported.')
      return
    }
    setFile(f)
    setError(null)

    // In manual mode, accept the file without scanning
    if (phase === 'manual') return

    setPhase('scanning')

    const fd = new FormData()
    fd.append('file', f)

    const scanTimeout = new Promise<ScanResult>((resolve) =>
      setTimeout(
        () => resolve({ error: 'AI scan timed out after 30 seconds. Please try again or enter details manually.' }),
        30_000,
      ),
    )
    const result = await Promise.race([scanDocumentFile(fd), scanTimeout])

    if (result.error) {
      const isTransient = /busy|timed? out|503|rate.?limit|quota/i.test(result.error)
      if (isTransient) {
        // Revert to idle so the user can retry — don't force manual entry
        setFile(null)
        setPhase('idle')
      } else {
        // Generic AI failure — fall back to manual entry
        setPhase('manual')
      }
      setError(result.error)
      return
    }

    setAiName(result.company_name ?? null)
    setAiCoverage(result.general_liability_each_occurrence ?? null)
    setEditedCompany(result.company_name ?? '')
    setEditedExpiry(docType === 'W9' ? '' : (result.expiry_date ?? ''))
    setPhase('review')
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  function enterManualMode() {
    setPhase('manual')
    setAiName(null)
    setEditedCompany('')
    setEditedExpiry('')
    setError(null)
  }

  async function handleSave() {
    if (!file || !subId || !docType) {
      setError('Please select a subcontractor, document type, and attach a file.')
      return
    }

    if (phase === 'manual') {
      if (!editedCompany.trim()) {
        setError('Company name is required.')
        return
      }
      if (docType !== 'W9' && !editedExpiry) {
        setError('Expiry date is required for this document type.')
        return
      }
    }

    setSaving(true); setError(null)

    const fd = new FormData()
    fd.append('subcontractor_id', subId)
    fd.append('document_type', docType)
    fd.append('expiry_date', editedExpiry)
    fd.append('file', file)

    if (phase === 'manual') {
      fd.append('verified_by', 'manual')
      fd.append('company_name', editedCompany.trim())
    } else if (phase === 'review') {
      // Hand off the pre-scanned extraction so the server can evaluate compliance
      // directly — no second Gemini call needed.
      fd.append('pre_extracted_data', JSON.stringify({
        company_name:   editedCompany.trim(),
        expiry_date:    editedExpiry || null,
        coverage_limit: aiCoverage,
      }))
    }

    const result = await uploadDocument(projectId, { error: null }, fd)
    setSaving(false)

    if (result.error) { setError(result.error); return }
    router.refresh()
    handleOpenChange(false)
  }

  const title =
    phase === 'scanning' ? 'Gemini is Inspecting...' :
    phase === 'review'   ? 'Verify Extracted Data'   :
    phase === 'manual'   ? 'Manual Entry'            :
                           'Upload Compliance Document'

  const canClickLeftPanel = phase === 'idle' || phase === 'manual'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!isControlled && (
        <DialogTrigger render={<Button className="gap-2" />}>
          <Upload className="h-4 w-4" />
          Upload Document
        </DialogTrigger>
      )}

      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-3xl" showCloseButton={false}>
        <div className="grid min-h-[500px] grid-cols-[42%_58%]">

          {/* ── Left: dark preview panel ── */}
          <div
            className={`relative cursor-pointer rounded-l-xl bg-slate-900 transition-colors ${
              dragging ? 'bg-indigo-950' : ''
            }`}
            onClick={() => canClickLeftPanel && inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragEnter={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
          >
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              onChange={handleInputChange}
              className="hidden"
            />
            <DocPreview file={file} previewUrl={previewUrl} phase={phase} />

            {/* "Change file" affordance in review or manual state */}
            {(phase === 'review' || phase === 'manual') && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setFile(null)
                  if (phase === 'review') { setPhase('idle'); setAiName(null) }
                }}
                className="absolute bottom-3 left-0 right-0 text-center text-xs text-white/30 transition-colors hover:text-white/60"
              >
                ← change file
              </button>
            )}
          </div>

          {/* ── Right: form panel ── */}
          <div className="flex flex-col">
            <div className="flex-1 space-y-4 p-6">
              <DialogHeader>
                <DialogTitle className="text-base">{title}</DialogTitle>
              </DialogHeader>

              {/* Subcontractor */}
              <div className="space-y-1.5">
                <Label>Subcontractor</Label>
                <Select
                  value={subId}
                  onValueChange={(v) => setSubId(v ?? '')}
                  disabled={phase === 'scanning' || saving}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a subcontractor…">
                      {subId
                        ? subcontractors.find((s) => s.id === subId)?.company_name
                        : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {subcontractors.map((sub) => (
                      <SelectItem key={sub.id} value={sub.id}>
                        {sub.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Document type */}
              <div className="space-y-1.5">
                <Label>Document Type</Label>
                <Select
                  value={docType}
                  onValueChange={(v) => {
                    setDocType(v ?? '')
                    if (v === 'W9') setEditedExpiry('')
                  }}
                  disabled={phase === 'scanning' || saving}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a type…" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOC_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Phase: idle instruction + skip button */}
              {phase === 'idle' && (
                <div className="space-y-2">
                  <div className="rounded-lg border border-dashed border-slate-200 px-4 py-5 text-center">
                    <p className="text-xs font-medium text-slate-500">
                      Drop a file on the left panel
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Gemini will scan it automatically
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={enterManualMode}
                    className="flex w-full items-center justify-center gap-1.5 text-xs text-slate-400 transition-colors hover:text-slate-600"
                  >
                    <PenLine className="h-3 w-3" />
                    Skip AI / Enter Manually
                  </button>
                </div>
              )}

              {/* Phase: scanning indicator */}
              {phase === 'scanning' && (
                <div className="flex items-center gap-2.5 rounded-lg bg-indigo-50 px-4 py-3 text-xs text-indigo-600">
                  <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                  <span>AI is reading your document...</span>
                </div>
              )}

              {/* Phase: review — AI-extracted fields */}
              {phase === 'review' && (
                <>
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span>Scan complete. Review and edit if needed.</span>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="ext-company">Extracted Company Name</Label>
                    <Input
                      id="ext-company"
                      value={editedCompany}
                      onChange={(e) => setEditedCompany(e.target.value)}
                      placeholder="Company name from document"
                    />
                    {hasMismatch && (
                      <div className="flex items-start gap-1.5 text-xs text-amber-600">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>
                          AI detected a mismatch:{' '}
                          <strong>&ldquo;{aiName}&rdquo;</strong>. Please verify.
                        </span>
                      </div>
                    )}
                  </div>

                  {docType === 'W9' ? (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                      W-9 tax forms do not have an expiry date — no date required.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label htmlFor="ext-expiry">Extracted Expiry Date</Label>
                      <Input
                        id="ext-expiry"
                        type="date"
                        value={editedExpiry}
                        onChange={(e) => setEditedExpiry(e.target.value)}
                      />
                      {!editedExpiry && (
                        <p className="text-xs text-amber-600">
                          No date found — please enter it manually.
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Phase: manual entry form */}
              {phase === 'manual' && (
                <>
                  <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
                    <PenLine className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      Entering data manually. This document will be marked{' '}
                      <strong>Pending Verification</strong> until a GC reviews and approves it.
                    </span>
                  </div>

                  {!file && (
                    <div className="rounded-lg border border-dashed border-slate-200 px-4 py-3 text-center">
                      <p className="text-xs text-slate-500">
                        Drop or click the left panel to attach the document file.
                      </p>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="man-company">Company Name <span className="text-red-500">*</span></Label>
                    <Input
                      id="man-company"
                      value={editedCompany}
                      onChange={(e) => setEditedCompany(e.target.value)}
                      placeholder="As it appears on the document"
                      disabled={saving}
                    />
                  </div>

                  {docType === 'W9' ? (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                      W-9 tax forms do not have an expiry date — no date required.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label htmlFor="man-expiry">
                        Expiry Date {docType && <span className="text-red-500">*</span>}
                      </Label>
                      <Input
                        id="man-expiry"
                        type="date"
                        value={editedExpiry}
                        onChange={(e) => setEditedExpiry(e.target.value)}
                        disabled={saving}
                      />
                    </div>
                  )}
                </>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Footer lives inside the right panel */}
            <DialogFooter
              showCloseButton
              className="mx-0 mb-0 flex-row items-center justify-end gap-3 rounded-br-xl px-6 py-4"
            >
              {(phase === 'review' || phase === 'manual') && (
                <Button
                  onClick={handleSave}
                  disabled={saving || !subId || !docType || !file}
                  className="gap-2"
                >
                  {saving ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Saving…</>
                  ) : (
                    'Save Document'
                  )}
                </Button>
              )}
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
