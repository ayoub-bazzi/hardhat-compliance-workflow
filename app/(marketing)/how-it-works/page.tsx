import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Upload, Sparkles, ShieldCheck, ScanLine, Bell, ArrowRight,
  FileText, Brain, Zap, Lock, RefreshCw,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'How It Works — HardHat Compliance',
  description:
    'A transparent look at how HardHat uses Gemini 2.5 Flash AI to review compliance documents, issue Digital Safety Passes, and enforce gate access on job sites.',
  openGraph: {
    title: 'How It Works — HardHat Compliance',
    description:
      'A transparent look at how HardHat uses Gemini 2.5 Flash AI to review compliance documents and enforce job-site access via QR Safety Pass.',
    type: 'website',
  },
}

// ── AI Pipeline steps ──────────────────────────────────────────

const PIPELINE = [
  {
    Icon: Upload,
    title: 'Document Ingestion',
    detail: 'The subcontractor uploads a PDF, PNG, or JPEG through their personal compliance portal. Files are stored encrypted in isolated cloud storage — never in email.',
    tag: 'Step 1',
    color: 'indigo',
  },
  {
    Icon: Brain,
    title: 'Gemini 2.5 Flash Analysis',
    detail: 'We send the document image and a structured extraction prompt to Gemini 2.5 Flash. The model extracts: certificate holder, insured name, coverage types, coverage limits, and expiry dates. It also performs a name-match check between the document and the subcontractor record.',
    tag: 'Step 2',
    color: 'violet',
  },
  {
    Icon: ShieldCheck,
    title: 'Rules Engine Verdict',
    detail: 'The extracted data runs through your configured compliance rules — minimum coverage amounts, required document types, and expiry thresholds. If any rule fails, the document is rejected automatically with a plain-English reason sent to the subcontractor.',
    tag: 'Step 3',
    color: 'emerald',
  },
  {
    Icon: Bell,
    title: 'Automated Notifications',
    detail: 'Approval and rejection emails go out instantly via Resend. The subcontractor knows exactly what to fix. No back-and-forth. No phone tag. The General Contractor sees every decision logged with a timestamp.',
    tag: 'Step 4',
    color: 'amber',
  },
  {
    Icon: RefreshCw,
    title: 'Proactive Expiry Engine',
    detail: 'A nightly cron job scans every approved document. At 30, 15, and 7 days before expiry, the subcontractor gets a warning email. The compliance dashboard shows an "Upcoming Expiries" badge so nothing slips through.',
    tag: 'Step 5',
    color: 'orange',
  },
  {
    Icon: ScanLine,
    title: 'Gate Enforcement (QR Pass)',
    detail: 'Each subcontractor holds a live QR safety pass. When scanned on-site, it reflects their real-time compliance status. Green = cleared to enter. Red = blocked until documents are current. No paper, no clipboards, no debates.',
    tag: 'Step 6',
    color: 'rose',
  },
]

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  indigo: { bg: 'bg-indigo-50',  text: 'text-indigo-600',  border: 'border-indigo-200', badge: 'bg-indigo-100 text-indigo-700'  },
  violet: { bg: 'bg-violet-50',  text: 'text-violet-600',  border: 'border-violet-200', badge: 'bg-violet-100 text-violet-700'  },
  emerald:{ bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200',badge: 'bg-emerald-100 text-emerald-700'},
  amber:  { bg: 'bg-amber-50',   text: 'text-amber-600',   border: 'border-amber-200',  badge: 'bg-amber-100 text-amber-700'   },
  orange: { bg: 'bg-orange-50',  text: 'text-orange-600',  border: 'border-orange-200', badge: 'bg-orange-100 text-orange-700' },
  rose:   { bg: 'bg-rose-50',    text: 'text-rose-600',    border: 'border-rose-200',   badge: 'bg-rose-100 text-rose-700'    },
}

// ── Safety Pass explainer ──────────────────────────────────────

const PASS_STATES = [
  {
    color: 'bg-emerald-500',
    ring: 'ring-emerald-400',
    label: 'CLEARED',
    sub: 'All documents approved & current',
    text: 'text-emerald-300',
  },
  {
    color: 'bg-amber-500',
    ring: 'ring-amber-400',
    label: 'WARNING',
    sub: 'Document expiring within 30 days',
    text: 'text-amber-300',
  },
  {
    color: 'bg-red-500',
    ring: 'ring-red-400',
    label: 'BLOCKED',
    sub: 'Missing or rejected document',
    text: 'text-red-300',
  },
]

export default function HowItWorksPage() {
  return (
    <div className="bg-white">
      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="bg-slate-950 px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-violet-400">
            <Sparkles className="h-3.5 w-3.5" /> Gemini 2.5 Flash — Powered
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
            How HardHat Works
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-400">
            Every step from document upload to gate access is automated, logged, and auditable.
            Here is exactly what happens behind the scenes.
          </p>
        </div>
      </section>

      {/* ── AI Pipeline ───────────────────────────────────────── */}
      <section className="px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 mb-2">The AI Pipeline</p>
            <h2 className="text-3xl font-black tracking-tight text-slate-900">
              From upload to verdict in seconds
            </h2>
          </div>

          <div className="relative space-y-6">
            {/* Vertical line */}
            <div className="absolute left-7 top-12 bottom-12 w-px bg-slate-200 hidden sm:block" />

            {PIPELINE.map(({ Icon, title, detail, tag, color }) => {
              const c = COLOR_MAP[color]
              return (
                <div key={tag} className="flex gap-6 relative">
                  {/* Icon dot */}
                  <div className={`relative z-10 hidden sm:flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${c.bg} border ${c.border} ring-4 ring-white`}>
                    <Icon className={`h-6 w-6 ${c.text}`} />
                  </div>

                  <div className={`flex-1 rounded-2xl border ${c.border} bg-white p-6 shadow-sm`}>
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.badge}`}>
                        {tag}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-500">{detail}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── The AI model ──────────────────────────────────────── */}
      <section className="border-y border-slate-100 bg-slate-50 px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700 mb-4">
                <Sparkles className="h-3.5 w-3.5" /> Gemini 2.5 Flash
              </div>
              <h2 className="text-3xl font-black tracking-tight text-slate-900 mb-4">
                Why we chose Gemini 2.5 Flash
              </h2>
              <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
                <p>
                  Insurance certificates are not structured data — they are semi-standardized PDFs with inconsistent layouts, scanned images, and free-form text. Traditional OCR fails on them regularly.
                </p>
                <p>
                  Gemini 2.5 Flash understands documents as a whole. It reads a COI the same way a seasoned insurance broker would: looking at the context around a field, not just the field itself. This means it catches edge cases like endorsements that modify coverage limits or certificates issued to parent companies instead of the named subcontractor.
                </p>
                <p>
                  We use structured output prompting to get back a typed JSON object every time — no hallucinations, no unparseable responses.
                </p>
              </div>
            </div>

            {/* Prompt visualization */}
            <div className="rounded-2xl bg-slate-900 p-6 font-mono text-xs shadow-xl">
              <p className="text-slate-500 mb-4">// AI extraction prompt (simplified)</p>
              <p className="text-violet-400">analyze_document(<span className="text-amber-400">image</span>) {'{'}</p>
              <div className="pl-4 space-y-1 text-slate-300 my-2">
                <p><span className="text-emerald-400">extract:</span> [</p>
                <p className="pl-4 text-slate-400">&quot;insured_name&quot;,</p>
                <p className="pl-4 text-slate-400">&quot;coverage_types&quot;,</p>
                <p className="pl-4 text-slate-400">&quot;coverage_limits&quot;,</p>
                <p className="pl-4 text-slate-400">&quot;expiry_date&quot;,</p>
                <p className="pl-4 text-slate-400">&quot;certificate_holder&quot;</p>
                <p>]</p>
                <p><span className="text-emerald-400">validate:</span> rules_engine</p>
                <p><span className="text-emerald-400">return:</span> <span className="text-amber-400">&quot;approved&quot;</span> | <span className="text-red-400">&quot;rejected&quot;</span></p>
              </div>
              <p className="text-violet-400">{'}'}</p>
              <div className="mt-4 border-t border-slate-800 pt-4 text-emerald-400">
                ✓ Verdict: approved<br />
                ✓ Confidence: 0.97<br />
                ✓ Latency: 1.4s
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Digital Safety Pass ───────────────────────────────── */}
      <section className="px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-4xl text-center mb-14">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 mb-4">
            <Lock className="h-3.5 w-3.5" /> The Digital Safety Pass
          </div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 mb-4">
            Compliance that lives on the job site
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            A QR code that reflects real-time compliance status. No paper. No laminated cards. No way to fake it.
          </p>
        </div>

        <div className="mx-auto max-w-3xl grid gap-6 sm:grid-cols-3">
          {PASS_STATES.map(({ color, ring, label, sub, text }) => (
            <div key={label} className="rounded-2xl bg-slate-900 p-6 text-center shadow-lg">
              <div className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full ${color} ring-4 ${ring} ring-opacity-30 shadow-lg`}>
                <ScanLine className="h-9 w-9 text-white" />
              </div>
              <p className={`text-lg font-black ${text} mb-1`}>{label}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{sub}</p>
            </div>
          ))}
        </div>

        <div className="mx-auto max-w-2xl mt-10 rounded-xl border border-slate-200 bg-slate-50 px-6 py-5 text-sm text-slate-600 text-center leading-relaxed">
          The pass is generated from a live database query — not a static QR sticker. Every scan reflects the subcontractor&apos;s status at that exact moment. When a document expires, the pass turns red automatically. No manual update required.
        </div>
      </section>

      {/* ── Technical guarantees ──────────────────────────────── */}
      <section className="border-t border-slate-100 bg-slate-50 px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black tracking-tight text-slate-900">Built for accountability</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { Icon: FileText, title: 'Full Audit Trail',   body: 'Every AI decision, email, and manual override is logged with a timestamp and actor.'          },
              { Icon: Zap,      title: 'Sub-2s AI Review',   body: 'Gemini 2.5 Flash returns a structured verdict typically in under 2 seconds.'                    },
              { Icon: Bell,     title: 'Proactive Alerts',   body: 'Expiry warnings go out at 30, 15, and 7 days — before the problem reaches the gate.'           },
              { Icon: Lock,     title: 'RLS-Secured Data',   body: 'Row-Level Security ensures each subcontractor can only see their own documents and status.'      },
            ].map(({ Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900">
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-2">{title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────── */}
      <section className="bg-slate-950 px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-black text-white mb-4">See it live on your data</h2>
          <p className="text-slate-400 mb-8">
            A 15-minute demo is worth a thousand diagrams. Let us walk you through the full pipeline.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-8 py-4 font-bold text-slate-950 hover:bg-amber-400 transition-colors"
          >
            Book a Demo <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  )
}
