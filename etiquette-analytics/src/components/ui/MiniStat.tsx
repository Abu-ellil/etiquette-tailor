type MiniStatProps = {
  label: string
  value: string | number
  className?: string
}

export function MiniStat({ label, value, className = '' }: MiniStatProps) {
  return (
    <div className={`mini-stat ${className}`}>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</p>
      <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{value}</p>
    </div>
  )
}
