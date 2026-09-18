import { cn } from '../../lib/format'

const variants = {
  primary: 'bg-accent text-accent-ink hover:brightness-95',
  secondary: 'border border-line bg-transparent text-ink hover:bg-inset',
  ghost: 'bg-transparent text-quiet hover:text-ink hover:bg-inset',
  danger: 'border border-critical/40 text-critical hover:bg-critical/10',
}

export function Button({
  as: As = 'button',
  variant = 'primary',
  className,
  children,
  type,
  ...props
}) {
  const computedType = As === 'button' ? type ?? 'button' : undefined
  return (
    <As
      type={computedType}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-sm px-4 py-2 text-[13px] font-medium tracking-tight transition duration-150 disabled:cursor-not-allowed disabled:opacity-40',
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </As>
  )
}
