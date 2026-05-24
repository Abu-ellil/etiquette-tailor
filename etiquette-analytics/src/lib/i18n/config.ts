// إعدادات اللغات
export const SUPPORTED_LOCALES = ['ar', 'en'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'ar'

export const localeConfig = {
  ar: {
    name: 'العربية',
    flag: '🇸🇦',
    dir: 'rtl' as const,
  },
  en: {
    name: 'English',
    flag: '🇬🇧',
    dir: 'ltr' as const,
  },
} as const

export function getLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE
  return (localStorage.getItem('locale') as Locale) || DEFAULT_LOCALE
}

export function setLocale(locale: Locale) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('locale', locale)
    document.documentElement.dir = localeConfig[locale].dir
    document.documentElement.lang = locale
    window.dispatchEvent(new Event('localeChange'))
  }
}
