import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { DataBadge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { useHistoryLog } from '../context/HistoryContext'
import { shorten } from '../data/mock'
import { formatDateTime } from '../lib/format'

export function HistoryPage() {
  const { items, storage, refresh, hydrated } = useHistoryLog()

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 md:px-8 md:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="wa-kicker">Archive</p>
          <h1 className="wa-display mt-2 text-5xl md:text-6xl">Investigation history</h1>
          <p className="mt-4 max-w-lg text-sm text-quiet">
            Completed investigations for this session. Open a row to see the saved report, not a new guess.
          </p>
        </div>
        <DataBadge>{storage === 'mongo' ? 'MongoDB' : storage === 'memory' ? 'Session store' : 'Local only'}</DataBadge>
      </div>

      {!hydrated && items.length === 0 ? (
        <div className="mt-12">
          <EmptyState kicker="Loading" title="Loading session archive." body="Checking this session for saved investigations." />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-12">
          <EmptyState
            title="No investigations yet."
            body="Run an address through Investigate. Successful lookups are stored for this session."
            action={
              <Button as={Link} to="/investigate">
                Investigate an address
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-12 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-y border-line text-[11px] tracking-[0.14em] text-faint uppercase">
                <th className="py-3 font-medium">Address</th>
                <th className="py-3 font-medium">Network</th>
                <th className="py-3 font-medium">Signals</th>
                <th className="py-3 font-medium">Risk</th>
                <th className="py-3 font-medium">Timestamp</th>
                <th className="py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id || `${row.address}-${row.investigatedAt}`} className="wa-row border-b border-line">
                  <td className="py-4">
                    <span className="wa-mono text-[13px]">{shorten(row.address, 5)}</span>
                  </td>
                  <td className="py-4 text-quiet">{row.chainLabel || row.networkLabel || row.chain || row.network}</td>
                  <td className="py-4 text-quiet">{row.signalCount ?? row.eventCount ?? '—'}</td>
                  <td className="py-4 text-quiet">
                    {row.riskScore == null ? '—' : `${row.riskScore} · ${row.severity || ''}`.trim()}
                  </td>
                  <td className="py-4 text-quiet">{formatDateTime(row.investigatedAt)}</td>
                  <td className="py-4 text-right">
                    <Button
                      as={Link}
                      to={row.id ? `/history/${row.id}` : `/investigate/${row.address}`}
                      variant="secondary"
                      className="px-3 py-1.5 text-[12px]"
                    >
                      Open Investigation
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
