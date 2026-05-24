'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from '@/lib/auth'
import { useTheme } from '@/contexts/ThemeContext'
import { NAV_ITEMS } from '@/lib/nav-config'
import {
  LogOut,
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

  return (
    <nav className="top-bar">
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
            <Link href="/dashboard" className="text-xl font-extrabold text-text-primary no-underline" style={{ letterSpacing: -0.5 }}>
              Etiquette
            </Link>
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {NAV_ITEMS.map(item => {
              const isActive = pathname === item.href || (item.href !== '/orders/new' && pathname.startsWith(item.href + '/'))
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-link ${item.highlight ? 'highlight' : isActive ? 'active' : 'inactive'}`}
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
              className="theme-btn"
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
