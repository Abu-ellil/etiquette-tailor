'use client'

import { Navbar } from './Navbar'
import { MobileNav } from './MobileNav'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg-secondary" dir="rtl">
      <div className="desktop-nav">
        <Navbar />
      </div>
      <main className="page-main">
        {children}
      </main>
      <MobileNav />
    </div>
  )
}
