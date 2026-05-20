'use client'

import { useState } from 'react'
import { Loader2, CheckCircle2, AlertTriangle, ArrowRight, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { submitDemoRequest } from './contact-actions'

type FieldState = {
  name: string
  email: string
  companyName: string
  companySize: string
  subcontractorCount: string
  message: string
  interest: string
}

const EMPTY: FieldState = {
  name: '', email: '', companyName: '',
  companySize: '', subcontractorCount: '', message: '',
  interest: '',
}

const COMPANY_SIZES = [
  '1–10 employees',
  '11–50 employees',
  '51–200 employees',
  '201–500 employees',
  '500+ employees',
]

const SUB_COUNTS = [
  '1–5 subcontractors',
  '6–15 subcontractors',
  '16–40 subcontractors',
  '41–100 subcontractors',
  '100+ subcontractors',
]

type Stage = 'idle' | 'loading' | 'success' | 'error'

export function ContactForm({ interest = 'Beta Access' }: { interest?: string }) {
  const [fields, setFields] = useState<FieldState>({ ...EMPTY, interest })
  const [stage,  setStage]  = useState<Stage>('idle')
  const [error,  setError]  = useState('')

  function set(key: keyof FieldState) {
    return (value: string) => {
      setFields((f) => ({ ...f, [key]: value }))
      if (stage !== 'idle') setStage('idle')
    }
  }

  function setSelect(key: keyof FieldState) {
    return (value: string | null) => set(key)(value ?? '')
  }

  const isValid = fields.name && fields.email && fields.companyName &&
                  fields.companySize && fields.subcontractorCount

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid || stage === 'loading') return

    setStage('loading')
    const result = await submitDemoRequest(fields)

    if (result.success) {
      setStage('success')
      setFields(EMPTY)
    } else {
      setError(result.error ?? 'Something went wrong. Please try again.')
      setStage('error')
    }
  }

  if (stage === 'success') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 mb-6">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">Request received!</h3>
        <p className="text-slate-500 max-w-sm">
          We will be in touch within one business day to schedule your demo. Check your inbox for a confirmation.
        </p>
        <button
          onClick={() => { setFields({ ...EMPTY, interest }); setStage('idle') }}
          className="mt-8 text-sm font-medium text-indigo-600 hover:text-indigo-800 underline underline-offset-4"
        >
          Submit another request
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Hidden interest context — pre-filled, locked */}
      <input type="hidden" name="interest" value={fields.interest} />
      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5">
        <Lock className="h-3.5 w-3.5 shrink-0 text-amber-600" />
        <span className="text-xs text-amber-800">
          <span className="font-semibold">Interested in:</span> {fields.interest}
        </span>
      </div>

      {/* Name + Email */}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Full Name <span className="text-red-500">*</span></Label>
          <Input
            id="name"
            placeholder="Jane Smith"
            value={fields.name}
            onChange={(e) => set('name')(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Work Email <span className="text-red-500">*</span></Label>
          <Input
            id="email"
            type="email"
            placeholder="jane@yourcompany.com"
            value={fields.email}
            onChange={(e) => set('email')(e.target.value)}
            required
          />
        </div>
      </div>

      {/* Company Name */}
      <div className="space-y-1.5">
        <Label htmlFor="company">Company Name <span className="text-red-500">*</span></Label>
        <Input
          id="company"
          placeholder="Acme Construction LLC"
          value={fields.companyName}
          onChange={(e) => set('companyName')(e.target.value)}
          required
        />
      </div>

      {/* Company Size + Sub Count */}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Company Size <span className="text-red-500">*</span></Label>
          <Select value={fields.companySize} onValueChange={setSelect('companySize')}>
            <SelectTrigger className="w-full h-8">
              <SelectValue placeholder="Select size…" />
            </SelectTrigger>
            <SelectContent>
              {COMPANY_SIZES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Avg. Subcontractors per Project <span className="text-red-500">*</span></Label>
          <Select value={fields.subcontractorCount} onValueChange={setSelect('subcontractorCount')}>
            <SelectTrigger className="w-full h-8">
              <SelectValue placeholder="Select range…" />
            </SelectTrigger>
            <SelectContent>
              {SUB_COUNTS.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Message */}
      <div className="space-y-1.5">
        <Label htmlFor="message">Anything else we should know? <span className="text-slate-400 font-normal">(optional)</span></Label>
        <textarea
          id="message"
          rows={4}
          placeholder="Current pain points, specific use cases, timeline…"
          value={fields.message}
          onChange={(e) => set('message')(e.target.value)}
          className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm text-slate-800 placeholder:text-muted-foreground outline-none resize-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 transition-colors"
        />
      </div>

      {/* Error */}
      {stage === 'error' && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* Submit */}
      <Button
        type="submit"
        disabled={!isValid || stage === 'loading'}
        className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold h-12 text-base"
      >
        {stage === 'loading' ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending request…</>
        ) : (
          <>Book My Free Demo <ArrowRight className="ml-2 h-4 w-4" /></>
        )}
      </Button>

      <p className="text-center text-xs text-slate-400">
        No sales pressure. A 15-minute call, your questions, your terms.
      </p>
    </form>
  )
}
