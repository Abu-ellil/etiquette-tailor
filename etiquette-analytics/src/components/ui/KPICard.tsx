import type { LucideIcon } from 'lucide-react'

type KPICardProps = {
  title: string
  value: string | number
  icon: LucideIcon
  iconBg?: string
  iconColor?: string
  trend?: { value: number; label: string }
  className?: string
}

export function KPICard({ title, value, icon: Icon, iconBg, iconColor, trend, className = '' }: KPICardProps) {
  return (
    <div className={`kpi-card ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="kpi-title">{title}</p>
        <div className="kpi-icon" style={{ background: iconBg || 'var(--accent-primary-light)' }}>
          <Icon style={{ width: 16, height: 16, color: iconColor || 'var(--accent-primary)' }} />
        </div>
      </div>
      <p className="kpi-value">{value}</p>
      {trend && (
        <div className="flex items-center gap-1 mt-1">
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: trend.value >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)',
            }}
          >
            {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{trend.label}</span>
        </div>
      )}
    </div>
  )
}
