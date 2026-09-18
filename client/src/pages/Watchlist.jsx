import { Link } from 'react-router-dom'
import { DataBadge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { useWatchlist } from '../context/WatchlistContext'
import { shorten } from '../data/mock'
import { formatDateTime } from '../lib/format'

export function WatchlistPage() {
  const { items, unwatch } = useWatchlist()

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 md:px-8 md:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="wa-kicker">Local</p>
          <h1 className="wa-display mt-2 text-5xl md:text-6xl">Watchlist</h1>
          <p className="mt-4 max-w-lg text-sm text-quiet">
            Addresses you mark Watch are stored in this browser only. No account. No backend yet.
          </p>
        </div>
        <DataBadge>Local only</DataBadge>
      </div>

      {items.length === 0 ? (
        <div className="mt-12">
          <EmptyState
            title="Nothing on the glass."
            body="Open an investigation and press Watch to pin an address here."
            action={
              <Button as={Link} to="/investigate">
                Investigate an address
              </Button>
            }
          />
        </div>
      ) : (
        <ul className="mt-12 divide-y divide-line border-y border-line">
          {items.map((item) => (
            <li key={item.address} className="flex flex-wrap items-center gap-4 py-5">
              <Link to={`/investigate/${item.address}`} className="wa-mono text-sm hover:text-accent">
                {shorten(item.address, 6)}
              </Link>
              <span className="text-[12px] text-quiet">{item.network}</span>
              {item.riskScore != null ? (
                <span className="wa-mono text-[12px] text-quiet">risk {item.riskScore}</span>
              ) : null}
              <span className="text-[12px] text-faint">{formatDateTime(item.savedAt)}</span>
              <Button variant="ghost" className="ml-auto" onClick={() => unwatch(item.address)}>
                Unwatch
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
