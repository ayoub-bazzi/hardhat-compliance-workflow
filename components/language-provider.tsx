'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import type { Locale, Dictionary } from '@/lib/i18n'
import enDict from '@/messages/en.json'
import arDict from '@/messages/ar.json'

type LanguageContextValue = {
  locale: Locale
  setLocale: (l: Locale) => void
  t: Dictionary
  dir: 'ltr' | 'rtl'
}

const LanguageContext = createContext<LanguageContextValue>({
  locale: 'en',
  setLocale: () => {},
  t: enDict as Dictionary,
  dir: 'ltr',
})

const STORAGE_KEY = 'hhc-locale'

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null
    if (stored === 'ar' || stored === 'en') {
      setLocaleState(stored)
    }
  }, [])

  useEffect(() => {
    if (!mounted) return
    const dir = locale === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.setAttribute('dir', dir)
    document.documentElement.setAttribute('lang', locale)
  }, [locale, mounted])

  function setLocale(l: Locale) {
    setLocaleState(l)
    localStorage.setItem(STORAGE_KEY, l)
  }

  const t = locale === 'ar' ? (arDict as Dictionary) : (enDict as Dictionary)
  const dir = locale === 'ar' ? 'rtl' : 'ltr'

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, dir }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
