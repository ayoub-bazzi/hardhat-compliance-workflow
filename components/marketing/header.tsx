'use client'

import { useState } from 'react'
import Link from 'next/link'
import { HardHat, Menu, X } from 'lucide-react'

const NAV = [
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/pricing',      label: 'Pricing'      },
  { href: '/blog',         label: 'Blog'         },
  { href: '/about',        label: 'About'        },
  { href: '/contact',      label: 'Contact'      },
]

export function MarketingHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 transition-colors group-hover:bg-amber-400">
            <HardHat className="h-4.5 w-4.5 text-slate-950" />
          </div>
          <span className="text-sm font-bold tracking-tight text-white">
            HardHat <span className="text-slate-400 font-normal">Compliance</span>
          </span>
          <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-400">
            Beta
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="rounded-md px-3.5 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="text-sm font-medium text-slate-400 transition-colors hover:text-white"
          >
            Sign In
          </Link>
          <Link
            href="/contact"
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-400"
          >
            Start Free Audit
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="rounded-md p-2 text-slate-400 hover:bg-slate-800 hover:text-white md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-slate-800 bg-slate-950 px-6 pb-6 md:hidden">
          <nav className="flex flex-col gap-1 pt-4">
            {NAV.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                {label}
              </Link>
            ))}
            <div className="mt-4 flex flex-col gap-2 border-t border-slate-800 pt-4">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2.5 text-sm font-medium text-slate-400 hover:text-white"
              >
                Sign In
              </Link>
              <Link
                href="/contact"
                onClick={() => setOpen(false)}
                className="rounded-lg bg-amber-500 px-4 py-2.5 text-center text-sm font-semibold text-slate-950 hover:bg-amber-400"
              >
                Start Free Audit
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
