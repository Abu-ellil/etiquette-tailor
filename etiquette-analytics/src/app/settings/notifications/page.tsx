// صفحة إعدادات الإشعارات
'use client'

import { useState } from 'react'
import { Bell, Mail, MessageSquare, Check } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'

interface NotificationSettings {
  smsEnabled: boolean
  emailEnabled: boolean
  orderStatusChange: boolean
  orderReady: boolean
  paymentReminder: boolean
  deliveryReminder: boolean
}

const DEFAULT_SETTINGS: NotificationSettings = {
  smsEnabled: false,
  emailEnabled: false,
  orderStatusChange: true,
  orderReady: true,
  paymentReminder: false,
  deliveryReminder: false,
}

export default function NotificationsSettingsPage() {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleToggle = (key: keyof NotificationSettings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)

    // حفظ الإعدادات (محاكاة)
    await new Promise(resolve => setTimeout(resolve, 500))

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">الإشعارات</h1>
          <p className="text-sm text-gray-500 mt-1">إعدادات SMS والبريد الإلكتروني</p>
        </div>

        <div className="space-y-6">
          {/* قنوات الإشعارات */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold mb-4">قنوات الإشعارات</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                    <MessageSquare className="w-5 h-5" />
                  </span>
                  <div>
                    <p className="font-medium">رسائل SMS</p>
                    <p className="text-sm text-gray-500">إرسال إشعارات عبر الهاتف</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle('smsEnabled')}
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    settings.smsEnabled ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 ${
                      settings.smsEnabled ? 'left-1' : 'right-1'
                    } w-5 h-5 bg-white rounded-full shadow transition-all`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="p-2 bg-green-100 text-green-700 rounded-lg">
                    <Mail className="w-5 h-5" />
                  </span>
                  <div>
                    <p className="font-medium">البريد الإلكتروني</p>
                    <p className="text-sm text-gray-500">إرسال إشعارات عبر البريد</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle('emailEnabled')}
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    settings.emailEnabled ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 ${
                      settings.emailEnabled ? 'left-1' : 'right-1'
                    } w-5 h-5 bg-white rounded-full shadow transition-all`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* أنواع الإشعارات */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold mb-4">أنواع الإشعارات</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="p-2 bg-orange-100 text-orange-700 rounded-lg">
                    <Bell className="w-5 h-5" />
                  </span>
                  <div>
                    <p className="font-medium">تغيير حالة الطلب</p>
                    <p className="text-sm text-gray-500">إشعار العميل عند تغيير حالة طلباته</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle('orderStatusChange')}
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    settings.orderStatusChange ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 ${
                      settings.orderStatusChange ? 'left-1' : 'right-1'
                    } w-5 h-5 bg-white rounded-full shadow transition-all`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="p-2 bg-green-100 text-green-700 rounded-lg">
                    <Check className="w-5 h-5" />
                  </span>
                  <div>
                    <p className="font-medium">جاهز للتسليم</p>
                    <p className="text-sm text-gray-500">إشعار العميل عند جاهزية الطلب</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle('orderReady')}
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    settings.orderReady ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 ${
                      settings.orderReady ? 'left-1' : 'right-1'
                    } w-5 h-5 bg-white rounded-full shadow transition-all`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="p-2 bg-red-100 text-red-700 rounded-lg">
                    <Bell className="w-5 h-5" />
                  </span>
                  <div>
                    <p className="font-medium">تذكير بالدفع</p>
                    <p className="text-sm text-gray-500">تذكير العملاء بالمدفوعات المتبقية</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle('paymentReminder')}
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    settings.paymentReminder ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 ${
                      settings.paymentReminder ? 'left-1' : 'right-1'
                    } w-5 h-5 bg-white rounded-full shadow transition-all`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                    <Bell className="w-5 h-5" />
                  </span>
                  <div>
                    <p className="font-medium">تذكير بموعد التسليم</p>
                    <p className="text-sm text-gray-500">تذكير العميل بموعد استلام الطلب</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle('deliveryReminder')}
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    settings.deliveryReminder ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 ${
                      settings.deliveryReminder ? 'left-1' : 'right-1'
                    } w-5 h-5 bg-white rounded-full shadow transition-all`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* حفظ */}
          <div className="flex justify-end gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'جاري الحفظ...' : saved ? 'تم الحفظ ✓' : 'حفظ الإعدادات'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
