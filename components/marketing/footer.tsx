import Link from 'next/link'
import { HardHat } from 'lucide-react'

export function MarketingFooter() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500">
                <HardHat className="h-4 w-4 text-slate-950" />
              </div>
              <span className="text-sm font-bold text-white">HardHat Compliance</span>
            </div>
            <p className="text-sm leading-relaxed text-slate-500">
              Eliminating manual compliance friction for the modern General Contractor.
            </p>
          </div>

          {/* Product */}
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">Product</p>
            <ul className="space-y-3 text-sm">
              {[
                { href: '/how-it-works', label: 'How It Works' },
                { href: '/pricing',      label: 'Pricing'       },
                { href: '/blog',         label: 'Blog'          },
                { href: '/contact',      label: 'Request Demo'  },
                { href: '/login',        label: 'Sign In'       },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-slate-400 transition-colors hover:text-white">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">Company</p>
            <ul className="space-y-3 text-sm">
              {[
                { href: '/about',   label: 'About Us' },
                { href: '/contact', label: 'Contact'  },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-slate-400 transition-colors hover:text-white">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-800 pt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-xs text-slate-600">
            © {new Date().getFullYear()} HardHat Compliance. All rights reserved.
          </p>
          <p className="text-xs text-slate-600">
            Built for the modern construction industry.
          </p>
        </div>
      </div>
    </footer>
  )
}
