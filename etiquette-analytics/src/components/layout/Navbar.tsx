// شريط التنقل الرئيسي
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Wrench,
  DollarSign,
  FileText,
  Settings,
  LogOut,
  Plus
} from 'lucide-react'
import { LanguageSwitcher } from '@/components/language/LanguageSwitcher'

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  const navItems = [
    { href: '/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
    { href: '/orders', label: 'الطلبات', icon: ShoppingCart },
    { href: '/orders/new', label: 'طلب جديد', icon: Plus, highlight: true },
    { href: '/customers', label: 'العملاء', icon: Users },
    { href: '/production', label: 'الإنتاج', icon: Wrench },
    { href: '/payments', label: 'المالية', icon: DollarSign },
    { href: '/reports', label: 'التقارير', icon: FileText },
    { href: '/settings', label: 'الإعدادات', icon: Settings },
  ]

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="text-xl font-bold text-gray-900">
              Etiquette
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map(item => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${item.highlight
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : isActive
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              )
            })}
          </div>

          {/* Sign Out & Language */}
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg text-sm font-medium"
            >
              <LogOut className="w-4 h-4" />
              تسجيل الخروج
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
