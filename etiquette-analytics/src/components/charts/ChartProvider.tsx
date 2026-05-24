'use client'

import { useTheme } from '@/contexts/ThemeContext'
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
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
  const { theme } = useTheme()
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: theme === 'dark' ? '#1a1c2e' : '#ffffff',
      border: `1px solid ${theme === 'dark' ? '#2a2d3e' : '#e5e7eb'}`,
      borderRadius: 10,
      padding: '10px 14px',
      boxShadow: theme === 'dark'
        ? '0 8px 24px rgba(0,0,0,0.5)'
        : '0 4px 12px rgba(0,0,0,0.1)',
      direction: 'rtl',
    }}>
      {label && <p style={{ color: theme === 'dark' ? '#94a3b8' : '#6b7280', fontSize: 12, marginBottom: 4 }}>{label}</p>}
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color as string, fontSize: 13, fontWeight: 600 }}>
          {entry.name}: {formatter ? formatter(entry.value as number) : (entry.value as number)?.toLocaleString('ar-SA')}
        </p>
      ))}
    </div>
  )
}

interface ChartContainerProps {
  children: ReactNode
  height?: number
  title?: string
  subtitle?: string
  action?: ReactNode
  style?: React.CSSProperties
}

export function ChartContainer({ children, height = 320, title, subtitle, action, style }: ChartContainerProps) {
  const { theme } = useTheme()
  return (
    <div style={{
      background: theme === 'dark' ? '#1a1c2e' : '#ffffff',
      border: `1px solid ${theme === 'dark' ? '#2a2d3e' : '#e5e7eb'}`,
      borderRadius: 14,
      boxShadow: theme === 'dark'
        ? '0 4px 12px rgba(0,0,0,0.3)'
        : '0 1px 3px rgba(0,0,0,0.05)',
      padding: 24,
      ...style,
    }}>
      {(title || action) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            {title && <h3 style={{ fontSize: 16, fontWeight: 700, color: theme === 'dark' ? '#f1f5f9' : '#111827', margin: 0 }}>{title}</h3>}
            {subtitle && <p style={{ fontSize: 13, color: theme === 'dark' ? '#94a3b8' : '#6b7280', marginTop: 2 }}>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  )
}
