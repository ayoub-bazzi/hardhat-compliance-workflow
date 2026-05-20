import type en from '@/messages/en.json'

export type Locale = 'en' | 'ar'
export type Dictionary = typeof en
export type PortalDict = Dictionary['portal']
export type NavDict = Dictionary['nav']
export type GateDict = Dictionary['gate']

export function getDirection(locale: Locale): 'ltr' | 'rtl' {
  return locale === 'ar' ? 'rtl' : 'ltr'
}

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import('@/messages/en.json').then((m) => m.default as Dictionary),
  ar: () => import('@/messages/ar.json').then((m) => m.default as Dictionary),
}

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  return dictionaries[locale]()
}
