import type { Metadata } from 'next'
import Link from 'next/link'
import {
  HardHat, ArrowRight, Sparkles, ScanLine,
  GitBranch, Landmark, ShieldX, ShieldCheck,
  AlertTriangle, Zap, Lock, FileCheck,
} from 'lucide-react'
import { MarketingHeader } from '@/components/marketing/header'
import { MarketingFooter } from '@/components/marketing/footer'
import { RiskDetailBar } from '@/components/risk-score-bar'
import { AuditTimeline } from '@/components/audit-timeline'
import type { AuditEvent } from '@/types/database.types'

export const metadata: Metadata = {
  title: 'HardHat Compliance — Zero Liability. Total Gate Enforcement.',
  description:
    'The UK & Gulf\'s most advanced AI-powered compliance engine. Link your site safety directly to your checkbook. Instant COI verification, encrypted QR passes, and automatic payment holds.',
  openGraph: {
    title: 'HardHat Compliance — Zero Liability. Total Gate Enforcement.',
    description:
      'The UK & Gulf\'s most advanced AI-powered compliance engine. Link your site safety directly to your checkbook.',
    type: 'website',
  },
}

// ── Mock data for the dashboard preview ───────────────────────

const MOCK_EVENTS: AuditEvent[] = [
  {
    id: '1', subcontractor_id: 'x', organization_id: null, user_id: null,
    event_type: 'Payment Update',
    description: 'Payment status updated: Manual Review → Compliance Hold.',
    actor: 'HardHat Finance Engine',
    metadata: { old_status: 'Manual Review', new_status: 'Compliance Hold', risk_score: 82 },
    created_at: new Date(Date.now() - 1000 * 60 * 47).toISOString(),
  },
  {
    id: '2', subcontractor_id: 'x', organization_id: null, user_id: null,
    event_type: 'Audit',
    description: 'Document "General Liability COI" Flagged — AI detected expired policy (expiry date: 2024-03-15, 412 days past).',
    actor: 'HardHat AI',
    metadata: { doc_type: 'COI', audit_status: 'Flagged' },
    created_at: new Date(Date.now() - 1000 * 60 * 48).toISOString(),
  },
  {
    id: '3', subcontractor_id: 'x', organization_id: null, user_id: null,
    event_type: 'Gate Scan',
    description: 'Site access DENIED at North Entrance Gate.',
    actor: 'Gate System',
    metadata: { result: 'DENIED', gate_location: 'North Entrance Gate', denial_reasons: ['Expired COI'] },
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
  },
]

// ── Nerve Centers ─────────────────────────────────────────────

const NERVE_CENTERS = [
  {
    id: 'ai',
    Icon: Sparkles,
    eyebrow: 'Nerve Center 01',
    title: 'The AI Auditor',
    subtitle: 'Gemini 2.0 Flash',
    body: 'Submits a COI or trade license, extracts policy number, liability limits, and expiry in under 30 seconds. Flags non-compliant documents before a human ever sees them.',
    bullets: ['PDF & image OCR extraction', 'Liability threshold enforcement', 'Instant Verified / Flagged result'],
    accentBar: 'bg-emerald-500',
    accentIcon: 'bg-emerald-950 ring-emerald-700',
    accentFg: 'text-emerald-400',
    accentText: 'text-emerald-400',
    pill: 'bg-emerald-950 text-emerald-400 ring-emerald-800',
    pillLabel: '< 30s review',
  },
  {
    id: 'gate',
    Icon: ScanLine,
    eyebrow: 'Nerve Center 02',
    title: 'The Hard-Stop Gate',
    subtitle: 'Physical Enforcement',
    body: 'Every subcontractor carries a cryptographically-signed QR pass that expires every 24 hours. Green means compliant. Red means they fix it before they set foot on site.',
    bullets: ['HMAC-SHA256 signed tokens', '24-hour rolling TTL', 'Full-screen GRANTED / DENIED display'],
    accentBar: 'bg-amber-400',
    accentIcon: 'bg-amber-950 ring-amber-700',
    accentFg: 'text-amber-400',
    accentText: 'text-amber-400',
    pill: 'bg-amber-950 text-amber-400 ring-amber-800',
    pillLabel: '100% gate coverage',
  },
  {
    id: 'thread',
    Icon: GitBranch,
    eyebrow: 'Nerve Center 03',
    title: 'The Golden Thread',
    subtitle: 'Immutable Audit Ledger',
    body: 'Every document review, gate scan, and override is permanently recorded in an append-only audit ledger. One click generates a regulator-ready PDF for legal defence.',
    bullets: ['Append-only event architecture', 'Timestamped acting agent attribution', 'Instant print-to-PDF export'],
    accentBar: 'bg-indigo-500',
    accentIcon: 'bg-indigo-950 ring-indigo-700',
    accentFg: 'text-indigo-400',
    accentText: 'text-indigo-400',
    pill: 'bg-indigo-950 text-indigo-400 ring-indigo-800',
    pillLabel: 'UK BSA compliant',
  },
  {
    id: 'payment',
    Icon: Landmark,
    eyebrow: 'Nerve Center 04',
    title: 'The Payment Gate',
    subtitle: 'Compliance-to-Finance',
    body: 'Risk score hits 71? The engine automatically issues a Compliance Hold. No one on finance releases a payment until the documents are clean. Every override is logged forever.',
    bullets: ['Automatic hold on risk ≥ 71', 'Mandatory override reason logging', 'Sage / QuickBooks CSV export'],
    accentBar: 'bg-violet-500',
    accentIcon: 'bg-violet-950 ring-violet-700',
    accentFg: 'text-violet-400',
    accentText: 'text-violet-400',
    pill: 'bg-violet-950 text-violet-400 ring-violet-800',
    pillLabel: 'Finance-linked',
  },
]

const STATS = [
  { value: '< 30s', label: 'AI document review', sub: 'Per submission' },
  { value: '100%', label: 'Gate-verified access', sub: 'No pass, no entry' },
  { value: '0',    label: 'Manual audits',       sub: 'Fully automated' },
  { value: '∞',    label: 'Audit trail depth',   sub: 'Immutable ledger' },
]

// ── Page ───────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <MarketingHeader />

      <main className="flex-1">

        {/* ═══════════════════════════════════════════════════
            HERO — Broken Grid
        ═══════════════════════════════════════════════════ */}
        <section className="relative overflow-hidden bg-slate-950 px-6 pt-20 pb-0 lg:px-8">
          {/* Thin grid overlay — the "industrial" texture */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)',
              backgroundSize: '64px 64px',
            }}
          />
          {/* Radial glow — amber, top-left */}
          <div className="pointer-events-none absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-amber-500/10 blur-3xl" />
          {/* Radial glow — emerald, bottom-right */}
          <div className="pointer-events-none absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-emerald-500/8 blur-3xl" />

          <div className="relative mx-auto max-w-7xl">
            <div className="grid items-center gap-12 lg:grid-cols-[1fr_480px] lg:gap-16">

              {/* Left: Headline */}
              <div className="py-8 lg:py-20">
                {/* Eyebrow pill */}
                <div className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-amber-500/25 bg-amber-500/8 px-4 py-1.5 backdrop-blur-sm">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">
                    AI-Powered · UK &amp; Gulf Compliance
                  </span>
                </div>

                <h1 className="text-5xl font-black leading-[0.95] tracking-tighter text-white sm:text-7xl lg:text-[80px]">
                  Zero Liability.
                  <br />
                  <span className="text-amber-400">Total Gate</span>
                  <br />
                  Enforcement.
                </h1>

                <p className="mt-8 max-w-lg text-lg leading-relaxed text-slate-400">
                  The UK &amp; Gulf&apos;s most advanced AI-powered compliance engine.
                  Link your site safety directly to your checkbook.
                </p>

                <div className="mt-10 flex flex-wrap gap-4">
                  <Link
                    href="/contact"
                    className="inline-flex items-center gap-2.5 rounded-xl bg-amber-500 px-7 py-3.5 text-sm font-bold text-slate-950 transition-all hover:bg-amber-400 hover:shadow-xl hover:shadow-amber-500/25 active:scale-[.98]"
                  >
                    Book a Live Demo
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/how-it-works"
                    className="inline-flex items-center gap-2.5 rounded-xl border border-slate-700 px-7 py-3.5 text-sm font-semibold text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
                  >
                    See How It Works
                  </Link>
                </div>

                {/* Trust marks */}
                <div className="mt-10 flex flex-wrap items-center gap-6">
                  {[
                    { Icon: Lock,      text: 'HMAC-signed passes'    },
                    { Icon: FileCheck, text: 'UK Building Safety Act' },
                    { Icon: Zap,       text: 'AI in 30 seconds'       },
                  ].map(({ Icon, text }) => (
                    <div key={text} className="flex items-center gap-2 text-xs text-slate-500">
                      <Icon className="h-3.5 w-3.5 text-slate-600" />
                      {text}
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Command terminal — "broken" out of grid baseline */}
              <div className="relative lg:-mb-1 lg:translate-y-6">
                {/* Outer glow ring */}
                <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-amber-500/20 via-transparent to-emerald-500/20 blur-sm" />
                <div className="relative rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl shadow-black/50 overflow-hidden">
                  {/* Terminal top bar */}
                  <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-950/60 px-4 py-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
                    <span className="ml-3 font-mono text-[11px] text-slate-600">hardhat — command center</span>
                    <span className="ml-auto flex h-1.5 w-1.5 items-center justify-center">
                      <span className="absolute h-2.5 w-2.5 animate-ping rounded-full bg-emerald-400/40" />
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    </span>
                  </div>

                  <div className="p-5 space-y-3">
                    {/* Fleet health bar */}
                    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Fleet Readiness</span>
                        <span className="text-xs font-bold text-amber-400">62%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                        <div className="h-full w-[62%] rounded-full bg-amber-400" />
                      </div>
                      <p className="mt-2 text-[11px] text-slate-600">5 of 8 subcontractors site-ready</p>
                    </div>

                    {/* Sub rows */}
                    {[
                      { name: 'Apex Electric LLC',       status: 'GRANTED', dot: 'bg-emerald-400', text: 'text-emerald-400', payment: 'Clear to Pay',     payColor: 'text-emerald-400' },
                      { name: 'Sierra Plumbing Co.',     status: 'REVIEW',  dot: 'bg-amber-400',   text: 'text-amber-400',  payment: 'Manual Review',    payColor: 'text-amber-400'  },
                      { name: 'Apex Welding Ltd.',       status: 'DENIED',  dot: 'bg-red-500',     text: 'text-red-400',    payment: 'Compliance Hold',  payColor: 'text-red-400'    },
                      { name: 'Blue Ridge HVAC',         status: 'GRANTED', dot: 'bg-emerald-400', text: 'text-emerald-400',payment: 'Clear to Pay',     payColor: 'text-emerald-400'},
                    ].map(({ name, status, dot, text, payment, payColor }) => (
                      <div key={name} className="flex items-center justify-between rounded-lg border border-slate-800/60 bg-slate-900 px-3.5 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
                          <span className="text-xs font-medium text-slate-300">{name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] font-bold ${payColor}`}>{payment}</span>
                          <span className={`text-[10px] font-black ${text}`}>{status}</span>
                        </div>
                      </div>
                    ))}

                    {/* AI activity strip */}
                    <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 px-3.5 py-2.5">
                      <p className="text-[11px] text-indigo-300">
                        <span className="font-bold">⚡ HardHat AI</span> scanned 3 documents · 1 Compliance Hold issued · 2 payments released
                      </p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            STATS STRIP
        ═══════════════════════════════════════════════════ */}
        <section className="border-y border-slate-800 bg-slate-900/60">
          <div className="mx-auto max-w-7xl">
            <div className="grid grid-cols-2 divide-x divide-slate-800 lg:grid-cols-4">
              {STATS.map(({ value, label, sub }) => (
                <div key={label} className="px-8 py-8 text-center">
                  <p className="text-4xl font-black text-white">{value}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-300">{label}</p>
                  <p className="mt-0.5 text-xs text-slate-600">{sub}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            NERVE CENTERS — Feature Grid
        ═══════════════════════════════════════════════════ */}
        <section className="relative bg-slate-950 px-6 py-24 lg:px-8">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }}
          />
          <div className="relative mx-auto max-w-7xl">
            {/* Section header */}
            <div className="mb-16 max-w-2xl">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-amber-400">
                The Four Nerve Centers
              </p>
              <h2 className="text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl">
                One platform.
                <br />
                <span className="text-slate-500">No gaps between</span>
                <br />
                safety and payment.
              </h2>
              <p className="mt-5 text-lg text-slate-500">
                Every nerve center is live, interconnected, and fully automated.
                Risk in one system propagates instantly to all others.
              </p>
            </div>

            {/* Card grid */}
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {NERVE_CENTERS.map((nc) => (
                <div
                  key={nc.id}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 transition-all duration-300 hover:border-slate-700 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/40"
                >
                  {/* Top accent bar */}
                  <div className={`h-0.5 w-full ${nc.accentBar}`} />

                  <div className="flex flex-1 flex-col p-6">
                    {/* Eyebrow + pill */}
                    <div className="mb-5 flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-600">
                        {nc.eyebrow}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${nc.pill}`}>
                        {nc.pillLabel}
                      </span>
                    </div>

                    {/* Icon */}
                    <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ring-1 ${nc.accentIcon}`}>
                      <nc.Icon className={`h-5 w-5 ${nc.accentFg}`} />
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-black text-white">{nc.title}</h3>
                    <p className={`mt-0.5 text-xs font-semibold ${nc.accentText}`}>{nc.subtitle}</p>

                    {/* Body */}
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-500">{nc.body}</p>

                    {/* Bullets */}
                    <ul className="mt-5 space-y-1.5 border-t border-slate-800 pt-4">
                      {nc.bullets.map((b) => (
                        <li key={b} className="flex items-center gap-2 text-xs text-slate-400">
                          <span className={`h-1 w-1 shrink-0 rounded-full ${nc.accentBar}`} />
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            MINI-DASHBOARD PREVIEW — "The Threat Is Real"
        ═══════════════════════════════════════════════════ */}
        <section className="relative overflow-hidden bg-slate-900 px-6 py-24 lg:px-8">
          {/* Glow: red top-right for the "danger" feel */}
          <div className="pointer-events-none absolute -top-40 right-0 h-[600px] w-[500px] rounded-full bg-red-500/5 blur-3xl" />

          <div className="relative mx-auto max-w-7xl">
            <div className="grid items-start gap-16 lg:grid-cols-2">

              {/* Left: copy */}
              <div className="lg:sticky lg:top-24 lg:pt-4">
                <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-red-400">
                  Risk Intelligence · Live
                </p>
                <h2 className="text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl">
                  The engine sees
                  <br />
                  <span className="text-red-400">what your team</span>
                  <br />
                  misses.
                </h2>
                <p className="mt-6 text-lg leading-relaxed text-slate-500">
                  Below is a live render of HardHat&apos;s Risk Intelligence panel. An expired COI was
                  flagged by AI 8 hours ago. The engine automatically issued a Compliance Hold,
                  blocked the gate, and froze the payment — no human intervention.
                </p>

                <div className="mt-8 space-y-4">
                  {[
                    { Icon: ShieldX,       label: 'Auto-blocked at gate',        color: 'text-red-400',   bg: 'bg-red-950 ring-red-800'     },
                    { Icon: AlertTriangle, label: 'Compliance Hold issued',       color: 'text-amber-400', bg: 'bg-amber-950 ring-amber-800' },
                    { Icon: ShieldCheck,   label: 'Golden Thread logged forever', color: 'text-indigo-400', bg: 'bg-indigo-950 ring-indigo-800' },
                  ].map(({ Icon, label, color, bg }) => (
                    <div key={label} className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ${bg}`}>
                        <Icon className={`h-4 w-4 ${color}`} />
                      </div>
                      <span className="text-sm font-medium text-slate-300">{label}</span>
                    </div>
                  ))}
                </div>

                <Link
                  href="/contact"
                  className="mt-10 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold text-slate-950 transition-all hover:bg-amber-400 hover:shadow-lg hover:shadow-amber-500/20"
                >
                  See It On Your Data
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              {/* Right: actual dashboard preview */}
              <div className="space-y-4">
                {/* Subcontractor profile card */}
                <div className="overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-950 shadow-2xl">
                  {/* Card header */}
                  <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-xs font-black text-white ring-1 ring-slate-700">
                        AW
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Apex Welding Ltd.</p>
                        <p className="text-xs text-slate-500">operations@apexwelding.co.uk</p>
                      </div>
                    </div>
                    {/* Payment status pill */}
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-950 px-3 py-1 text-xs font-bold text-red-400 ring-1 ring-red-800">
                      <ShieldX className="h-3 w-3" />
                      Compliance Hold
                    </span>
                  </div>

                  {/* Risk score */}
                  <div className="border-b border-slate-800/60 px-5 py-4">
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-600">Live Risk Score</p>
                    <RiskDetailBar score={82} />
                  </div>

                  {/* Doc status */}
                  <div className="px-5 py-4">
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-600">Insurance Vault</p>
                    <div className="space-y-2">
                      {[
                        { name: 'General Liability COI', status: 'Flagged', expiry: 'Expired 2024-03-15', statusClass: 'bg-red-950 text-red-400 ring-red-800' },
                        { name: 'Trade License UK', status: 'Verified', expiry: 'Valid to 2026-01-10', statusClass: 'bg-emerald-950 text-emerald-400 ring-emerald-800' },
                      ].map((doc) => (
                        <div key={doc.name} className="flex items-center justify-between rounded-lg border border-slate-800/60 bg-slate-900 px-3.5 py-2.5">
                          <div>
                            <p className="text-xs font-medium text-slate-300">{doc.name}</p>
                            <p className="text-[10px] text-slate-600">{doc.expiry}</p>
                          </div>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${doc.statusClass}`}>
                            {doc.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Golden Thread preview */}
                <div className="overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-950">
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
            LOGO / TRUST SECTION
        ═══════════════════════════════════════════════════ */}
        <section className="border-y border-slate-800 bg-slate-950/80 px-6 py-14 lg:px-8">
          <div className="mx-auto max-w-5xl text-center">
            <p className="mb-10 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-600">
              Built for the standards used by
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
              {[
                'Turner Construction',
                'Skanska UK',
                'AECOM',
                'Balfour Beatty',
                'Mace Group',
              ].map((name) => (
                <span key={name} className="select-none text-base font-black tracking-tight text-slate-700 transition-colors hover:text-slate-500">
                  {name}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            CTA BANNER
        ═══════════════════════════════════════════════════ */}
        <section className="relative overflow-hidden bg-slate-950 px-6 py-24 lg:px-8">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/6 blur-3xl" />
          </div>
          <div className="relative mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900 px-4 py-1.5">
              <HardHat className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-xs font-semibold text-slate-400">Enterprise · UK &amp; Gulf Ready</span>
            </div>
            <h2 className="text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              Your first Compliance Hold
              <br />
              <span className="text-amber-400">prevents the next lawsuit.</span>
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg text-slate-500">
              Book a 20-minute live demo. We will run the full Hard-Stop loop on your actual subcontractor list — and show you what the AI flags in real time.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2.5 rounded-xl bg-amber-500 px-8 py-4 text-base font-bold text-slate-950 transition-all hover:bg-amber-400 hover:shadow-2xl hover:shadow-amber-500/30 active:scale-[.98]"
              >
                Book a Live Demo
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/pricing"
                className="text-sm font-medium text-slate-500 underline underline-offset-4 transition-colors hover:text-white"
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
