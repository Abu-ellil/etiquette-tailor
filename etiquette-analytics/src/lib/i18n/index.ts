// نظام الترجمة
import { Locale, getLocale } from './config'
import ar from './ar.json'
import en from './en.json'

const translations = { ar, en } as const

export function t(key: string, locale: Locale = getLocale()): string {
  const keys = key.split('.')
  let value: any = translations[locale]

  for (const k of keys) {
    value = value?.[k]
  }

  return value || key
}

export function useTranslation() {
  const locale = getLocale()

  return {
    locale,
    t: (key: string) => t(key, locale),
    dir: locale === 'ar' ? 'rtl' : 'ltr',
  }
}
