import Link from 'next/link'
import { HardHat } from 'lucide-react'

export function MarketingFooter() {
  return (
    <footer className="border-t border-stone-100 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-4">

          {/* Brand */}
          <div className="space-y-5 sm:col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500">
                <HardHat className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-bold text-stone-900">HardHat Compliance</span>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-stone-500">
              The AI-powered compliance engine that links job-site safety directly to your checkbook.
              Built for UK &amp; Gulf general contractors.
            </p>
            <div className="flex gap-2.5">
              {['LinkedIn', 'X / Twitter'].map((label) => (
                <a
                  key={label}
                  href="#"
                  className="rounded-full border border-stone-200 px-3.5 py-1.5 text-xs font-medium text-stone-500 transition-colors hover:border-stone-400 hover:text-stone-900"
                >
                  {label}
                </a>
              ))}
            </div>
          </div>

          {/* Product */}
          <div>
            <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-stone-400">Product</p>
            <ul className="space-y-3.5 text-sm">
              {[
                { href: '/how-it-works', label: 'How It Works' },
                { href: '/pricing',      label: 'Pricing'       },
                { href: '/blog',         label: 'Blog'          },
                { href: '/contact',      label: 'Request Demo'  },
                { href: '/login',        label: 'Sign In'       },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-stone-500 transition-colors hover:text-stone-900">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-stone-400">Company</p>
            <ul className="space-y-3.5 text-sm">
              {[
                { href: '/about',   label: 'About Us'       },
                { href: '/contact', label: 'Contact'        },
                { href: '/contact', label: 'Privacy Policy' },
                { href: '/contact', label: 'Terms of Use'   },
              ].map(({ href, label }) => (
                <li key={label}>
                  <Link href={href} className="text-stone-500 transition-colors hover:text-stone-900">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-stone-100 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-stone-400">© {new Date().getFullYear()} HardHat Compliance Ltd. All rights reserved.</p>
          <p className="text-xs text-stone-400">Built for the modern construction industry · UK &amp; Gulf</p>
        </div>
      </div>
    </footer>
  )
}
