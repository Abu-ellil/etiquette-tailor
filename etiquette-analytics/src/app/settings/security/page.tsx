// صفحة إعدادات الأمان
'use client'

import { useState } from 'react'
import { Shield, Download, Key, Clock } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'

export default function SecuritySettingsPage() {
  const [backingUp, setBackingUp] = useState(false)

  const handleBackup = async () => {
    setBackingUp(true)
    // محاكاة النسخ الاحتياطي
    await new Promise(resolve => setTimeout(resolve, 2000))
    setBackingUp(false)
    alert('تم إنشاء النسخة الاحتياطية بنجاح')
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary">الأمان</h1>
          <p className="text-sm text-text-tertiary mt-1">إعدادات الأمان والنسخ الاحتياطي</p>
        </div>

        <div className="space-y-6">
          {/* النسخ الاحتياطي */}
          <div className="bg-bg-card rounded-xl shadow-sm border border-border-primary p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="p-2 bg-accent-success-light text-accent-success rounded-lg">
                <Download className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-semibold text-text-primary">النسخ الاحتياطي</h2>
            </div>
            <p className="text-text-secondary mb-4">
              قم بإنشاء نسخة احتياطية من جميع بيانات النظام بما في ذلك الطلبات والعملاء والمصروفات.
            </p>
            <button
              onClick={handleBackup}
              disabled={backingUp}
              className="min-h-[44px] flex items-center gap-2 px-4 py-2 bg-accent-success text-white rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              <Download className="w-5 h-5" />
              {backingUp ? 'جاري الإنشاء...' : 'إنشاء نسخة احتياطية'}
            </button>
          </div>

          {/* آخر نسخة احتياطية */}
          <div className="bg-bg-card rounded-xl shadow-sm border border-border-primary p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="p-2 bg-accent-info-light text-accent-info rounded-lg">
                <Clock className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-semibold text-text-primary">آخر نسخة احتياطية</h2>
            </div>
            <div className="flex items-center justify-between p-4 bg-bg-secondary rounded-lg">
              <div>
                <p className="font-medium text-text-primary">2024-05-24.backup.json</p>
                <p className="text-sm text-text-tertiary">الحجم: 2.4 MB</p>
              </div>
              <span className="text-accent-success text-sm">منذ يومين</span>
            </div>
          </div>

          {/* تغيير كلمة المرور */}
          <div className="bg-bg-card rounded-xl shadow-sm border border-border-primary p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                <Key className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-semibold text-text-primary">كلمة المرور</h2>
            </div>
            <p className="text-text-secondary mb-4">
              قم بتغيير كلمة المرور الخاصة بك لحماية حسابك.
            </p>
            <button className="min-h-[44px] px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
              تغيير كلمة المرور
            </button>
          </div>

          {/* سجل النشاط */}
          <div className="bg-bg-card rounded-xl shadow-sm border border-border-primary p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="p-2 bg-accent-warning-light text-accent-warning rounded-lg">
                <Shield className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-semibold text-text-primary">سجل النشاط</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-border-primary">
                <span className="text-text-secondary">تسجيل دخول جديد</span>
                <span className="text-sm text-text-tertiary">منذ 5 دقائق</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border-primary">
                <span className="text-text-secondary">تعديل طلب #1234</span>
                <span className="text-sm text-text-tertiary">منذ ساعة</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-text-secondary">إنشاء نسخة احتياطية</span>
                <span className="text-sm text-text-tertiary">منذ يومين</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
