import type { Metadata } from 'next'
import { Clock, Shield, Users, MessageSquare } from 'lucide-react'
import { ContactForm } from './contact-form'

export const metadata: Metadata = {
  title: 'Book a Demo — HardHat Compliance',
  description:
    'Request a free 15-minute live demo of HardHat Compliance. See AI document review, the QR Safety Pass, and the Command Center on your own project data.',
  openGraph: {
    title: 'Book a Demo — HardHat Compliance',
    description:
      'Request a free 15-minute live demo. See AI document review, QR Safety Pass, and the Command Center on your own project data.',
    type: 'website',
  },
}

const PROMISE = [
  { Icon: Clock,   text: '15 minutes, no fluff. We respect your time.' },
  { Icon: Shield,  text: 'No obligation, no hidden sales funnel.'       },
  { Icon: Users,   text: 'Live demo on a real project — not slides.'   },
  { Icon: MessageSquare, text: 'Your questions drive the agenda.'       },
]

export default function ContactPage() {
  return (
    <div className="bg-white">
      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="bg-slate-950 px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-amber-400">
            Free · No Obligation
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
            See HardHat live.
          </h1>
          <p className="mt-6 text-lg text-slate-400 max-w-xl mx-auto">
            Book a 15-minute demo and we will run the full compliance loop — AI review, QR gate, expiry alerts — on a real project.
          </p>
        </div>
      </section>

      {/* ── Split layout ──────────────────────────────────────── */}
      <section className="px-6 py-16 lg:px-8">
        <div className="mx-auto max-w-6xl grid gap-12 lg:grid-cols-5 lg:items-start">
          {/* Left: promises */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <h2 className="text-2xl font-black text-slate-900 mb-2">What to expect</h2>
              <p className="text-slate-500 text-sm leading-relaxed">
                A direct, technical walk-through of every feature — configured to your company size and workflow.
              </p>
            </div>

            <div className="space-y-5">
              {PROMISE.map(({ Icon, text }) => (
                <div key={text} className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100">
                    <Icon className="h-4.5 w-4.5 text-amber-700" />
                  </div>
                  <p className="text-sm font-medium text-slate-700 leading-relaxed pt-1.5">{text}</p>
                </div>
              ))}
            </div>

            {/* Social proof mini */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">
                What you will see
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                {[
                  'Add a subcontractor in 30 seconds',
                  'Upload a COI and watch AI review it live',
                  'See the QR safety pass update in real time',
                  'Trigger an expiry warning email',
                  'View the full audit trail for any document',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="text-xs text-slate-400 leading-relaxed">
              Your information is used only to schedule and personalize your demo.
              We do not sell or share it.
            </div>
          </div>

          {/* Right: form */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-slate-900">Request your free demo</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Fill in the details below and we will reach out within one business day.
                </p>
              </div>
              <ContactForm interest="Beta Access" />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
