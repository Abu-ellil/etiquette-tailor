type StatusBadgeProps = {
  label: string
  color: string
  bg: string
  className?: string
}

export function StatusBadge({ label, color, bg, className = '' }: StatusBadgeProps) {
  return (
    <span
      className={`status-badge ${className}`}
      style={{ color, background: bg }}
    >
      {label}
    </span>
  )
}
