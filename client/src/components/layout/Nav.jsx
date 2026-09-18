import { NavLink } from 'react-router-dom'
import { cn } from '../../lib/format'

const links = [
  { to: '/', label: 'Overview', end: true },
  { to: '/investigate', label: 'Investigate' },
  { to: '/watchlist', label: 'Watchlist' },
  { to: '/history', label: 'History' },
]

export function NavLinks({ onNavigate, className }) {
  return (
    <div className={cn('flex flex-col gap-1 md:flex-row md:items-center md:gap-7', className)}>
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'py-2 text-[13px] tracking-wide text-quiet transition hover:text-ink',
              isActive && 'text-ink',
            )
          }
        >
          {link.label}
        </NavLink>
      ))}
    </div>
  )
}

export function Wordmark({ className }) {
  return (
    <span className={cn('flex items-baseline gap-2', className)}>
      <span className="wa-display text-[1.45rem] italic leading-none">Wallet</span>
      <span className="text-[0.62rem] font-semibold tracking-[0.24em] text-quiet uppercase">
        Autopsy
      </span>
    </span>
  )
}
