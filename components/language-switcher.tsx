'use client'

import { useLanguage } from './language-provider'

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useLanguage()

  return (
    <button
      type="button"
      onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}
      className={className}
      aria-label="Switch language"
    >
      {t.common.language_label}
    </button>
  )
}
