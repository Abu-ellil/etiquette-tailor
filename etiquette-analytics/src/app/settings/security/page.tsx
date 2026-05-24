// صفحة إعدادات الأمان
'use client'

import { useState } from 'react'
import { Shield, Download, Key, Clock } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'

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
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">الأمان</h1>
          <p className="text-sm text-gray-500 mt-1">إعدادات الأمان والنسخ الاحتياطي</p>
        </div>

        <div className="space-y-6">
          {/* النسخ الاحتياطي */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="p-2 bg-green-100 text-green-700 rounded-lg">
                <Download className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-semibold">النسخ الاحتياطي</h2>
            </div>
            <p className="text-gray-600 mb-4">
              قم بإنشاء نسخة احتياطية من جميع بيانات النظام بما في ذلك الطلبات والعملاء والمصروفات.
            </p>
            <button
              onClick={handleBackup}
              disabled={backingUp}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <Download className="w-5 h-5" />
              {backingUp ? 'جاري الإنشاء...' : 'إنشاء نسخة احتياطية'}
            </button>
          </div>

          {/* آخر نسخة احتياطية */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                <Clock className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-semibold">آخر نسخة احتياطية</h2>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">2024-05-24.backup.json</p>
                <p className="text-sm text-gray-500">الحجم: 2.4 MB</p>
              </div>
              <span className="text-green-600 text-sm">منذ يومين</span>
            </div>
          </div>

          {/* تغيير كلمة المرور */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                <Key className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-semibold">كلمة المرور</h2>
            </div>
            <p className="text-gray-600 mb-4">
              قم بتغيير كلمة المرور الخاصة بك لحماية حسابك.
            </p>
            <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
              تغيير كلمة المرور
            </button>
          </div>

          {/* سجل النشاط */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="p-2 bg-orange-100 text-orange-700 rounded-lg">
                <Shield className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-semibold">سجل النشاط</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">تسجيل دخول جديد</span>
                <span className="text-sm text-gray-500">منذ 5 دقائق</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">تعديل طلب #1234</span>
                <span className="text-sm text-gray-500">منذ ساعة</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-600">إنشاء نسخة احتياطية</span>
                <span className="text-sm text-gray-500">منذ يومين</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
