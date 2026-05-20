import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Clock, Tag } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Blog — HardHat Compliance',
  description:
    'Insights, guides, and strategies for General Contractors on compliance automation, risk reduction, and the future of construction management.',
  openGraph: {
    title: 'Blog — HardHat Compliance',
    description:
      'Insights and guides for General Contractors on compliance automation, AI document review, and eliminating manual compliance risk.',
    type: 'website',
  },
}

// ── Post registry ──────────────────────────────────────────────
// Add new posts here. The first entry is automatically the Featured Post.

export type BlogPost = {
  slug: string
  title: string
  excerpt: string
  category: string
  readTime: string
  date: string
  featured?: boolean
}

const POSTS: BlogPost[] = [
  {
    slug: 'hidden-cost-of-expired-insurance',
    title: 'The Hidden Cost of Expired Insurance: Why Manual Compliance Is a Ticking Time Bomb for General Contractors',
    excerpt:
      'One lapsed COI discovered at an incident can cost a GC millions. Most never see it coming — because the system was never designed to catch it. Here is why the manual approach is broken and what the Hard-Stop method changes.',
    category: 'Risk Management',
    readTime: '6 min read',
    date: '2026-04-27',
    featured: true,
  },
]

const COMING_SOON: { title: string; category: string }[] = [
  { title: 'How AI Document Review Works: A Technical Deep Dive',             category: 'Technology'     },
  { title: 'The QR Safety Pass: Modern Job-Site Access Control Explained',    category: 'Site Operations'},
  { title: 'COI Compliance 101: What Every GC Needs to Verify',               category: 'Compliance'     },
  { title: 'Subcontractor Management at Scale: From 5 Subs to 50',           category: 'Operations'     },
  { title: 'Certified Payroll Requirements by State: A 2026 Breakdown',       category: 'Compliance'     },
]

function CategoryPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
      <Tag className="h-3 w-3" />
      {label}
    </span>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

export default function BlogPage() {
  const featured = POSTS.find((p) => p.featured)
  const rest     = POSTS.filter((p) => !p.featured)

  return (
    <div className="bg-white">
      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="bg-slate-950 px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-indigo-400">
            Compliance Intelligence
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
            The HardHat Blog
          </h1>
          <p className="mt-6 text-lg text-slate-400 max-w-xl mx-auto">
            Authoritative guides for General Contractors who take compliance seriously.
          </p>
        </div>
      </section>

      <section className="px-6 py-16 lg:px-8">
        <div className="mx-auto max-w-5xl space-y-16">
          {/* ── Featured post ──────────────────────────────── */}
          {featured && (
            <div>
              <p className="mb-6 text-xs font-semibold uppercase tracking-widest text-slate-400">
                Featured Article
              </p>
              <Link
                href={`/blog/${featured.slug}`}
                className="group block rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Banner gradient */}
                <div className="h-3 bg-gradient-to-r from-indigo-500 via-violet-500 to-amber-500" />

                <div className="p-8 lg:p-10">
                  <div className="flex flex-wrap items-center gap-3 mb-5">
                    <CategoryPill label={featured.category} />
                    <span className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Clock className="h-3.5 w-3.5" /> {featured.readTime}
                    </span>
                    <span className="text-xs text-slate-400">{formatDate(featured.date)}</span>
                  </div>

                  <h2 className="text-2xl font-black tracking-tight text-slate-900 group-hover:text-indigo-700 transition-colors mb-4 lg:text-3xl leading-tight">
                    {featured.title}
                  </h2>

                  <p className="text-slate-500 leading-relaxed mb-6 max-w-3xl">
                    {featured.excerpt}
                  </p>

                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 group-hover:gap-3 transition-all">
                    Read the full guide <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            </div>
          )}

          {/* ── Published posts grid ────────────────────────── */}
          {rest.length > 0 && (
            <div>
              <p className="mb-6 text-xs font-semibold uppercase tracking-widest text-slate-400">
                More Articles
              </p>
              <div className="grid gap-6 sm:grid-cols-2">
                {rest.map((post) => (
                  <Link
                    key={post.slug}
                    href={`/blog/${post.slug}`}
                    className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <CategoryPill label={post.category} />
                      <span className="text-xs text-slate-400">{post.readTime}</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-700 transition-colors mb-2 leading-snug">
                      {post.title}
                    </h3>
                    <p className="text-sm text-slate-500 leading-relaxed line-clamp-3">{post.excerpt}</p>
                    <p className="mt-4 text-xs font-semibold text-indigo-600 flex items-center gap-1 group-hover:gap-2 transition-all">
                      Read more <ArrowRight className="h-3.5 w-3.5" />
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ── Coming soon grid ────────────────────────────── */}
          <div>
            <p className="mb-6 text-xs font-semibold uppercase tracking-widest text-slate-400">
              Coming Soon
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {COMING_SOON.map(({ title, category }) => (
                <div
                  key={title}
                  className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5"
                >
                  <CategoryPill label={category} />
                  <p className="mt-3 text-sm font-semibold text-slate-500 leading-snug">{title}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Newsletter CTA ───────────────────────────────────── */}
      <section className="bg-slate-950 px-6 py-16 lg:px-8">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-2xl font-black text-white mb-3">
            Get compliance insights in your inbox.
          </h2>
          <p className="text-slate-400 text-sm mb-6">
            New guides, regulatory updates, and best practices — once a month, no fluff.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 font-bold text-slate-950 hover:bg-amber-400 transition-colors text-sm"
          >
            Request Early Access <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  )
}
