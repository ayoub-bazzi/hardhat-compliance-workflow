import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Upload, Sparkles, ShieldCheck, ScanLine, Bell,
  ArrowRight, FileText, Brain, Zap, Lock, RefreshCw,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'How It Works — HardHat Compliance',
  description: 'A transparent look at how HardHat uses Gemini 2.5 Flash AI to review compliance documents, issue Digital Safety Passes, and enforce gate access on job sites.',
}

const PIPELINE = [
  {
    Icon: Upload,
    title: 'Document Ingestion',
    detail: 'The subcontractor uploads a PDF, PNG, or JPEG through their personal compliance portal. Files are stored encrypted in isolated cloud storage — never in email.',
    tag: 'Step 1', time: '~1 min',
  },
  {
    Icon: Brain,
    title: 'Gemini 2.5 Flash Analysis',
    detail: 'We send the document image and a structured extraction prompt to Gemini 2.5 Flash. The model extracts certificate holder, insured name, coverage types, limits, and expiry dates — and performs a name-match check against the subcontractor record.',
    tag: 'Step 2', time: '< 30s',
  },
  {
    Icon: ShieldCheck,
    title: 'Rules Engine Verdict',
    detail: 'The extracted data runs through your configured compliance rules — minimum coverage amounts, required document types, and expiry thresholds. If any rule fails, the document is rejected automatically with a plain-English reason emailed to the subcontractor.',
    tag: 'Step 3', time: 'Instant',
  },
  {
    Icon: Bell,
    title: 'Automated Notifications',
    detail: 'Approval and rejection emails go out instantly. The subcontractor knows exactly what to fix. No back-and-forth, no phone tag. The General Contractor sees every decision logged with a timestamp.',
    tag: 'Step 4', time: 'Instant',
  },
  {
    Icon: RefreshCw,
    title: 'Proactive Expiry Engine',
    detail: 'A nightly cron job scans every approved document. At 30, 15, and 7 days before expiry, the subcontractor gets a warning email. The compliance dashboard shows an "Upcoming Expiries" badge so nothing slips through.',
    tag: 'Step 5', time: 'Nightly',
  },
  {
    Icon: ScanLine,
    title: 'Gate Enforcement via QR Pass',
    detail: 'Each subcontractor holds a live QR Safety Pass. When scanned on-site, it reflects their real-time compliance status. Green = cleared to enter. Red = blocked until documents are current. No paper, no clipboards, no debate.',
    tag: 'Step 6', time: '< 1s scan',
  },
]

const PASS_STATES = [
  { bg: 'bg-emerald-500', label: 'CLEARED',  sub: 'All documents approved & current',   text: 'text-emerald-700',  card: 'bg-emerald-50  ring-emerald-100' },
  { bg: 'bg-amber-500',  label: 'WARNING',  sub: 'Document expiring within 30 days',   text: 'text-amber-700',   card: 'bg-amber-50   ring-amber-100'  },
  { bg: 'bg-red-500',    label: 'BLOCKED',  sub: 'Missing or rejected document',       text: 'text-red-700',    card: 'bg-red-50    ring-red-100'    },
]

export default function HowItWorksPage() {
  return (
    <div className="bg-[#FAFAF8]">

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="px-6 pb-24 pt-20 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-1.5 shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-orange-500" />
            <span className="text-xs font-semibold text-stone-500">Powered by Gemini 2.5 Flash</span>
          </div>
          <h1 className="text-5xl font-black tracking-tight text-stone-950 sm:text-6xl">
            How HardHat Works
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-stone-500 max-w-2xl mx-auto">
            Every step from document upload to gate access is automated, logged, and auditable.
            Here is exactly what happens behind the scenes.
          </p>
        </div>
      </section>

      {/* ── AI Pipeline ───────────────────────────────────────── */}
      <section className="bg-white px-6 py-24 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-16 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-orange-600">The AI Pipeline</p>
            <h2 className="text-3xl font-black tracking-tight text-stone-950 sm:text-4xl">
              From upload to verdict in seconds
            </h2>
            <p className="mt-4 text-stone-500">Six automated stages. Zero manual intervention.</p>
          </div>

          <div className="relative space-y-4">
            {/* Connector line */}
            <div className="absolute left-[27px] top-14 bottom-14 w-px bg-gradient-to-b from-orange-200 via-stone-200 to-stone-200 hidden sm:block" />

            {PIPELINE.map(({ Icon, title, detail, tag, time }) => (
              <div key={tag} className="relative flex gap-5">
                {/* Step icon */}
                <div className="relative z-10 hidden sm:flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-stone-100">
                  <Icon className="h-6 w-6 text-stone-600" />
                </div>

                <div className="flex-1 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-100 transition-all hover:shadow-md">
                  <div className="h-0.5 w-full bg-gradient-to-r from-orange-400 to-orange-200" />
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      {/* Mobile icon */}
                      <div className="sm:hidden flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-stone-50 ring-1 ring-stone-100">
                        <Icon className="h-4 w-4 text-stone-600" />
                      </div>
                      <h3 className="flex-1 text-base font-bold text-stone-900">{title}</h3>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[10px] font-semibold text-stone-500">{tag}</span>
                        <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-[10px] font-semibold text-orange-600 ring-1 ring-orange-100">{time}</span>
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed text-stone-500">{detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Gemini ────────────────────────────────────────── */}
      <section className="bg-[#FAFAF8] px-6 py-24 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3.5 py-1.5 shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-orange-500" />
                <span className="text-xs font-semibold text-stone-600">Gemini 2.5 Flash</span>
              </div>
              <h2 className="text-3xl font-black tracking-tight text-stone-950 mb-5">
                Why we chose Gemini 2.5 Flash
              </h2>
              <div className="space-y-4 text-sm text-stone-500 leading-relaxed">
                <p>
                  Insurance certificates are not structured data — they are semi-standardized PDFs with
                  inconsistent layouts, scanned images, and free-form text. Traditional OCR fails on them regularly.
                </p>
                <p>
                  Gemini 2.5 Flash understands documents as a whole — the way a seasoned insurance broker would.
                  It catches edge cases like endorsements that modify coverage limits or certificates issued to
                  parent companies instead of the named subcontractor.
                </p>
                <p>
                  We use structured output prompting to get back a typed JSON object every time — no
                  hallucinations, no unparseable responses.
                </p>
              </div>
            </div>

            {/* Code block */}
            <div className="overflow-hidden rounded-2xl bg-stone-950 shadow-xl ring-1 ring-stone-800">
              <div className="flex items-center gap-2 border-b border-stone-800 bg-stone-900 px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </div>
                <span className="ml-2 text-[11px] font-mono text-stone-500">ai-extraction.ts</span>
              </div>
              <div className="p-6 font-mono text-xs">
                <p className="text-stone-500 mb-4">// AI extraction prompt (simplified)</p>
                <p className="text-violet-400">analyze_document(<span className="text-amber-400">image</span>) {'{'}</p>
                <div className="pl-4 space-y-1 my-2">
                  <p><span className="text-emerald-400">extract:</span> <span className="text-stone-300">[</span></p>
                  <p className="pl-4 text-stone-500">&quot;insured_name&quot;,</p>
                  <p className="pl-4 text-stone-500">&quot;coverage_types&quot;,</p>
                  <p className="pl-4 text-stone-500">&quot;coverage_limits&quot;,</p>
                  <p className="pl-4 text-stone-500">&quot;expiry_date&quot;</p>
                  <p><span className="text-stone-300">]</span></p>
                  <p><span className="text-emerald-400">validate:</span> <span className="text-stone-300">rules_engine</span></p>
                  <p><span className="text-emerald-400">return:</span> <span className="text-amber-400">&quot;approved&quot;</span> <span className="text-stone-600">|</span> <span className="text-red-400">&quot;rejected&quot;</span></p>
                </div>
                <p className="text-violet-400">{'}'}</p>
                <div className="mt-4 border-t border-stone-800 pt-4 space-y-1">
                  <p className="text-emerald-400">✓ Verdict: approved</p>
                  <p className="text-emerald-400">✓ Confidence: 0.97</p>
                  <p className="text-stone-500">✓ Latency: 1.4s</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Safety Pass ───────────────────────────────────────── */}
      <section className="bg-white px-6 py-24 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-14 text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-stone-200 bg-[#FAFAF8] px-3.5 py-1.5">
              <Lock className="h-3.5 w-3.5 text-stone-500" />
              <span className="text-xs font-semibold text-stone-600">The Digital Safety Pass</span>
            </div>
            <h2 className="text-3xl font-black tracking-tight text-stone-950 sm:text-4xl mb-4">
              Compliance that lives on the job site
            </h2>
            <p className="text-lg text-stone-500 max-w-xl mx-auto">
              A QR code that reflects real-time compliance status. No paper. No laminated cards. No way to fake it.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {PASS_STATES.map(({ bg, label, sub, text, card }) => (
              <div key={label} className={`rounded-2xl p-7 text-center ring-1 ${card}`}>
                <div className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl ${bg} shadow-lg`}>
                  <ScanLine className="h-8 w-8 text-white" />
                </div>
                <p className={`text-base font-black mb-1.5 ${text}`}>{label}</p>
                <p className="text-xs text-stone-500 leading-relaxed">{sub}</p>
              </div>
            ))}
          </div>

          <p className="mx-auto mt-8 max-w-xl rounded-2xl bg-stone-50 px-6 py-5 text-center text-sm text-stone-500 leading-relaxed ring-1 ring-stone-100">
            The pass is generated from a live database query — not a static QR sticker. When a document expires,
            the pass turns red automatically. No manual update required.
          </p>
        </div>
      </section>

      {/* ── Guarantees ────────────────────────────────────────── */}
      <section className="bg-[#FAFAF8] px-6 py-24 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-black tracking-tight text-stone-950 sm:text-4xl">Built for accountability</h2>
            <p className="mt-3 text-stone-500">Every decision recorded. Every actor attributed. Nothing disappears.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { Icon: FileText, title: 'Full Audit Trail',  body: 'Every AI decision, email, and override is logged with a timestamp and actor. One click exports a regulator-ready PDF.' },
              { Icon: Zap,      title: 'Sub-2s AI Review',  body: 'Gemini 2.5 Flash returns a structured verdict in under 2 seconds. The subcontractor knows immediately.'              },
              { Icon: Bell,     title: 'Proactive Alerts',  body: 'Expiry warnings at 30, 15, and 7 days — before the problem reaches the gate or the payment run.'                    },
              { Icon: Lock,     title: 'RLS-Secured Data',  body: 'Row-Level Security ensures each org sees only their own data. Service-role bypasses are logged and audited.'          },
            ].map(({ Icon, title, body }) => (
              <div key={title} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-100 transition-all hover:shadow-md">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 ring-1 ring-orange-100">
                  <Icon className="h-5 w-5 text-orange-600" />
                </div>
                <h3 className="text-sm font-bold text-stone-900 mb-2">{title}</h3>
                <p className="text-xs text-stone-500 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────── */}
      <section className="bg-stone-950 px-6 py-24 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-black text-white sm:text-4xl mb-4">See it live on your data</h2>
          <p className="text-stone-400 mb-8 text-lg">
            A 15-minute demo beats a thousand diagrams. Walk through the full pipeline on your actual subcontractor list.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2.5 rounded-full bg-orange-500 px-8 py-4 font-bold text-white transition-all hover:bg-orange-400 hover:shadow-xl hover:shadow-orange-500/20 active:scale-[.98]"
          >
            Book a Demo <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

    </div>
  )
}
