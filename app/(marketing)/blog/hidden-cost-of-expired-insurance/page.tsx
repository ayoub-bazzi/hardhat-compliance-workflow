import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Clock, Tag, AlertTriangle, CheckCircle2 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'The Hidden Cost of Expired Insurance — HardHat Compliance Blog',
  description:
    'One lapsed COI can cost a General Contractor millions. Discover why manual compliance is a ticking time bomb — and how the Hard-Stop method eliminates the risk entirely.',
  keywords: [
    'expired COI general contractor',
    'construction compliance risk',
    'subcontractor insurance management',
    'certificate of insurance tracking',
    'automated compliance construction',
    'hard stop compliance method',
  ],
  openGraph: {
    title: 'The Hidden Cost of Expired Insurance: Why Manual Compliance Is a Ticking Time Bomb',
    description:
      'One lapsed COI can cost a General Contractor millions. Discover why manual compliance is a ticking time bomb — and how the Hard-Stop method eliminates the risk.',
    type: 'article',
    publishedTime: '2026-04-27',
    authors: ['HardHat Compliance'],
    tags: ['Risk Management', 'Compliance', 'Insurance', 'Construction'],
  },
  alternates: {
    canonical: '/blog/hidden-cost-of-expired-insurance',
  },
}

// ── Article Schema ─────────────────────────────────────────────

const ARTICLE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline:
    'The Hidden Cost of Expired Insurance: Why Manual Compliance Is a Ticking Time Bomb for General Contractors',
  description:
    'One lapsed COI can cost a General Contractor millions. Discover why manual compliance is a ticking time bomb — and how the Hard-Stop method eliminates the risk entirely.',
  datePublished: '2026-04-27',
  dateModified: '2026-04-27',
  author: {
    '@type': 'Organization',
    name: 'HardHat Compliance',
    url: 'https://hardhat-compliance.app',
  },
  publisher: {
    '@type': 'Organization',
    name: 'HardHat Compliance',
    logo: {
      '@type': 'ImageObject',
      url: 'https://hardhat-compliance.app/favicon.ico',
    },
  },
  mainEntityOfPage: {
    '@type': 'WebPage',
    '@id': 'https://hardhat-compliance.app/blog/hidden-cost-of-expired-insurance',
  },
  keywords:
    'expired COI, general contractor compliance, subcontractor insurance, certificate of insurance, automated compliance',
  articleSection: 'Risk Management',
  wordCount: 580,
}

export default function BlogPostPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ARTICLE_SCHEMA) }}
      />

      <div className="bg-white">
        {/* ── Hero ──────────────────────────────────────────── */}
        <section className="bg-slate-950 px-6 py-16 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <Link
              href="/blog"
              className="mb-8 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Blog
            </Link>

            <div className="flex flex-wrap items-center gap-3 mb-6">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-400">
                <Tag className="h-3 w-3" /> Risk Management
              </span>
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <Clock className="h-3.5 w-3.5" /> 6 min read
              </span>
              <time className="text-xs text-slate-500" dateTime="2026-04-27">
                April 27, 2026
              </time>
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl leading-tight">
              The Hidden Cost of Expired Insurance: Why Manual Compliance Is a Ticking Time Bomb for General Contractors
            </h1>

            <p className="mt-6 text-lg text-slate-400 leading-relaxed">
              One lapsed COI discovered at an incident can cost a GC millions. Most never see it coming —
              because the system was never designed to catch it.
            </p>
          </div>
        </section>

        {/* ── Article body ──────────────────────────────────── */}
        <article className="px-6 py-16 lg:px-8">
          <div className="mx-auto max-w-3xl">
            {/* Gradient top accent */}
            <div className="mb-10 h-1 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-amber-500" />

            <div className="prose prose-slate prose-lg max-w-none
              prose-headings:font-black prose-headings:tracking-tight
              prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4
              prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
              prose-p:leading-relaxed prose-p:text-slate-600
              prose-li:text-slate-600
              prose-strong:text-slate-900
              prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline">

              <p>
                Picture this: a subcontractor's electrician is working on the third floor of your project when an accident occurs.
                It is a serious one. Within 48 hours, your legal team discovers something that changes everything —
                the subcontractor's Certificate of Insurance expired two months ago. Nobody caught it.
              </p>

              <p>
                Your general liability policy now has to absorb a claim that should have belonged to someone else.
                Legal fees, settlement costs, increased premiums, project delays. A single paperwork gap
                has just become a seven-figure problem.
              </p>

              <p>
                This is not a hypothetical. It happens on job sites across North America every month.
                And the sobering truth is that it almost always traces back to the same root cause: <strong>manual compliance management.</strong>
              </p>

              {/* Alert box */}
              <div className="not-prose my-8 flex items-start gap-4 rounded-xl border border-amber-200 bg-amber-50 px-6 py-5">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <p className="font-bold text-amber-900 mb-1">Industry Reality Check</p>
                  <p className="text-sm text-amber-800 leading-relaxed">
                    The average mid-sized GC manages 15–40 subcontractors across multiple active projects.
                    Each subcontractor carries three to five compliance documents on independent expiry schedules.
                    That is potentially 200 critical deadlines to track manually — simultaneously.
                  </p>
                </div>
              </div>

              <h2>Why the Manual System Is Structurally Broken</h2>

              <p>
                The typical compliance workflow has not fundamentally changed in 30 years. A GC requests a COI.
                The subcontractor emails a PDF. Someone saves it to a shared drive — maybe under the right project folder,
                maybe not. A reminder gets set in someone's calendar. That person leaves the company. The reminder disappears.
              </p>

              <p>
                The system works well enough when nothing goes wrong. The problem is that construction is a high-risk environment
                where things go wrong regularly. And when they do, the compliance gaps that manual systems miss become the central
                exhibit in the lawsuit.
              </p>

              <p>
                Three structural failures make manual compliance management dangerous at scale:
              </p>

              <ul>
                <li>
                  <strong>No central visibility.</strong> Documents are scattered across email inboxes, shared drives,
                  and filing cabinets. There is no single place to see the real-time compliance status of every subcontractor
                  on every project.
                </li>
                <li>
                  <strong>No automatic enforcement.</strong> Even if you track every document perfectly, nothing stops
                  a subcontractor from continuing to work after their coverage lapses. There is no circuit breaker.
                </li>
                <li>
                  <strong>No proactive alerting.</strong> By the time an expired document is discovered, work has already
                  been done under uninsured conditions. The exposure is already a fact.
                </li>
              </ul>

              <h2>The Real Cost Is What You Cannot See</h2>

              <p>
                Every GC knows about the catastrophic scenario — the incident where a lapsed policy becomes a
                multimillion-dollar direct liability. But the daily cost of manual compliance is less visible and
                nearly as damaging.
              </p>

              <p>
                Consider the hours spent: chasing email confirmations, manually reviewing PDF documents,
                building and maintaining tracking spreadsheets, following up when subcontractors miss deadlines.
                For a mid-sized GC managing three active projects, conservative estimates put this at 8–15 hours per
                week of staff time — time that could be used to win and execute more work.
              </p>

              <p>
                Then there is the compliance theater: the illusion of compliance where documents have been collected
                but not actually validated. A COI with coverage limits below your contract requirements, accepted
                because the reviewer did not catch the discrepancy. A certificate naming the wrong entity, filed
                without verification. The document exists, but the protection does not.
              </p>

              <h2>The Hard-Stop Method: Closing Every Gap</h2>

              <p>
                The Hard-Stop method re-architects the entire compliance workflow around a single principle:
                <strong>no subcontractor should be able to work on your site with a compliance gap, period.</strong>
              </p>

              <p>
                It operates in three stages:
              </p>

              <ul>
                <li>
                  <strong>Self-service upload.</strong> Subcontractors manage their own compliance through a dedicated portal.
                  They own the process. The GC stops being the compliance administrator.
                </li>
                <li>
                  <strong>AI-verified review.</strong> Every document is analyzed by Gemini 2.5 Flash, which extracts
                  coverage details, validates against your requirements, and returns a structured verdict in under two seconds.
                  Rejections come with a plain-English reason. There is no ambiguity.
                </li>
                <li>
                  <strong>Enforced gate access.</strong> Each subcontractor carries a live QR Safety Pass that reflects
                  their real-time compliance status. Green means cleared. Red means blocked. When a document expires,
                  the pass turns red automatically — no manual update, no chance of oversight.
                </li>
              </ul>

              {/* Success box */}
              <div className="not-prose my-8 flex items-start gap-4 rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-5">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <div>
                  <p className="font-bold text-emerald-900 mb-1">The Outcome</p>
                  <p className="text-sm text-emerald-800 leading-relaxed">
                    When the Hard-Stop method is in place, the question is never "did we collect their COI?"
                    The question is "does this subcontractor have a green pass right now?" Those are very different questions.
                    Only one of them protects you at the moment of an incident.
                  </p>
                </div>
              </div>

              <h2>Compliance as Competitive Advantage</h2>

              <p>
                The GCs who invest in systematic compliance management do not just reduce their risk exposure —
                they create a competitive advantage. Subcontractors who work with organized, tech-forward GCs
                are more likely to renew relationships. Project owners who see a structured compliance process
                have greater confidence in the GC's operational maturity.
              </p>

              <p>
                Manual compliance is not just a risk. It is a signal about how a company operates.
                In a market where trust and professionalism determine contract awards, that signal matters.
              </p>

              <p>
                The technology to eliminate manual compliance risk exists today.
                The question for every GC is not whether to adopt it — it is how long they can afford to wait.
              </p>
            </div>

            {/* Author / CTA strip */}
            <div className="mt-12 rounded-2xl border border-slate-200 bg-slate-50 p-6 flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">Published by</p>
                <p className="font-bold text-slate-900">HardHat Compliance</p>
                <p className="text-sm text-slate-500">April 27, 2026</p>
              </div>
              <Link
                href="/contact"
                className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold text-slate-950 hover:bg-amber-400 transition-colors"
              >
                See the Hard-Stop method live <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Back to blog */}
            <div className="mt-10 border-t border-slate-100 pt-8">
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Back to all articles
              </Link>
            </div>
          </div>
        </article>

        {/* ── Related CTA ───────────────────────────────────── */}
        <section className="bg-slate-950 px-6 py-16 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-black text-white mb-3">
              Ready to implement the Hard-Stop method?
            </h2>
            <p className="text-slate-400 text-sm mb-8">
              See the full AI compliance loop running live on a real project. No slides. No generic demos.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-8 py-4 font-bold text-slate-950 hover:bg-amber-400 transition-colors"
            >
              Book a Live Demo <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    </>
  )
}
