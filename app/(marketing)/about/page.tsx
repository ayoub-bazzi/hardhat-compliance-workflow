import type { Metadata } from 'next'
import Link from 'next/link'
import { HardHat, ArrowRight, Target, Lightbulb, Shield } from 'lucide-react'

export const metadata: Metadata = {
  title: 'About — HardHat Compliance',
  description:
    'HardHat was built to eliminate manual compliance friction for the modern General Contractor. Learn about our mission and the problem we are solving.',
  openGraph: {
    title: 'About — HardHat Compliance',
    description:
      'Eliminating manual compliance friction for the modern General Contractor. Built for job sites that cannot afford a paperwork failure.',
    type: 'website',
  },
}

const VALUES = [
  {
    Icon: Target,
    title: 'Radical Transparency',
    body: 'Every AI decision is explained. Every rejection comes with a reason. Every action is logged. We believe compliance software should make your liability position clearer, not murkier.',
  },
  {
    Icon: Shield,
    title: 'Zero-Tolerance for Risk',
    body: 'An expired COI discovered at an incident is not a paperwork problem — it is a financial catastrophe. We design every feature around the assumption that the stakes are real.',
  },
  {
    Icon: Lightbulb,
    title: 'Built for the Field',
    body: 'A QR code that works on a dusty job site. An email that a subcontractor can act on in 60 seconds. We do not build for boardrooms. We build for the people who actually run the work.',
  },
]

export default function AboutPage() {
  return (
    <div className="bg-white">
      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="bg-slate-950 px-6 py-24 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500">
              <HardHat className="h-6 w-6 text-slate-950" />
            </div>
            <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Our Mission</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl leading-tight">
            Eliminating manual<br />
            compliance friction for<br />
            <span className="text-amber-400">the modern General Contractor.</span>
          </h1>
          <p className="mt-8 text-lg leading-8 text-slate-400 max-w-2xl">
            Construction compliance has not changed in 30 years. Fax machines became email. Email became shared drives.
            The paperwork avalanche just got a different address. We are ending that.
          </p>
        </div>
      </section>

      {/* ── The Problem ───────────────────────────────────────── */}
      <section className="px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-4xl grid gap-12 lg:grid-cols-2 items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-rose-600 mb-3">The Problem</p>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 mb-6">
              A single expired certificate can cost a project everything.
            </h2>
            <div className="space-y-4 text-slate-600 leading-relaxed">
              <p>
                Most General Contractors manage subcontractor compliance through a combination of spreadsheets,
                email reminders, and gut feeling. When an incident happens on-site and the subcontractor&apos;s
                COI expired two months ago — and nobody caught it — the GC absorbs the claim.
              </p>
              <p>
                The average mid-sized GC manages 15–40 active subcontractors across multiple projects simultaneously.
                Every one of them has three to five documents that expire on their own schedule.
                That is 200 expiry dates to track manually, per project.
              </p>
              <p>
                The problem is not that people are careless. The problem is that the system was never designed to catch it.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-6">The Old Way</p>
            <div className="space-y-4">
              {[
                { step: '1', text: 'GC requests COI via email', },
                { step: '2', text: 'Sub sends PDF 3 days later', },
                { step: '3', text: 'GC saves to shared drive (maybe)', },
                { step: '4', text: 'No one sets a reminder for expiry', },
                { step: '5', text: 'COI expires. Work continues.', },
                { step: '6', text: 'Incident occurs on-site.', alert: true },
                { step: '7', text: 'GC absorbs uninsured claim.', alert: true },
              ].map(({ step, text, alert }) => (
                <div key={step} className="flex items-center gap-3">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    alert ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {step}
                  </div>
                  <p className={`text-sm ${alert ? 'font-semibold text-red-700' : 'text-slate-600'}`}>{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── The Solution ──────────────────────────────────────── */}
      <section className="border-y border-slate-100 bg-slate-50 px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 mb-3">The Solution</p>
            <h2 className="text-3xl font-black tracking-tight text-slate-900">
              What if compliance just… happened?
            </h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {[
              { title: 'Self-Service Upload',  body: 'Subcontractors manage their own documents through a portal. No back-and-forth. No email chains. The GC stops being the compliance administrator.', num: '1' },
              { title: 'AI Does the Audit',    body: 'Gemini reads every document and validates it against your rules. Rejections come with reasons. The AI catches what humans miss — consistently, at scale.', num: '2' },
              { title: 'Automatic Enforcement',body: 'Expiry warnings go out weeks early. Access is gated at the job site by a live QR code. Compliance is no longer optional.', num: '3' },
            ].map(({ title, body, num }) => (
              <div key={num} className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 text-sm font-black">
                  {num}
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Values ────────────────────────────────────────────── */}
      <section className="px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black tracking-tight text-slate-900">What we stand for</h2>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {VALUES.map(({ Icon, title, body }) => (
              <div key={title} className="space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900">
                  <Icon className="h-6 w-6 text-amber-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────── */}
      <section className="bg-slate-950 px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-black text-white mb-4">
            Ready to modernize your compliance operation?
          </h2>
          <p className="text-slate-400 mb-8">
            Join the GCs who have moved compliance from a liability into a competitive advantage.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-8 py-4 font-bold text-slate-950 hover:bg-amber-400 transition-colors"
            >
              Book a Demo <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/how-it-works"
              className="text-sm font-medium text-slate-400 underline underline-offset-4 hover:text-white transition-colors"
            >
              See how it works →
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
