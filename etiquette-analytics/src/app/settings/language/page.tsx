// صفحة إعدادات اللغة
'use client'

import { useState } from 'react'
import { Globe, Check } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'

const LANGUAGES = [
  { code: 'ar', name: 'العربية', flag: '🇸🇦', direction: 'rtl' },
  { code: 'en', name: 'English', flag: '🇬🇧', direction: 'ltr' },
]

export default function LanguageSettingsPage() {
  const [selectedLang, setSelectedLang] = useState('ar')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    // حفظ التفضيل (محاكاة)
    await new Promise(resolve => setTimeout(resolve, 500))
    setSaving(false)
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary">اللغة</h1>
          <p className="text-sm text-text-tertiary mt-1">إعدادات اللغة والترجمة</p>
        </div>

        <div className="bg-bg-card rounded-xl shadow-sm border border-border-primary p-6">
          <h2 className="text-lg font-semibold mb-4">اختر اللغة المفضلة</h2>
          <div className="space-y-3">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setSelectedLang(lang.code)}
                className={`min-h-[44px] w-full flex items-center justify-between p-4 border-2 rounded-lg transition-colors ${
                  selectedLang === lang.code
                    ? 'border-accent-primary bg-accent-info-light'
                    : 'border-border-primary hover:bg-bg-card-hover'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl">{lang.flag}</span>
                  <div className="text-right">
                    <p className="font-medium text-text-primary">{lang.name}</p>
                    <p className="text-sm text-text-tertiary">
                      {lang.direction === 'rtl' ? 'من اليمين إلى اليسار' : 'من اليسار إلى اليمين'}
                    </p>
                  </div>
                </div>
                {selectedLang === lang.code && (
                  <span className="p-2 bg-accent-primary text-white rounded-full">
                    <Check className="w-5 h-5" />
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-border-primary">
            <button
              onClick={handleSave}
              disabled={saving}
              className="min-h-[44px] w-full py-3 bg-accent-primary text-white rounded-lg hover:bg-accent-primary-hover disabled:opacity-50"
            >
              {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </button>
          </div>
        </div>

        <div className="mt-6 bg-accent-warning-light border border-accent-warning rounded-xl p-4">
          <p className="text-sm text-accent-warning">
            <strong>ملاحظة:</strong> الدعم الكامل للغتين سيتم إضافته في تحديث قادم. حالياً الواجهة باللغة العربية فقط.
          </p>
        </div>
      </div>
    </AppShell>
  )
}
