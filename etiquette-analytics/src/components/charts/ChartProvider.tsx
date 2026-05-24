'use client'

import { useTheme } from '@/contexts/ThemeContext'
import {
  ResponsiveContainer,
} from 'recharts'
import type { ReactNode } from 'react'

const COLORS = {
  light: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'],
  dark: ['#818cf8', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#22d3ee'],
}

export function useChartColors() {
  const { theme } = useTheme()
  return {
    colors: COLORS[theme],
    grid: theme === 'dark' ? '#2a2d3e' : '#e5e7eb',
    text: theme === 'dark' ? '#94a3b8' : '#6b7280',
    bg: theme === 'dark' ? '#1a1c2e' : '#ffffff',
    border: theme === 'dark' ? '#2a2d3e' : '#e5e7eb',
  }
}

interface ChartTooltipProps {
  active?: boolean
  payload?: Array<{ value?: number; name?: string; color?: string }>
  label?: string
  formatter?: (v: number | undefined) => string
}

export function ChartTooltip({ active, payload, label, formatter }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-primary)',
      borderRadius: 10,
      padding: '10px 14px',
      boxShadow: 'var(--shadow-lg)',
      direction: 'rtl',
    }}>
      {label && <p style={{ color: 'var(--text-tertiary)', fontSize: 12, marginBottom: 4 }}>{label}</p>}
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color as string, fontSize: 13, fontWeight: 600 }}>
          {entry.name}: {formatter ? formatter(entry.value as number) : (entry.value as number)?.toLocaleString('ar-QA')}
        </p>
      ))}
    </div>
  )
}

type ResponsiveHeight = number | { mobile: number; desktop: number }

function useResponsiveHeight(height: ResponsiveHeight): number {
  if (typeof height === 'number') return height
  if (typeof window === 'undefined') return height.desktop
  return window.innerWidth < 768 ? height.mobile : height.desktop
}

interface ChartContainerProps {
  children: ReactNode
  height?: ResponsiveHeight
  title?: string
  subtitle?: string
  action?: ReactNode
  className?: string
  style?: React.CSSProperties
}

export function ChartContainer({ children, height = { mobile: 220, desktop: 320 }, title, subtitle, action, className, style }: ChartContainerProps) {
  const resolvedHeight = useResponsiveHeight(height)
  return (
    <div className={`chart-card ${className || ''}`} style={style}>
      {(title || action) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            {title && <h3 className="section-title">{title}</h3>}
            {subtitle && <p className="page-subtitle" style={{ marginTop: 2 }}>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <ResponsiveContainer width="100%" height={resolvedHeight}>
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  )
}
