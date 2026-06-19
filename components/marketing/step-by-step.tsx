'use client'

import { useState } from 'react'
import {
  FolderPlus, UserPlus, Sparkles, BarChart3, ScanLine,
  Mail, Upload, CheckCircle, QrCode,
} from 'lucide-react'

type Step = {
  step: number
  icon: React.ElementType
  title: string
  description: string
  tag: string
}

const GC_STEPS: Step[] = [
  {
    step: 1, icon: FolderPlus,
    title: 'Create a Project',
    description: 'Name your job site, add a location, invite your team. Takes under 60 seconds — no configuration needed.',
    tag: '60 sec',
  },
  {
    step: 2, icon: UserPlus,
    title: 'Add Subcontractors',
    description: 'Enter their company name and email. HardHat sends a secure, personalized portal link — no account required on their end.',
    tag: 'Auto-invite',
  },
  {
    step: 3, icon: Sparkles,
    title: 'AI Reviews Their Docs',
    description: 'Subs upload their COI, W9, and trade licenses. Gemini 2.5 Flash reads and verifies each in under 30 seconds.',
    tag: '< 30 seconds',
  },
  {
    step: 4, icon: BarChart3,
    title: 'Risk Score Updates Live',
    description: 'Your Command Center reflects real-time compliance. Payment holds trigger automatically when risk exceeds the threshold.',
    tag: 'Automated',
  },
  {
    step: 5, icon: ScanLine,
    title: 'Gate Enforces Access',
    description: 'Every sub carries a live QR Safety Pass. Green = cleared. Red = blocked until documents are fixed. No debate.',
    tag: 'Physical gate',
  },
]

const SUB_STEPS: Step[] = [
  {
    step: 1, icon: Mail,
    title: 'Check Your Email',
    description: 'Your GC sends you a secure portal link. No account, no app to install, no password — just click and go.',
    tag: 'Email invite',
  },
  {
    step: 2, icon: Upload,
    title: 'Upload Your Documents',
    description: 'Submit your COI, W9, and trade licenses. PDF, PNG, or JPEG accepted. Most subs are done in 3 minutes.',
    tag: '3 min',
  },
  {
    step: 3, icon: CheckCircle,
    title: 'Get Your Verdict',
    description: 'AI reviews instantly. Approved? Done. Rejected? A plain-English email tells you exactly what to fix and how.',
    tag: '< 30 seconds',
  },
  {
    step: 4, icon: QrCode,
    title: 'Carry Your Safety Pass',
    description: 'Once approved, your Safety Pass turns green. Open the portal on your phone and show it at the gate — no paper needed.',
    tag: 'Site access',
  },
]

export function StepByStep() {
  const [tab, setTab] = useState<'gc' | 'sub'>('gc')
  const steps = tab === 'gc' ? GC_STEPS : SUB_STEPS

  return (
    <div>
      {/* Pill tabs */}
      <div className="mb-12 flex justify-center">
        <div className="inline-flex rounded-full bg-stone-100 p-1">
          {([
            { id: 'gc'  as const, label: 'For General Contractors' },
            { id: 'sub' as const, label: 'For Subcontractors'      },
          ]).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`rounded-full px-6 py-2 text-sm font-semibold transition-all ${
                tab === id
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Step cards */}
      <div className={`grid gap-4 sm:grid-cols-2 ${tab === 'gc' ? 'xl:grid-cols-5' : 'xl:grid-cols-4'}`}>
        {steps.map(({ step, icon: Icon, title, description, tag }) => (
          <div
            key={step}
            className="group flex flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-100 transition-all hover:-translate-y-1 hover:shadow-md"
          >
            {/* Step number + tag */}
            <div className="mb-5 flex items-center justify-between">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-xs font-black text-white shadow-sm shadow-orange-200">
                {step}
              </span>
              <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[10px] font-semibold text-stone-500">
                {tag}
              </span>
            </div>

            {/* Icon */}
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-stone-50 ring-1 ring-stone-100">
              <Icon className="h-5 w-5 text-stone-600" />
            </div>

            {/* Text */}
            <h3 className="mb-2 text-sm font-bold text-stone-900">{title}</h3>
            <p className="text-xs leading-relaxed text-stone-500">{description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
