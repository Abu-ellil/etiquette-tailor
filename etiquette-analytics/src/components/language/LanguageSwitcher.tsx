// مبدل اللغة
'use client'

import { useState, useEffect } from 'react'
import { Globe } from 'lucide-react'
import { setLocale, getLocale, type Locale } from '@/lib/i18n/config'

const LOCALES = [
  { code: 'ar' as Locale, name: 'العربية', flag: '🇸🇦' },
  { code: 'en' as Locale, name: 'English', flag: '🇬🇧' },
]

export function LanguageSwitcher() {
  const [locale, setLocaleState] = useState<Locale>(getLocale())
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const handleLocaleChange = () => setLocaleState(getLocale())
    window.addEventListener('localeChange', handleLocaleChange)
    return () => window.removeEventListener('localeChange', handleLocaleChange)
  }, [])

  const handleSelect = (code: Locale) => {
    setLocale(code)
    setLocaleState(code)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg"
      >
        <Globe className="w-5 h-5 text-gray-600" />
        <span className="text-sm font-medium">{LOCALES.find(l => l.code === locale)?.flag}</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[150px]">
          {LOCALES.map((loc) => (
            <button
              key={loc.code}
              onClick={() => handleSelect(loc.code)}
              className={`w-full px-4 py-2 text-right hover:bg-gray-50 flex items-center gap-3 ${
                locale === loc.code ? 'bg-blue-50' : ''
              }`}
            >
              <span className="text-xl">{loc.flag}</span>
              <span className="font-medium">{loc.name}</span>
              {locale === loc.code && (
                <span className="mr-auto text-blue-600">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
