import { cn } from '../../lib/format'

export function DataBadge({ children = 'Ethereum mainnet', className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center border border-line px-2 py-0.5 text-[10px] font-semibold tracking-[0.16em] text-quiet uppercase',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function MockBadge(props) {
  return <DataBadge {...props} />
}

export function SeverityMark({ severity, className }) {
  const label = String(severity || 'info').toUpperCase()
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 text-[10px] font-semibold tracking-[0.16em] uppercase',
        className,
      )}
    >
      <i
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: `var(--wa-${severity || 'info'})` }}
        aria-hidden="true"
      />
      <span style={{ color: `var(--wa-${severity || 'info'})` }}>{label}</span>
    </span>
  )
}
