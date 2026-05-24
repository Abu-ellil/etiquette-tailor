// صفحة الإعدادات الرئيسية
'use client'

import { useRouter } from 'next/navigation'
import { Users, Package, Building2, Bell, Globe, Shield } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'

const SETTINGS_SECTIONS = [
  {
    id: 'users',
    title: 'المستخدمين',
    description: 'إدارة صلاحيات المستخدمين والعمال',
    icon: <Users className="w-6 h-6" />,
    href: '/settings/users',
    color: 'blue',
  },
  {
    id: 'piece-types',
    title: 'أنواع القطع',
    description: 'إدارة أنواع القطع وأسعارها',
    icon: <Package className="w-6 h-6" />,
    href: '/settings/piece-types',
    color: 'green',
  },
  {
    id: 'branches',
    title: 'الفروع',
    description: 'إدارة فروع المحل',
    icon: <Building2 className="w-6 h-6" />,
    href: '/settings/branches',
    color: 'purple',
  },
  {
    id: 'notifications',
    title: 'الإشعارات',
    description: 'إعدادات SMS والبريد الإلكتروني',
    icon: <Bell className="w-6 h-6" />,
    href: '/settings/notifications',
    color: 'orange',
  },
  {
    id: 'language',
    title: 'اللغة',
    description: 'إعدادات اللغة والترجمة',
    icon: <Globe className="w-6 h-6" />,
    href: '/settings/language',
    color: 'cyan',
  },
  {
    id: 'security',
    title: 'الأمان',
    description: 'إعدادات الأمان والنسخ الاحتياطي',
    icon: <Shield className="w-6 h-6" />,
    href: '/settings/security',
    color: 'red',
  },
]

const COLOR_CLASSES: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-700',
  green: 'bg-green-50 text-green-700',
  purple: 'bg-purple-50 text-purple-700',
  orange: 'bg-orange-50 text-orange-700',
  cyan: 'bg-cyan-50 text-cyan-700',
  red: 'bg-red-50 text-red-700',
}

export default function SettingsPage() {
  const router = useRouter()

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl font-bold text-text-primary mb-6">الإعدادات</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SETTINGS_SECTIONS.map(section => (
            <button
              key={section.id}
              onClick={() => router.push(section.href)}
              className="min-h-[44px] bg-bg-card rounded-xl shadow-sm border border-border-primary p-6 text-right hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                <span className={`p-3 rounded-lg ${COLOR_CLASSES[section.color]}`}>
                  {section.icon}
                </span>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-text-primary">{section.title}</h3>
                  <p className="text-sm text-text-tertiary mt-1">{section.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </AppShell>
  )
}
