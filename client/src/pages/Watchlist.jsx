import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { DataBadge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { useWatchlist } from '../context/WatchlistContext'
import { shorten } from '../data/mock'
import { formatDateTime } from '../lib/format'

export function WatchlistPage() {
  const { items, unwatch, storage, refresh, hydrated } = useWatchlist()

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 md:px-8 md:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="wa-kicker">Pinned</p>
          <h1 className="wa-display mt-2 text-5xl md:text-6xl">Watchlist</h1>
          <p className="mt-4 max-w-lg text-sm text-quiet">
            Addresses you mark Watch are stored for this session. No account required.
          </p>
        </div>
        <DataBadge>{storage === 'mongo' ? 'MongoDB' : storage === 'memory' ? 'Session store' : 'Local only'}</DataBadge>
      </div>

      {!hydrated && items.length === 0 ? (
        <div className="mt-12">
          <EmptyState kicker="Loading" title="Loading watchlist." body="Checking this session for pinned addresses." />
        </div>
      ) : items.length === 0 ? (
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
            <li key={item.id || item.address} className="wa-row flex flex-wrap items-center gap-4 py-5">
              <Link to={`/investigate/${item.address}`} className="wa-mono text-sm hover:text-accent">
                {shorten(item.address, 6)}
              </Link>
              {item.label ? <span className="text-[12px] text-quiet">{item.label}</span> : null}
              <span className="text-[12px] text-quiet">{item.chain || item.network}</span>
              <span className="text-[12px] text-faint">{formatDateTime(item.createdAt || item.savedAt)}</span>
              <div className="ml-auto flex gap-2">
                <Button as={Link} to={`/investigate/${item.address}`} variant="secondary" className="px-3 py-1.5 text-[12px]">
                  Open Investigation
                </Button>
                <Button variant="ghost" onClick={() => unwatch(item.address)}>
                  Unwatch
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
