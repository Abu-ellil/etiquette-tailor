'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from '@/lib/auth'
import { useTheme } from '@/contexts/ThemeContext'
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Wrench,
  DollarSign,
  FileText,
  Settings,
  LogOut,
  Plus,
  Sun,
  Moon,
  Scissors,
} from 'lucide-react'
import { LanguageSwitcher } from '@/components/language/LanguageSwitcher'

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()

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
    <nav style={{
      background: 'var(--bg-nav)',
      borderBottom: '1px solid var(--border-primary)',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      backdropFilter: 'blur(12px)',
    }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Scissors style={{ width: 20, height: 20, color: '#fff' }} />
            </div>
            <Link href="/dashboard" style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', textDecoration: 'none', letterSpacing: -0.5 }}>
              Etiquette
            </Link>
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {navItems.map(item => {
              const isActive = pathname === item.href || (item.href !== '/orders/new' && pathname.startsWith(item.href + '/'))
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: 'none',
                    transition: 'all 0.15s ease',
                    ...(item.highlight
                      ? { background: 'var(--accent-primary)', color: '#fff' }
                      : isActive
                        ? { background: 'var(--accent-primary-light)', color: 'var(--accent-primary)' }
                        : { color: 'var(--text-tertiary)' }
                    ),
                  }}
                >
                  <Icon style={{ width: 16, height: 16 }} />
                  {item.label}
                </Link>
              )
            })}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LanguageSwitcher />
            <button
              onClick={toggleTheme}
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                border: '1px solid var(--border-primary)',
                background: 'var(--bg-tertiary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                color: 'var(--text-secondary)',
              }}
              title={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
            >
              {theme === 'dark' ? <Sun style={{ width: 18, height: 18 }} /> : <Moon style={{ width: 18, height: 18 }} />}
            </button>
            <button
              onClick={handleSignOut}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--text-tertiary)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <LogOut style={{ width: 16, height: 16 }} />
              خروج
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
