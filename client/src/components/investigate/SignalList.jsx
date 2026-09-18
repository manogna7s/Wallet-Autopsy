import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { SeverityMark } from '../ui/Badge'
import { shorten } from '../../data/mock'
import { cn } from '../../lib/format'

export function SignalList({ signals }) {
  const [openId, setOpenId] = useState(null)

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="wa-display text-3xl">Signals</h2>
        </div>
        <p className="text-[12px] text-quiet">{signals.length}</p>
      </div>
      <ul className="divide-y divide-line border-y border-line">
        {signals.map((signal) => {
          const open = openId === signal.id
          return (
            <li key={signal.id}>
              <button
                type="button"
                className="flex w-full items-start gap-4 py-4 text-left hover:bg-inset/50"
                aria-expanded={open}
                onClick={() => setOpenId(open ? null : signal.id)}
              >
                <SeverityMark severity={toneFor(signal.severity)} className="mt-1 w-24 shrink-0" />
                <span className="flex-1">
                  <span className="block text-sm">{signal.title}</span>
                  {open ? (
                    <span className="mt-1 block text-[13px] text-quiet">{signal.summary}</span>
                  ) : (
                    <span className="mt-1 block text-[12px] text-faint">
                      {[signal.label, signal.contribution != null ? `+${signal.contribution}` : null]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  )}
                </span>
                <ChevronDown
                  className={cn('mt-1 h-4 w-4 text-faint transition', open && 'rotate-180')}
                />
              </button>
              {open ? (
                <div className="wa-reveal pb-5 pl-28">
                  <dl className="grid gap-3 md:grid-cols-2">
                    {signal.evidence.map((row) => (
                      <div key={row.label}>
                        <dt className="wa-kicker">{row.label}</dt>
                        <dd className="wa-mono mt-1 text-[12px] text-quiet">
                          {looksLikeHex(row.value) ? shorten(row.value, 6) : row.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  {signal.affectedTransactions?.length ? (
                    <div className="mt-4">
                      <p className="wa-kicker">Affected transactions</p>
                      <ul className="mt-2 space-y-1">
                        {signal.affectedTransactions.slice(0, 8).map((hash) => (
                          <li key={hash} className="wa-mono text-[12px] text-quiet">
                            {shorten(hash, 8)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function looksLikeHex(value) {
  return typeof value === 'string' && value.startsWith('0x') && value.length > 16
}

function toneFor(severity) {
  if (severity === 'elevated') return 'high'
  if (severity === 'moderate') return 'medium'
  return severity || 'info'
}
