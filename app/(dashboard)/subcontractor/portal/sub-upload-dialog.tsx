'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Upload, AlertCircle, Loader2, AlertTriangle, CheckCircle2, Sparkles, FileText, Plus,
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
import { uploadSubDocument } from './actions'
import { scanDocumentFile } from '@/app/gc/projects/[id]/ai-actions'
import type { DocumentType } from '@/types/database.types'

const DOC_TYPES = ['COI', 'W9', 'Certified Payroll'] as const

type Phase = 'idle' | 'scanning' | 'review'

// ── Left panel: document preview ──────────────────────────────

function DocPreview({ file, previewUrl, phase }: {
  file: File | null
  previewUrl: string | null
  phase: Phase
}) {
  const isImage = file?.type.startsWith('image/')
  const isPdf   = file?.type === 'application/pdf'

  if (phase === 'idle' || !file || !previewUrl) {
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
        <img src={previewUrl} alt="Document preview" className="h-full w-full object-contain p-3" />
      )}
      {isPdf && (
        <iframe src={previewUrl} className="h-full w-full" title="Document preview" />
      )}
      {!isImage && !isPdf && (
        <div className="flex h-full items-center justify-center gap-3">
          <FileText className="h-8 w-8 text-white/40" />
          <span className="text-sm text-white/60 truncate max-w-[160px]">{file.name}</span>
        </div>
      )}

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
            <p className="text-sm font-semibold tracking-wide text-white">Gemini is Inspecting...</p>
            <p className="mt-1 text-xs text-indigo-300/70">Extracting compliance data</p>
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

export function SubUploadDialog({
  subcontractorId,
  projectId,
  defaultDocType,
  triggerLabel = 'Upload Document',
}: {
  subcontractorId: string
  projectId: string
  defaultDocType?: DocumentType
  triggerLabel?: string
}) {
  const router   = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)

  const [docType, setDocType]           = useState<string>(defaultDocType ?? '')
  const [file, setFile]                 = useState<File | null>(null)
  const [previewUrl, setPreviewUrl]     = useState<string | null>(null)
  const [dragging, setDragging]         = useState(false)
  const [phase, setPhase]               = useState<Phase>('idle')
  const [editedCompany, setEditedCompany] = useState('')
  const [editedExpiry, setEditedExpiry]   = useState('')
  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState<string | null>(null)

  useEffect(() => {
    if (!file) { setPreviewUrl(null); return }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  function reset() {
    setDocType(defaultDocType ?? ''); setFile(null); setPreviewUrl(null)
    setPhase('idle'); setEditedCompany(''); setEditedExpiry('')
    setSaving(false); setError(null); setDragging(false)
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    setOpen(next)
  }

  async function handleFile(f: File) {
    const allowed = ['application/pdf', 'image/png', 'image/jpeg']
    if (!allowed.includes(f.type)) {
      setError('Only PDF, PNG, and JPEG files are supported.')
      return
    }
    setFile(f)
    setPhase('scanning')
    setError(null)

    const fd = new FormData()
    fd.append('file', f)
    const result = await scanDocumentFile(fd)

    if (result.error) {
      setPhase('idle')
      setError(result.error)
      return
    }

    setEditedCompany(result.company_name ?? '')
    setEditedExpiry(result.expiry_date ?? '')
    setPhase('review')
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  async function handleSave() {
    if (!file || !docType) {
      setError('Please select a document type before saving.')
      return
    }
    setSaving(true); setError(null)

    const fd = new FormData()
    fd.append('subcontractor_id', subcontractorId)
    fd.append('project_id', projectId)
    fd.append('document_type', docType)
    fd.append('expiry_date', editedExpiry)
    fd.append('file', file)

    const result = await uploadSubDocument({ error: null }, fd)
    setSaving(false)

    if (result.error) { setError(result.error); return }
    router.refresh()
    setOpen(false)
  }

  const title =
    phase === 'scanning' ? 'Gemini is Inspecting...' :
    phase === 'review'   ? 'Verify Extracted Data'   :
                           triggerLabel

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button size="sm" className="gap-1.5" />}>
        <Plus className="h-3.5 w-3.5" />
        {triggerLabel}
      </DialogTrigger>

      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-3xl" showCloseButton={false}>
        <div className="grid min-h-[480px] grid-cols-[42%_58%]">

          {/* ── Left: dark preview panel ── */}
          <div
            className={`relative cursor-pointer rounded-l-xl bg-slate-900 transition-colors ${
              dragging ? 'bg-indigo-950' : ''
            }`}
            onClick={() => phase === 'idle' && inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragEnter={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
          >
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
              className="hidden"
            />
            <DocPreview file={file} previewUrl={previewUrl} phase={phase} />

            {phase === 'review' && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setPhase('idle'); setFile(null) }}
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

              {/* Document type */}
              <div className="space-y-1.5">
                <Label>Document Type</Label>
                <Select
                  value={docType}
                  onValueChange={(v) => setDocType(v ?? '')}
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

              {phase === 'idle' && (
                <div className="rounded-lg border border-dashed border-slate-200 px-4 py-5 text-center">
                  <p className="text-xs font-medium text-slate-500">Drop a file on the left panel</p>
                  <p className="mt-0.5 text-xs text-slate-400">Gemini will scan it automatically</p>
                </div>
              )}

              {phase === 'scanning' && (
                <div className="flex items-center gap-2.5 rounded-lg bg-indigo-50 px-4 py-3 text-xs text-indigo-600">
                  <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                  <span>AI is reading your document...</span>
                </div>
              )}

              {phase === 'review' && (
                <>
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span>Scan complete. Review and edit if needed.</span>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="sub-ext-company">Extracted Company Name</Label>
                    <Input
                      id="sub-ext-company"
                      value={editedCompany}
                      onChange={(e) => setEditedCompany(e.target.value)}
                      placeholder="Company name from document"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="sub-ext-expiry">Extracted Expiry Date</Label>
                    <Input
                      id="sub-ext-expiry"
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
                </>
              )}

              {error && (
                <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <DialogFooter showCloseButton className="rounded-br-xl">
              {phase === 'review' && (
                <Button
                  onClick={handleSave}
                  disabled={saving || !docType}
                  className="gap-2"
                >
                  {saving ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Saving…</>
                  ) : (
                    'Submit Document'
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
