import type { Metadata } from 'next'
import Link from 'next/link'
import { Check, Minus, Zap, Building2, Shield, ArrowRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Pricing — HardHat Compliance',
  description:
    'Simple, transparent pricing for construction compliance management. Start free, scale with Pro at $49/mo per project, or contact us for Enterprise bulk pricing.',
  openGraph: {
    title: 'Pricing — HardHat Compliance',
    description:
      'Start free, scale with Pro at $49/mo per project, or contact us for Enterprise bulk pricing. Unlimited AI document scans. Active expiry monitoring included.',
    type: 'website',
  },
}

// ── Schema markup ──────────────────────────────────────────────

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How does the free Starter plan work?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The Starter plan is free forever with one active project and up to 3 subcontractors. It includes AI document review and the QR Safety Pass so you can evaluate the full workflow before committing.',
      },
    },
    {
      '@type': 'Question',
      name: 'What counts as a "project" in the Pro plan?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'A project is any active job site you create inside HardHat Compliance. Each project has its own subcontractor roster, document vault, and compliance dashboard. Archived projects do not count toward your billing.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is there a limit on AI document scans?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No. All paid plans include unlimited AI document scans powered by Gemini 2.5 Flash. You pay per project, not per scan — so uploading new documents, re-uploads, and AI re-reviews never cost extra.',
      },
    },
    {
      '@type': 'Question',
      name: 'How does expiry monitoring work?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Our nightly Ghost Assistant scans every approved document. When a document is 30, 15, or 7 days from expiry, an automatic warning email goes to the subcontractor and the issue appears on your Command Center dashboard with a yellow badge.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I cancel at any time?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Pro plans are billed monthly with no long-term contracts. You can cancel or downgrade at any time from your account settings. Your data and audit logs remain accessible for 90 days after cancellation.',
      },
    },
    {
      '@type': 'Question',
      name: 'What does Enterprise include that Pro does not?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Enterprise adds bulk project pricing, a dedicated Customer Success Manager, custom compliance rule templates, SLA guarantees, SSO/SAML integration, and priority AI processing. Contact us for a custom quote.',
      },
    },
  ],
}

// ── Tier definitions ───────────────────────────────────────────

type FeatureValue = true | false | string

type Tier = {
  name: string
  Icon: React.ElementType
  price: string
  period: string
  description: string
  cta: string
  ctaHref: string
  popular: boolean
  accentBg: string
  accentText: string
  ctaStyle: string
  features: { label: string; value: FeatureValue }[]
}

const TIERS: Tier[] = [
  {
    name: 'Starter',
    Icon: Zap,
    price: '$0',
    period: 'forever',
    description: 'Evaluate the full compliance loop with one real project — no credit card required.',
    cta: 'Start for Free',
    ctaHref: '/login',
    popular: false,
    accentBg: 'bg-slate-100',
    accentText: 'text-slate-700',
    ctaStyle: 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-50',
    features: [
      { label: '1 active project',                    value: true           },
      { label: 'Up to 3 subcontractors',              value: true           },
      { label: 'AI document review (Gemini)',          value: '25 scans/mo'  },
      { label: 'QR Safety Pass',                      value: true           },
      { label: 'Subcontractor portal',                value: true           },
      { label: 'Rejection email notifications',       value: true           },
      { label: 'Active expiry monitoring',            value: false          },
      { label: 'Audit trail & history',               value: false          },
      { label: 'Command Center dashboard',            value: false          },
      { label: 'Bulk document download',              value: false          },
      { label: 'Priority AI processing',              value: false          },
      { label: 'Custom compliance rules',             value: false          },
    ],
  },
  {
    name: 'Pro',
    Icon: Shield,
    price: '$49',
    period: '/mo per project',
    description: 'Full protection for every active job site. Unlimited AI scans. Zero compliance gaps.',
    cta: 'Start Free Trial',
    ctaHref: '/contact',
    popular: true,
    accentBg: 'bg-amber-500',
    accentText: 'text-slate-950',
    ctaStyle: 'bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold shadow-lg shadow-amber-500/25',
    features: [
      { label: 'Unlimited active projects',           value: true           },
      { label: 'Unlimited subcontractors',            value: true           },
      { label: 'Unlimited AI document scans',         value: true           },
      { label: 'QR Safety Pass (live status)',        value: true           },
      { label: 'Subcontractor self-service portal',   value: true           },
      { label: 'Automated verdict notifications',     value: true           },
      { label: 'Active expiry monitoring (30/15/7d)', value: true           },
      { label: 'Full audit trail & history',          value: true           },
      { label: 'Command Center dashboard',            value: true           },
      { label: 'Bulk document download',              value: true           },
      { label: 'Priority AI processing',              value: false          },
      { label: 'Custom compliance rules',             value: false          },
    ],
  },
  {
    name: 'Enterprise',
    Icon: Building2,
    price: 'Custom',
    period: 'bulk pricing',
    description: 'Built for large GCs managing dozens of projects simultaneously. SLA-backed and fully supported.',
    cta: 'Contact Sales',
    ctaHref: '/contact',
    popular: false,
    accentBg: 'bg-slate-900',
    accentText: 'text-white',
    ctaStyle: 'bg-slate-900 text-white hover:bg-slate-800',
    features: [
      { label: 'Unlimited active projects',           value: true           },
      { label: 'Unlimited subcontractors',            value: true           },
      { label: 'Unlimited AI document scans',         value: true           },
      { label: 'QR Safety Pass (live status)',        value: true           },
      { label: 'Subcontractor self-service portal',   value: true           },
      { label: 'Automated verdict notifications',     value: true           },
      { label: 'Active expiry monitoring (30/15/7d)', value: true           },
      { label: 'Full audit trail & history',          value: true           },
      { label: 'Command Center dashboard',            value: true           },
      { label: 'Bulk document download',              value: true           },
      { label: 'Priority AI processing',              value: true           },
      { label: 'Custom compliance rule templates',    value: true           },
    ],
  },
]

const FAQS = FAQ_SCHEMA.mainEntity

function FeatureRow({ value, label }: { value: FeatureValue; label: string }) {
  return (
    <li className="flex items-start gap-3">
      {value === true ? (
        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
      ) : value === false ? (
        <Minus className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
      ) : (
        <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
      )}
      <span className={`text-sm leading-relaxed ${
        value === false ? 'text-slate-400' : 'text-slate-700'
      }`}>
        {value === true || value === false ? label : <>{label} <span className="font-semibold text-amber-600">({value})</span></>}
      </span>
    </li>
  )
}

export default function PricingPage() {
  return (
    <>
      {/* ── JSON-LD FAQ Schema ─────────────────────────────── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_SCHEMA) }}
      />

      <div className="bg-white">
        {/* ── Hero ────────────────────────────────────────── */}
        <section className="bg-slate-950 px-6 py-20 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-amber-400">
              Transparent Pricing · No Surprises
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
              Protection, not just software.
            </h1>
            <p className="mt-6 text-lg text-slate-400 max-w-2xl mx-auto">
              Every tier is priced around the outcome — keeping expired certificates off your job sites.
              Start free. Scale as your project load grows.
            </p>
          </div>
        </section>

        {/* ── Pricing cards ────────────────────────────────── */}
        <section className="px-6 py-20 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-6 lg:grid-cols-3 items-start">
              {TIERS.map((tier) => (
                <div
                  key={tier.name}
                  className={`relative rounded-2xl border bg-white shadow-sm ${
                    tier.popular
                      ? 'border-amber-300 ring-2 ring-amber-400/40 shadow-amber-100 shadow-lg'
                      : 'border-slate-200'
                  }`}
                >
                  {tier.popular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="rounded-full bg-amber-500 px-4 py-1 text-xs font-bold text-slate-950 shadow-sm">
                        Most Popular
                      </span>
                    </div>
                  )}

                  {/* Card header */}
                  <div className={`rounded-t-2xl px-7 py-6 ${tier.popular ? 'bg-amber-50' : 'bg-slate-50'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tier.accentBg}`}>
                        <tier.Icon className={`h-5 w-5 ${tier.accentText}`} />
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${tier.accentBg} ${tier.accentText}`}>
                        {tier.name}
                      </span>
                    </div>

                    <div className="flex items-end gap-1">
                      <span className="text-4xl font-black text-slate-900">{tier.price}</span>
                      <span className="mb-1 text-sm text-slate-500">{tier.period}</span>
                    </div>
                    <p className="mt-3 text-sm text-slate-600 leading-relaxed">{tier.description}</p>
                  </div>

                  {/* Features list */}
                  <div className="px-7 py-6">
                    <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
                      What&apos;s included
                    </p>
                    <ul className="space-y-3">
                      {tier.features.map(({ label, value }) => (
                        <FeatureRow key={label} label={label} value={value} />
                      ))}
                    </ul>

                    <Link
                      href={tier.ctaHref}
                      className={`mt-8 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${tier.ctaStyle}`}
                    >
                      {tier.cta}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Money-back note */}
            <p className="mt-8 text-center text-sm text-slate-500">
              All plans include a 14-day money-back guarantee. No questions asked.
            </p>
          </div>
        </section>

        {/* ── Protection framing strip ──────────────────────── */}
        <section className="border-y border-slate-100 bg-slate-50 px-6 py-16 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-black text-slate-900">
                What you are really paying for
              </h2>
              <p className="mt-2 text-slate-500 text-sm">Hint: it is not a software subscription.</p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { value: '$2.3M',  label: 'Average cost of an uninsured on-site incident claim'  },
                { value: '72 hrs', label: 'Typical time to discover a lapsed COI the manual way' },
                { value: '0',      label: 'Manual document audits required with HardHat'         },
                { value: '< 2s',   label: 'Time for AI to review and verdict a full COI'         },
              ].map(({ value, label }) => (
                <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm">
                  <p className="text-3xl font-black text-slate-900 mb-2">{value}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ───────────────────────────────────────────── */}
        <section className="px-6 py-20 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-black tracking-tight text-slate-900">
                Frequently asked questions
              </h2>
              <p className="mt-3 text-slate-500">
                Everything you need to know before making a decision.
              </p>
            </div>

            <div className="space-y-px">
              {FAQS.map((item, i) => (
                <details
                  key={i}
                  className="group rounded-xl border border-slate-200 bg-white [&:not(:first-child)]:mt-2 overflow-hidden"
                >
                  <summary className="flex cursor-pointer items-center justify-between px-6 py-5 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition-colors list-none">
                    <span>{item.name}</span>
                    <svg
                      className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180"
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="border-t border-slate-100 px-6 py-4 text-sm text-slate-600 leading-relaxed">
                    {item.acceptedAnswer.text}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────── */}
        <section className="bg-slate-950 px-6 py-20 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-black text-white mb-4">
              Start protecting your projects today.
            </h2>
            <p className="text-slate-400 mb-8">
              Free to start. No credit card. Cancel anytime.
            </p>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-8 py-4 font-bold text-slate-950 hover:bg-amber-400 transition-colors"
              >
                Start Free <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/contact"
                className="text-sm font-medium text-slate-400 underline underline-offset-4 hover:text-white transition-colors"
              >
                Talk to sales about Enterprise →
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
