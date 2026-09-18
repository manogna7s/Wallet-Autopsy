import { Link } from 'react-router-dom'
import { DataBadge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { useHistoryLog } from '../context/HistoryContext'
import { shorten } from '../data/mock'
import { formatDateTime } from '../lib/format'

export function HistoryPage() {
  const { items } = useHistoryLog()

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 md:px-8 md:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="wa-kicker">Archive</p>
          <h1 className="wa-display mt-2 text-5xl md:text-6xl">Investigation history</h1>
          <p className="mt-4 max-w-lg text-sm text-quiet">
            Addresses you have investigated in this browser. Counts come from the last Alchemy fetch,
            not a fabricated ledger.
          </p>
        </div>
        <DataBadge>Local only</DataBadge>
      </div>

      {items.length === 0 ? (
        <div className="mt-12">
          <EmptyState
            title="No investigations yet."
            body="Run an address through Investigate. Successful lookups are stored on this device."
            action={
              <Button as={Link} to="/investigate">
                Investigate an address
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-12 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-y border-line text-[11px] tracking-[0.14em] text-faint uppercase">
                <th className="py-3 font-medium">Address</th>
                <th className="py-3 font-medium">Network</th>
                <th className="py-3 font-medium">Events</th>
                <th className="py-3 font-medium">Risk</th>
                <th className="py-3 font-medium">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={`${row.address}-${row.investigatedAt}`} className="border-b border-line hover:bg-inset/60">
                  <td className="py-4">
                    <Link to={`/investigate/${row.address}`} className="wa-mono text-[13px] hover:text-accent">
                      {shorten(row.address, 5)}
                    </Link>
                  </td>
                  <td className="py-4 text-quiet">{row.networkLabel || row.network}</td>
                  <td className="py-4 text-quiet">{row.empty ? 'None found' : row.eventCount ?? '—'}</td>
                  <td className="py-4 text-quiet">
                    {row.riskScore == null ? '—' : `${row.riskScore} · ${row.severity || ''}`.trim()}
                  </td>
                  <td className="py-4 text-quiet">{formatDateTime(row.investigatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
