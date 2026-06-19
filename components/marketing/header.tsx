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
    <header className="sticky top-0 z-50 border-b border-stone-100 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">

        {/* Logo */}
        <Link href="/" className="group flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 transition-colors group-hover:bg-orange-600">
            <HardHat className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-bold text-stone-900">
            HardHat <span className="font-normal text-stone-400">Compliance</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center md:flex">
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="px-4 py-2 text-sm font-medium text-stone-500 transition-colors hover:text-stone-900"
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden items-center gap-4 md:flex">
          <Link
            href="/login"
            className="text-sm font-medium text-stone-500 transition-colors hover:text-stone-900"
          >
            Sign In
          </Link>
          <Link
            href="/contact"
            className="rounded-full bg-stone-900 px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-stone-700 active:scale-95"
          >
            Book a Demo
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="rounded-md p-2 text-stone-500 hover:text-stone-900 md:hidden"
          onClick={() => setOpen(v => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-stone-100 bg-white px-6 pb-6 md:hidden">
          <nav className="flex flex-col pt-4">
            {NAV.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="py-2.5 text-sm font-medium text-stone-600 hover:text-stone-900"
              >
                {label}
              </Link>
            ))}
            <div className="mt-4 flex flex-col gap-3 border-t border-stone-100 pt-4">
              <Link href="/login" onClick={() => setOpen(false)} className="text-sm text-stone-500">Sign In</Link>
              <Link href="/contact" onClick={() => setOpen(false)} className="rounded-full bg-stone-900 py-2.5 text-center text-sm font-semibold text-white">Book a Demo</Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
