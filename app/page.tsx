import type { Metadata } from 'next'
import Link from 'next/link'
import {
  HardHat, ArrowRight, Sparkles, ScanLine, GitBranch,
  Landmark, ShieldX, ShieldCheck, AlertTriangle, CheckCircle,
  Clock, Users, Zap, Lock, FileCheck, X,
} from 'lucide-react'
import { MarketingHeader } from '@/components/marketing/header'
import { MarketingFooter } from '@/components/marketing/footer'
import { RiskDetailBar } from '@/components/risk-score-bar'
import { AuditTimeline } from '@/components/audit-timeline'
import { StepByStep } from '@/components/marketing/step-by-step'
import type { AuditEvent } from '@/types/database.types'

export const metadata: Metadata = {
  title: 'HardHat Compliance — Zero Liability. Total Gate Enforcement.',
  description:
    "The UK & Gulf's most advanced AI-powered compliance engine. Link your site safety directly to your checkbook. Instant COI verification, encrypted QR passes, and automatic payment holds.",
  openGraph: {
    title: 'HardHat Compliance — Zero Liability. Total Gate Enforcement.',
    description: "The UK & Gulf's most advanced AI-powered compliance engine. Link your site safety directly to your checkbook.",
    type: 'website',
  },
}

const MOCK_EVENTS: AuditEvent[] = [
  {
    id: '1', subcontractor_id: 'x', organization_id: null, user_id: null,
    event_type: 'Payment Update',
    description: 'Payment status: Manual Review → Compliance Hold.',
    actor: 'HardHat Finance Engine',
    metadata: { risk_score: 82 },
    created_at: new Date(Date.now() - 1000 * 60 * 47).toISOString(),
  },
  {
    id: '2', subcontractor_id: 'x', organization_id: null, user_id: null,
    event_type: 'Audit',
    description: '"General Liability COI" flagged — expired policy detected.',
    actor: 'HardHat AI',
    metadata: {},
    created_at: new Date(Date.now() - 1000 * 60 * 48).toISOString(),
  },
  {
    id: '3', subcontractor_id: 'x', organization_id: null, user_id: null,
    event_type: 'Gate Scan',
    description: 'Site access DENIED — North Entrance Gate.',
    actor: 'Gate System',
    metadata: { result: 'DENIED' },
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
  },
]

const BEFORE_AFTER = [
  { before: 'Chasing PDFs over email',             after: 'Subs upload to their own portal'      },
  { before: '72 hrs to find a lapsed COI',          after: 'AI flags it in under 30 seconds'      },
  { before: 'Paper clipboards at the site gate',    after: 'QR Safety Pass, instantly scanned'    },
  { before: 'Manual payment hold decisions',        after: 'Automatic compliance gate'            },
  { before: '3+ admin hours per sub per week',      after: 'Zero manual document work'            },
]

const FEATURES = [
  {
    eyebrow: 'The AI Auditor',
    title: 'Document review in under 30 seconds.',
    body: 'Gemini 2.5 Flash extracts every field from a COI or trade license — policy number, limits, expiry, holder name — and checks it against your rules. The verdict is instant. The subcontractor gets an email before you even check the dashboard.',
    bullets: ['PDF, PNG, and JPEG support', 'Liability threshold enforcement', 'Name-match verification'],
    Icon: Sparkles,
  },
  {
    eyebrow: 'The Hard-Stop Gate',
    title: 'Compliance that lives at the entrance.',
    body: 'Every subcontractor carries a cryptographically-signed QR Safety Pass that reflects their live compliance status. Scan it. Green means cleared. Red means they fix it first. No debates, no clipboards, no exceptions.',
    bullets: ['HMAC-SHA256 signed tokens', '24-hour rolling TTL', 'Full-screen GRANTED / DENIED'],
    Icon: ScanLine,
  },
  {
    eyebrow: 'The Golden Thread',
    title: 'An immutable record of everything.',
    body: 'Every document review, gate scan, payment hold, and manual override is logged forever in an append-only audit ledger. When a regulator asks what happened, you have a timestamped, actor-attributed answer. One click exports it as a PDF.',
    bullets: ['Append-only event log', 'Actor attribution on every action', 'Instant regulator-ready PDF'],
    Icon: GitBranch,
  },
  {
    eyebrow: 'The Payment Gate',
    title: 'Risk score hits 71. Payment stops.',
    body: 'The moment a subcontractor\'s compliance risk crosses the threshold, the engine automatically issues a Compliance Hold. No one in finance can release the payment until the documents are clean — and every override requires a logged reason.',
    bullets: ['Automatic hold on risk ≥ 71', 'Mandatory override audit trail', 'CSV export for Sage & QuickBooks'],
    Icon: Landmark,
  },
]

const TESTIMONIALS = [
  {
    quote: "We had a worker on site for three weeks before we realised his COI had expired. With HardHat, that cannot happen — the gate turns red automatically.",
    name: 'James Whitfield',
    role: 'Site Manager · Meridian Build Group',
    initials: 'JW',
  },
  {
    quote: "I used to spend every Friday morning chasing PDFs from twelve subs. Now I open a dashboard, see the status, and move on. That's the whole process.",
    name: "Sarah O'Brien",
    role: "General Contractor · O'Brien Civil Works",
    initials: 'SO',
  },
  {
    quote: "The first time HardHat blocked a payment because of a lapsed certificate, my insurance broker called me to say thank you.",
    name: 'Omar Al-Rashid',
    role: 'VP Operations · Gulf States Construction',
    initials: 'OA',
  },
]

// ── Page ───────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAF8]">
      <MarketingHeader />
      <main className="flex-1">

        {/* ═══════════════════════════════════════════════════
            HERO
        ═══════════════════════════════════════════════════ */}
        <section className="bg-[#FAFAF8] px-6 pb-0 pt-20 lg:px-8">
          <div className="mx-auto max-w-7xl">

            {/* Eyebrow */}
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-1.5 shadow-sm">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-500" />
              <span className="text-xs font-semibold text-stone-500 tracking-wide">
                AI-Powered Compliance · UK &amp; Gulf · Beta
              </span>
            </div>

            <div className="grid items-end gap-12 lg:grid-cols-[1fr_520px]">

              {/* Left: headline */}
              <div>
                <h1 className="text-6xl font-black leading-[0.92] tracking-tighter text-stone-950 sm:text-7xl lg:text-8xl">
                  Zero<br />
                  liability.<br />
                  <span className="text-orange-500">Total gate</span><br />
                  enforcement.
                </h1>

                <p className="mt-8 max-w-md text-lg leading-relaxed text-stone-500">
                  The UK &amp; Gulf&apos;s most advanced AI compliance engine.
                  Link your site safety directly to your checkbook — automatically.
                </p>

                <div className="mt-10 flex flex-wrap items-center gap-4">
                  <Link
                    href="/contact"
                    className="inline-flex items-center gap-2.5 rounded-full bg-orange-500 px-7 py-3.5 text-sm font-bold text-white transition-all hover:bg-orange-600 hover:shadow-lg hover:shadow-orange-200 active:scale-[.98]"
                  >
                    Book a Live Demo
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/how-it-works"
                    className="text-sm font-semibold text-stone-500 underline underline-offset-4 transition-colors hover:text-stone-900"
                  >
                    See how it works
                  </Link>
                </div>

                {/* Trust marks */}
                <div className="mt-10 flex flex-wrap items-center gap-5">
                  {[
                    { Icon: Lock,      text: 'HMAC-signed passes'     },
                    { Icon: FileCheck, text: 'UK Building Safety Act'  },
                    { Icon: Zap,       text: 'AI verdict in 30 seconds'},
                  ].map(({ Icon, text }) => (
                    <div key={text} className="flex items-center gap-1.5 text-xs text-stone-400">
                      <Icon className="h-3.5 w-3.5" />
                      {text}
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: product card (browser frame) */}
              <div className="relative pb-0 lg:translate-y-4">
                {/* Shadow layer */}
                <div className="absolute -bottom-4 left-4 right-4 h-full rounded-3xl bg-stone-300/40 blur-2xl" />

                {/* Card */}
                <div className="relative overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-stone-100">
                  {/* Browser chrome */}
                  <div className="flex items-center gap-2 border-b border-stone-100 bg-stone-50 px-4 py-3">
                    <div className="flex gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                      <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                      <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    </div>
                    <div className="ml-2 flex-1 rounded-md bg-stone-100 px-3 py-1 text-center font-mono text-[11px] text-stone-400">
                      app.hardhatcompliance.com
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                      <span className="text-[10px] text-stone-400">Live</span>
                    </div>
                  </div>

                  {/* App content */}
                  <div className="p-5 space-y-3">
                    {/* Fleet health */}
                    <div className="rounded-xl bg-stone-50 p-4 ring-1 ring-stone-100">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-widest text-stone-400">Fleet Readiness</span>
                        <span className="text-sm font-black text-orange-600">62%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-stone-200">
                        <div className="h-full w-[62%] rounded-full bg-orange-500" />
                      </div>
                      <p className="mt-1.5 text-[11px] text-stone-400">5 of 8 subcontractors site-ready</p>
                    </div>

                    {/* Subcontractor rows */}
                    {[
                      { name: 'Apex Electric LLC',   status: 'Clear to Pay',    dot: 'bg-emerald-400', text: 'text-emerald-700',  badge: 'bg-emerald-50 ring-emerald-100'  },
                      { name: 'Sierra Plumbing Co.', status: 'Manual Review',   dot: 'bg-amber-400',   text: 'text-amber-700',    badge: 'bg-amber-50 ring-amber-100'      },
                      { name: 'Apex Welding Ltd.',   status: 'Compliance Hold', dot: 'bg-red-400',     text: 'text-red-700',      badge: 'bg-red-50 ring-red-100'          },
                      { name: 'Blue Ridge HVAC',     status: 'Clear to Pay',    dot: 'bg-emerald-400', text: 'text-emerald-700',  badge: 'bg-emerald-50 ring-emerald-100'  },
                    ].map(({ name, status, dot, text, badge }) => (
                      <div key={name} className="flex items-center justify-between rounded-xl border border-stone-100 bg-white px-3.5 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
                          <span className="text-xs font-medium text-stone-700">{name}</span>
                        </div>
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ring-1 ${text} ${badge}`}>
                          {status}
                        </span>
                      </div>
                    ))}

                    {/* AI strip */}
                    <div className="rounded-xl bg-orange-50 px-3.5 py-2.5 ring-1 ring-orange-100">
                      <p className="text-[11px] text-orange-700">
                        <span className="font-bold">⚡ HardHat AI</span> — 3 docs scanned · 1 hold issued · 2 payments released
                      </p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            TRUST BAR
        ═══════════════════════════════════════════════════ */}
        <section className="bg-white px-6 py-12 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <p className="mb-8 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-400">
              Built for the standards required by teams at
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
              {['Turner Construction', 'Skanska UK', 'AECOM', 'Balfour Beatty', 'Mace Group'].map((name) => (
                <span key={name} className="select-none text-sm font-bold text-stone-300 transition-colors hover:text-stone-500">
                  {name}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            STATS
        ═══════════════════════════════════════════════════ */}
        <section className="border-y border-stone-100 bg-[#FAFAF8] px-6 py-16 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
              {[
                { value: '< 30s', label: 'AI document review',  sub: 'Per submission'     },
                { value: '100%',  label: 'Gate-verified access', sub: 'No pass, no entry' },
                { value: '0',     label: 'Manual audits needed', sub: 'Fully automated'   },
                { value: '∞',     label: 'Audit trail depth',    sub: 'Immutable ledger'  },
              ].map(({ value, label, sub }) => (
                <div key={label} className="text-center">
                  <p className="text-5xl font-black tracking-tight text-stone-950">{value}</p>
                  <p className="mt-2 text-sm font-semibold text-stone-700">{label}</p>
                  <p className="mt-0.5 text-xs text-stone-400">{sub}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            PROBLEM — Before vs After
        ═══════════════════════════════════════════════════ */}
        <section className="bg-white px-6 py-28 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-16 max-w-xl">
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-orange-600">The Problem</p>
              <h2 className="text-4xl font-black leading-tight tracking-tight text-stone-950 sm:text-5xl">
                Still managing compliance
                <br />
                in spreadsheets?
              </h2>
              <p className="mt-5 text-lg text-stone-500">
                Every day a manual process runs on your site, liability compounds.
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl ring-1 ring-stone-100 shadow-sm">
              {/* Header row */}
              <div className="grid grid-cols-[1fr_1px_1fr] bg-stone-50">
                <div className="flex items-center gap-2 px-6 py-3.5">
                  <div className="h-2 w-2 rounded-full bg-red-400" />
                  <span className="text-xs font-bold uppercase tracking-widest text-stone-400">The Old Way</span>
                </div>
                <div className="bg-stone-100" />
                <div className="flex items-center gap-2 px-6 py-3.5">
                  <div className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="text-xs font-bold uppercase tracking-widest text-stone-400">With HardHat</span>
                </div>
              </div>

              {BEFORE_AFTER.map(({ before, after }, i) => (
                <div
                  key={i}
                  className={`grid grid-cols-[1fr_1px_1fr] bg-white ${i < BEFORE_AFTER.length - 1 ? 'border-b border-stone-50' : ''}`}
                >
                  <div className="flex items-center gap-3 px-6 py-4">
                    <X className="h-4 w-4 shrink-0 text-red-400" />
                    <span className="text-sm text-stone-500">{before}</span>
                  </div>
                  <div className="bg-stone-100" />
                  <div className="flex items-center gap-3 px-6 py-4">
                    <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
                    <span className="text-sm font-medium text-stone-800">{after}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            STEP-BY-STEP
        ═══════════════════════════════════════════════════ */}
        <section className="bg-[#FAFAF8] px-6 py-28 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-16 text-center">
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-orange-600">Step-by-Step Guide</p>
              <h2 className="text-4xl font-black tracking-tight text-stone-950 sm:text-5xl">
                Go live in under <span className="text-orange-500">15 minutes.</span>
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-lg text-stone-500">
                No training. No integrations. Create a project, invite your subs, let the AI do the rest.
              </p>
            </div>
            <StepByStep />
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            FEATURES — The Four Nerve Centers
        ═══════════════════════════════════════════════════ */}
        <section className="bg-white px-6 py-28 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-16 max-w-xl">
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-orange-600">Four Nerve Centers</p>
              <h2 className="text-4xl font-black leading-tight tracking-tight text-stone-950 sm:text-5xl">
                One platform.
                <br />
                No gaps between
                <br />
                <span className="text-stone-400">safety and payment.</span>
              </h2>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {FEATURES.map(({ eyebrow, title, body, bullets, Icon }) => (
                <div
                  key={eyebrow}
                  className="flex flex-col rounded-2xl bg-[#FAFAF8] p-7 ring-1 ring-stone-100 transition-all hover:-translate-y-1 hover:bg-white hover:shadow-md"
                >
                  <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl bg-white ring-1 ring-stone-100 shadow-sm">
                    <Icon className="h-5 w-5 text-stone-700" />
                  </div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-orange-600">{eyebrow}</p>
                  <h3 className="mb-3 text-base font-black leading-snug text-stone-950">{title}</h3>
                  <p className="flex-1 text-sm leading-relaxed text-stone-500">{body}</p>
                  <ul className="mt-5 space-y-1.5 border-t border-stone-100 pt-5">
                    {bullets.map((b) => (
                      <li key={b} className="flex items-center gap-2 text-xs text-stone-500">
                        <span className="h-1 w-1 shrink-0 rounded-full bg-orange-400" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            RISK INTELLIGENCE PREVIEW
        ═══════════════════════════════════════════════════ */}
        <section className="bg-[#FAFAF8] px-6 py-28 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid items-start gap-16 lg:grid-cols-2">

              <div className="lg:sticky lg:top-24">
                <p className="mb-4 text-xs font-bold uppercase tracking-widest text-orange-600">
                  Risk Intelligence · Live
                </p>
                <h2 className="text-4xl font-black leading-tight tracking-tight text-stone-950 sm:text-5xl">
                  The engine sees
                  <br />
                  <span className="text-stone-400">what your team</span>
                  <br />
                  misses.
                </h2>
                <p className="mt-6 text-lg leading-relaxed text-stone-500">
                  An expired COI was flagged 8 hours ago. The engine automatically issued a
                  Compliance Hold, blocked the gate, and froze the payment — no human involved.
                </p>

                <div className="mt-8 space-y-3">
                  {[
                    { Icon: ShieldX,       label: 'Auto-blocked at gate',        note: 'Immediately on expiry'   },
                    { Icon: AlertTriangle, label: 'Compliance Hold issued',       note: 'Payment frozen instantly' },
                    { Icon: ShieldCheck,   label: 'Golden Thread logged forever', note: 'Regulator-ready'         },
                  ].map(({ Icon, label, note }) => (
                    <div key={label} className="flex items-center gap-3.5 rounded-xl bg-white px-4 py-3.5 ring-1 ring-stone-100 shadow-sm">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-stone-100">
                        <Icon className="h-4 w-4 text-stone-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-stone-900">{label}</p>
                        <p className="text-xs text-stone-400">{note}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <Link
                  href="/contact"
                  className="mt-10 inline-flex items-center gap-2 rounded-full bg-orange-500 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-orange-600 hover:shadow-lg hover:shadow-orange-100 active:scale-[.98]"
                >
                  See It On Your Data
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              {/* Right: dark product screenshot */}
              <div className="space-y-4">
                <div className="overflow-hidden rounded-2xl bg-slate-950 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-xs font-black text-white ring-1 ring-slate-700">AW</div>
                      <div>
                        <p className="text-sm font-bold text-white">Apex Welding Ltd.</p>
                        <p className="text-xs text-slate-500">operations@apexwelding.co.uk</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-950 px-3 py-1 text-xs font-bold text-red-400 ring-1 ring-red-800">
                      <ShieldX className="h-3 w-3" />
                      Compliance Hold
                    </span>
                  </div>
                  <div className="border-b border-slate-800/60 px-5 py-4">
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-600">Live Risk Score</p>
                    <RiskDetailBar score={82} />
                  </div>
                  <div className="px-5 py-4">
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-600">Insurance Vault</p>
                    <div className="space-y-2">
                      {[
                        { name: 'General Liability COI', status: 'Flagged',  expiry: 'Expired 2024-03-15', cls: 'bg-red-950 text-red-400 ring-red-800'          },
                        { name: 'Trade License UK',       status: 'Verified', expiry: 'Valid to 2026-01-10', cls: 'bg-emerald-950 text-emerald-400 ring-emerald-800' },
                      ].map((doc) => (
                        <div key={doc.name} className="flex items-center justify-between rounded-lg border border-slate-800/60 bg-slate-900 px-3.5 py-2.5">
                          <div>
                            <p className="text-xs font-medium text-slate-300">{doc.name}</p>
                            <p className="text-[10px] text-slate-600">{doc.expiry}</p>
                          </div>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${doc.cls}`}>{doc.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl bg-slate-950">
                  <div className="flex items-center gap-2.5 border-b border-slate-800 px-5 py-3.5">
                    <GitBranch className="h-3.5 w-3.5 text-indigo-400" />
                    <p className="text-xs font-bold text-white">Golden Thread</p>
                    <span className="ml-auto text-[10px] text-slate-600">Immutable · {MOCK_EVENTS.length} events</span>
                  </div>
                  <div className="px-5 py-4">
                    <AuditTimeline events={MOCK_EVENTS} />
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            TESTIMONIALS
        ═══════════════════════════════════════════════════ */}
        <section className="bg-white px-6 py-28 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-16 text-center">
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-orange-600">From the Field</p>
              <h2 className="text-4xl font-black tracking-tight text-stone-950 sm:text-5xl">
                GCs who switched
                <br />
                <span className="text-stone-400">don&apos;t go back.</span>
              </h2>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {TESTIMONIALS.map(({ quote, name, role, initials }) => (
                <div
                  key={name}
                  className="flex flex-col rounded-2xl bg-[#FAFAF8] p-8 ring-1 ring-stone-100 transition-all hover:shadow-md hover:bg-white"
                >
                  <p className="mb-2 text-3xl font-black leading-none text-stone-200">&ldquo;</p>
                  <p className="flex-1 text-base leading-relaxed text-stone-600">{quote}</p>
                  <div className="mt-8 flex items-center gap-3 border-t border-stone-100 pt-6">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-900 text-xs font-black text-white">
                      {initials}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-stone-900">{name}</p>
                      <p className="text-xs text-stone-400">{role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            QUICK FAQ
        ═══════════════════════════════════════════════════ */}
        <section className="bg-[#FAFAF8] px-6 py-20 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-5 sm:grid-cols-3">
              {[
                {
                  q: 'Do subs need an account?',
                  a: 'No. They click a secure email link, upload their documents, and get an AI verdict — no registration, no app, no password.',
                  Icon: Users,
                },
                {
                  q: 'How fast is the AI review?',
                  a: 'Under 30 seconds for most documents. The verdict — approved or rejected with a reason — is emailed to the sub instantly.',
                  Icon: Zap,
                },
                {
                  q: 'What happens when a document expires?',
                  a: 'Warnings go out at 30, 15, and 7 days. On expiry the Safety Pass turns red and the Payment Gate holds automatically.',
                  Icon: Clock,
                },
              ].map(({ q, a, Icon }) => (
                <div key={q} className="rounded-2xl bg-white px-6 py-6 ring-1 ring-stone-100 shadow-sm">
                  <Icon className="mb-4 h-5 w-5 text-orange-500" />
                  <h3 className="mb-2 text-sm font-bold text-stone-900">{q}</h3>
                  <p className="text-xs leading-relaxed text-stone-500">{a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            CTA — ONE dark section
        ═══════════════════════════════════════════════════ */}
        <section className="bg-stone-950 px-6 py-28 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-stone-800 bg-stone-900 px-4 py-1.5">
              <HardHat className="h-3.5 w-3.5 text-orange-400" />
              <span className="text-xs font-semibold text-stone-400">Enterprise · UK &amp; Gulf Ready</span>
            </div>

            <h2 className="text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              Your first Compliance Hold
              <br />
              <span className="text-orange-400">prevents the next lawsuit.</span>
            </h2>

            <p className="mx-auto mt-6 max-w-xl text-lg text-stone-400">
              Book a 20-minute live demo. We&apos;ll run the full Hard-Stop loop on your actual subcontractor list
              and show you what the AI flags in real time.
            </p>

            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2.5 rounded-full bg-orange-500 px-8 py-4 text-base font-bold text-white transition-all hover:bg-orange-400 hover:shadow-2xl hover:shadow-orange-500/20 active:scale-[.98]"
              >
                Book a Live Demo
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/pricing"
                className="text-sm font-medium text-stone-500 underline underline-offset-4 transition-colors hover:text-white"
              >
                View pricing →
              </Link>
            </div>
          </div>
        </section>

      </main>
      <MarketingFooter />
    </div>
  )
}
