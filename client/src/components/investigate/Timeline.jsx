import { useState } from 'react'
import { SeverityMark } from '../ui/Badge'
import { formatDateTime, formatTokenValue, toneFor } from '../../lib/format'
import { shorten } from '../../data/mock'
import { cn } from '../../lib/format'
import { ExplorerLink } from './NodePanel'

export function Timeline({ events }) {
  const [openId, setOpenId] = useState(events.find((event) => event.hasSignal)?.id ?? null)
  const [signalsOnly, setSignalsOnly] = useState(false)
  const rows = signalsOnly ? events.filter((event) => event.hasSignal) : events

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="wa-display text-3xl">Ledger</h2>
        </div>
        <label className="flex items-center gap-2 text-[12px] text-quiet">
          <input
            type="checkbox"
            checked={signalsOnly}
            onChange={(event) => setSignalsOnly(event.target.checked)}
            className="accent-[var(--wa-accent)]"
          />
          Signal-linked only
        </label>
      </div>

      {rows.length === 0 ? (
        <p className="mt-8 text-sm text-quiet">No transactions in this filter.</p>
      ) : (
        <ol className="mt-8">
          {rows.map((event, index) => {
            const open = openId === event.id
            return (
              <li
                key={event.id}
                className="wa-reveal grid grid-cols-[16px_1fr] gap-4"
                style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
              >
                <div className="flex flex-col items-center">
                  <span
                    className="mt-1.5 h-2 w-2 rounded-full"
                    style={{ background: `var(--wa-${toneFor(event.severity)})` }}
                  />
                  {index < rows.length - 1 ? <span className="w-px flex-1 bg-line" /> : null}
                </div>
                <div className={cn('pb-8', index === rows.length - 1 && 'pb-0')}>
                  <button
                    type="button"
                    className="w-full text-left hover:text-accent"
                    aria-expanded={open}
                    onClick={() => setOpenId(open ? null : event.id)}
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-sm">{event.typeLabel}</span>
                      {event.hasSignal ? <SeverityMark severity={toneFor(event.severity)} /> : null}
                    </div>
                    <p className="mt-1 text-[12px] text-quiet">
                      {event.at ? formatDateTime(event.at) : event.blockNum ? `Block ${event.blockNum}` : 'Time unknown'}
                      {event.token ? ` · ${formatTokenValue(event.value, event.token)}` : event.value != null ? ` · ${formatTokenValue(event.value)}` : ''}
                    </p>
                  </button>
                  {open ? (
                    <div className="mt-4 border-l border-line pl-4">
                      <dl className="grid gap-3 sm:grid-cols-2">
                        <Fact label="Time" value={event.at ? formatDateTime(event.at) : '—'} />
                        <Fact label="Transaction type" value={event.typeLabel} />
                        <Fact label="From" value={event.from ? shorten(event.from, 6) : '—'} mono />
                        <Fact label="To" value={event.to ? shorten(event.to, 6) : '—'} mono />
                        <Fact label="Token" value={event.token || (event.tokenAddress ? shorten(event.tokenAddress, 4) : '—')} />
                        <Fact label="Value" value={formatTokenValue(event.value, event.token)} />
                        <Fact label="Contract" value={event.contract ? shorten(event.contract, 6) : '—'} mono />
                        <Fact label="Status" value={event.status || '—'} />
                      </dl>
                      {event.hash ? (
                        <p className="mt-4">
                          <span className="wa-kicker mr-2">Transaction hash</span>
                          <ExplorerLink href={event.explorerUrl}>{shorten(event.hash, 10)}</ExplorerLink>
                        </p>
                      ) : null}
                      {event.signals.map((signal) => (
                        <div key={signal.id} className="mt-5 border-t border-line pt-4">
                          <p className="wa-kicker">Security signal</p>
                          <p className="mt-1 text-sm">{signal.title}</p>
                          {signal.label ? <p className="mt-1 text-[11px] tracking-[0.12em] text-quiet uppercase">{signal.label}</p> : null}
                          <p className="wa-kicker mt-4">Why it matters</p>
                          <p className="mt-1 text-[13px] text-quiet">{signal.why}</p>
                          {signal.evidence.length ? (
                            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                              {signal.evidence.map((row) => (
                                <Fact
                                  key={row.label}
                                  label={row.label === 'Transaction' ? 'Evidence' : row.label}
                                  value={
                                    String(row.value).startsWith('0x') && String(row.value).length > 16
                                      ? shorten(row.value, 6)
                                      : row.value
                                  }
                                  mono={String(row.value).startsWith('0x')}
                                />
                              ))}
                            </dl>
                          ) : null}
                          {signal.hash ? (
                            <p className="mt-3">
                              <span className="wa-kicker mr-2">Transaction hash</span>
                              <ExplorerLink href={signal.explorerUrl}>{shorten(signal.hash, 10)}</ExplorerLink>
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}

function Fact({ label, value, mono }) {
  return (
    <div>
      <dt className="wa-kicker">{label}</dt>
      <dd className={cn('mt-1 text-[13px] text-quiet', mono && 'wa-mono text-[12px]')}>{value}</dd>
    </div>
  )
}
