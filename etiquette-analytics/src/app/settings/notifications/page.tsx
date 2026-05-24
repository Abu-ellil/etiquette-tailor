// صفحة إعدادات الإشعارات
'use client'

import { useState } from 'react'
import { Bell, Mail, MessageSquare, Check } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'

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
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary">الإشعارات</h1>
          <p className="text-sm text-text-tertiary mt-1">إعدادات SMS والبريد الإلكتروني</p>
        </div>

        <div className="space-y-6">
          {/* قنوات الإشعارات */}
          <div className="bg-bg-card rounded-xl shadow-sm border border-border-primary p-6">
            <h2 className="text-lg font-semibold mb-4">قنوات الإشعارات</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-bg-secondary rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="p-2 bg-accent-info-light text-accent-info rounded-lg">
                    <MessageSquare className="w-5 h-5" />
                  </span>
                  <div>
                    <p className="font-medium text-text-primary">رسائل SMS</p>
                    <p className="text-sm text-text-tertiary">إرسال إشعارات عبر الهاتف</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle('smsEnabled')}
                  className={`min-h-[44px] relative w-14 h-7 rounded-full transition-colors ${
                    settings.smsEnabled ? 'bg-accent-primary' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 ${
                      settings.smsEnabled ? 'left-1' : 'right-1'
                    } w-5 h-5 bg-white rounded-full shadow transition-all`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-bg-secondary rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="p-2 bg-accent-success-light text-accent-success rounded-lg">
                    <Mail className="w-5 h-5" />
                  </span>
                  <div>
                    <p className="font-medium text-text-primary">البريد الإلكتروني</p>
                    <p className="text-sm text-text-tertiary">إرسال إشعارات عبر البريد</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle('emailEnabled')}
                  className={`min-h-[44px] relative w-14 h-7 rounded-full transition-colors ${
                    settings.emailEnabled ? 'bg-accent-primary' : 'bg-gray-300'
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
          <div className="bg-bg-card rounded-xl shadow-sm border border-border-primary p-6">
            <h2 className="text-lg font-semibold mb-4">أنواع الإشعارات</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-border-primary rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="p-2 bg-accent-warning-light text-accent-warning rounded-lg">
                    <Bell className="w-5 h-5" />
                  </span>
                  <div>
                    <p className="font-medium text-text-primary">تغيير حالة الطلب</p>
                    <p className="text-sm text-text-tertiary">إشعار العميل عند تغيير حالة طلباته</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle('orderStatusChange')}
                  className={`min-h-[44px] relative w-14 h-7 rounded-full transition-colors ${
                    settings.orderStatusChange ? 'bg-accent-primary' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 ${
                      settings.orderStatusChange ? 'left-1' : 'right-1'
                    } w-5 h-5 bg-white rounded-full shadow transition-all`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 border border-border-primary rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="p-2 bg-accent-success-light text-accent-success rounded-lg">
                    <Check className="w-5 h-5" />
                  </span>
                  <div>
                    <p className="font-medium text-text-primary">جاهز للتسليم</p>
                    <p className="text-sm text-text-tertiary">إشعار العميل عند جاهزية الطلب</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle('orderReady')}
                  className={`min-h-[44px] relative w-14 h-7 rounded-full transition-colors ${
                    settings.orderReady ? 'bg-accent-primary' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 ${
                      settings.orderReady ? 'left-1' : 'right-1'
                    } w-5 h-5 bg-white rounded-full shadow transition-all`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 border border-border-primary rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="p-2 bg-accent-danger-light text-accent-danger rounded-lg">
                    <Bell className="w-5 h-5" />
                  </span>
                  <div>
                    <p className="font-medium text-text-primary">تذكير بالدفع</p>
                    <p className="text-sm text-text-tertiary">تذكير العملاء بالمدفوعات المتبقية</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle('paymentReminder')}
                  className={`min-h-[44px] relative w-14 h-7 rounded-full transition-colors ${
                    settings.paymentReminder ? 'bg-accent-primary' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 ${
                      settings.paymentReminder ? 'left-1' : 'right-1'
                    } w-5 h-5 bg-white rounded-full shadow transition-all`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 border border-border-primary rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                    <Bell className="w-5 h-5" />
                  </span>
                  <div>
                    <p className="font-medium text-text-primary">تذكير بموعد التسليم</p>
                    <p className="text-sm text-text-tertiary">تذكير العميل بموعد استلام الطلب</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle('deliveryReminder')}
                  className={`min-h-[44px] relative w-14 h-7 rounded-full transition-colors ${
                    settings.deliveryReminder ? 'bg-accent-primary' : 'bg-gray-300'
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
              className="min-h-[44px] flex items-center gap-2 px-6 py-3 bg-accent-primary text-white rounded-lg hover:bg-accent-primary-hover disabled:opacity-50"
            >
              {saving ? 'جاري الحفظ...' : saved ? 'تم الحفظ' : 'حفظ الإعدادات'}
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
