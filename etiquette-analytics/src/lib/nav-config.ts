import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Wrench,
  DollarSign,
  FileText,
  Settings,
  Plus,
  Scissors,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  highlight?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
  { href: '/orders', label: 'الطلبات', icon: ShoppingCart },
  { href: '/orders/new', label: 'طلب جديد', icon: Plus, highlight: true },
  { href: '/customers', label: 'العملاء', icon: Users },
  { href: '/production', label: 'الإنتاج', icon: Wrench },
  { href: '/payments', label: 'المالية', icon: DollarSign },
  { href: '/reports', label: 'التقارير', icon: FileText },
  { href: '/settings', label: 'الإعدادات', icon: Settings },
]

export const MOBILE_TAB_ITEMS: NavItem[] = [
  NAV_ITEMS[0], // Dashboard
  NAV_ITEMS[1], // Orders
  NAV_ITEMS[2], // + New Order (FAB)
  NAV_ITEMS[3], // Customers
]

export const MORE_TAB_ITEMS: NavItem[] = [
  NAV_ITEMS[4], // Production
  NAV_ITEMS[5], // Payments
  { href: '/expenses', label: 'المصروفات', icon: DollarSign },
  NAV_ITEMS[6], // Reports
  NAV_ITEMS[7], // Settings
]
