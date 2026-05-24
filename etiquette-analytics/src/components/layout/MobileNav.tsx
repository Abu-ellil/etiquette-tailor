'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ShoppingCart, Plus, Users, Menu } from 'lucide-react'
import { useState } from 'react'
import { MOBILE_TAB_ITEMS, MORE_TAB_ITEMS } from '@/lib/nav-config'

export function MobileNav() {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)

  const tabs = [
    { href: '/dashboard', label: 'الرئيسية', icon: LayoutDashboard },
    { href: '/orders', label: 'الطلبات', icon: ShoppingCart },
    { href: '/orders/new', label: '', icon: Plus, fab: true },
    { href: '/customers', label: 'العملاء', icon: Users },
  ]

  const isActive = (href: string) =>
    href === '/orders/new'
      ? pathname === href
      : pathname === href || pathname.startsWith(href + '/')

  return (
    <>
      <nav className="bottom-tabs">
        {tabs.map((tab) => {
          if (tab.fab) {
            return (
              <Link key={tab.href} href={tab.href} className="bottom-tab-add">
                <Plus style={{ width: 22, height: 22 }} />
              </Link>
            )
          }
          const Icon = tab.icon
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`bottom-tab ${isActive(tab.href) ? 'active' : ''}`}
            >
              <Icon style={{ width: 20, height: 20 }} />
              <span>{tab.label}</span>
            </Link>
          )
        })}
        <button
          className={`bottom-tab ${moreOpen ? 'active' : ''}`}
          onClick={() => setMoreOpen(!moreOpen)}
        >
          <Menu style={{ width: 20, height: 20 }} />
          <span>المزيد</span>
        </button>
      </nav>

      {/* More sheet overlay */}
      {moreOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setMoreOpen(false)}
        />
      )}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-bg-card border-t border-border-primary rounded-t-2xl transition-transform duration-200 md:hidden ${
          moreOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ paddingBottom: 'var(--safe-bottom)' }}
      >
        <div className="grid grid-cols-3 gap-3 p-5">
          {MORE_TAB_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                className="flex flex-col items-center gap-2 py-3 rounded-xl hover:bg-bg-tertiary transition-colors"
              >
                <Icon style={{ width: 22, height: 22, color: 'var(--text-secondary)' }} />
                <span className="text-xs font-semibold text-text-secondary">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </>
  )
}
