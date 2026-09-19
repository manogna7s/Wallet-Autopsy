import { Fragment, useState } from 'react'
import { SeverityMark } from '../ui/Badge'
import { formatDateTime, formatTokenValue, toneFor } from '../../lib/format'
import { HexInspect } from './NodePanel'
import { addressExplorerUrl } from '../../lib/explorer'
import { cn } from '../../lib/format'

export function Timeline({ events, chain = 'ethereum', onInspect }) {
  const [openId, setOpenId] = useState(events.find((event) => event.hasSignal)?.id ?? null)
  const [signalsOnly, setSignalsOnly] = useState(false)
  const rows = signalsOnly ? events.filter((event) => event.hasSignal) : events

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="wa-kicker">Evidence</p>
          <h2 className="wa-display mt-2 text-3xl">Ledger</h2>
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
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[860px] text-left">
            <caption className="sr-only">
              Ledger events with timestamps, counterparties, values, and transaction hashes
            </caption>
            <thead>
              <tr className="border-y border-line text-[10px] tracking-[0.16em] text-faint uppercase">
                <th scope="col" className="py-2.5 pr-4 font-medium">
                  Time
                </th>
                <th scope="col" className="py-2.5 pr-4 font-medium">
                  Type
                </th>
                <th scope="col" className="py-2.5 pr-4 font-medium">
                  From
                </th>
                <th scope="col" className="py-2.5 pr-4 font-medium">
                  To
                </th>
                <th scope="col" className="py-2.5 pr-4 font-medium">
                  Value
                </th>
                <th scope="col" className="py-2.5 pr-4 font-medium">
                  Hash
                </th>
                <th scope="col" className="py-2.5 font-medium">
                  Signal
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((event) => {
                const open = openId === event.id
                const stamp = event.at
                  ? formatDateTime(event.at)
                  : event.blockNum
                    ? `Block ${event.blockNum}`
                    : 'Time unknown'
                return (
                  <Fragment key={event.id}>
                    <tr className="wa-row border-b border-line">
                      <td className="py-2.5 pr-4 align-top whitespace-nowrap">
                        <button
                          type="button"
                          className="text-left text-[12px] text-quiet transition hover:text-ink"
                          aria-expanded={open}
                          onClick={() => setOpenId(open ? null : event.id)}
                        >
                          {stamp}
                        </button>
                      </td>
                      <td className="py-2.5 pr-4 align-top text-[13px]">{event.typeLabel}</td>
                      <td className="py-2.5 pr-4 align-top">
                        <HexInspect value={event.from} href={addressExplorerUrl(chain, event.from)} chars={4} />
                      </td>
                      <td className="py-2.5 pr-4 align-top">
                        <HexInspect value={event.to} href={addressExplorerUrl(chain, event.to)} chars={4} />
                      </td>
                      <td className="py-2.5 pr-4 align-top text-[12px] text-quiet tabular-nums">
                        {event.token
                          ? formatTokenValue(event.value, event.token)
                          : event.value != null
                            ? formatTokenValue(event.value)
                            : '—'}
                      </td>
                      <td className="py-2.5 pr-4 align-top">
                        {event.hash ? (
                          <HexInspect value={event.hash} href={event.explorerUrl} chars={6} />
                        ) : (
                          <span className="text-quiet">—</span>
                        )}
                      </td>
                      <td className="py-2.5 align-top">
                        {event.hasSignal ? <SeverityMark severity={toneFor(event.severity)} /> : (
                          <span className="text-[12px] text-faint">—</span>
                        )}
                      </td>
                    </tr>
                    {open ? (
                      <tr className="border-b border-line bg-inset/35">
                        <td colSpan={7} className="px-3 py-4">
                          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <Fact label="Time" value={stamp} />
                            <Fact label="Transaction type" value={event.typeLabel} />
                            <Fact label="Token" value={event.token || (event.tokenAddress ? event.tokenAddress : '—')} />
                            <Fact label="Status" value={event.status || '—'} />
                            <div>
                              <dt className="wa-kicker">From</dt>
                              <dd className="mt-1">
                                <HexInspect value={event.from} href={addressExplorerUrl(chain, event.from)} copyable />
                              </dd>
                            </div>
                            <div>
                              <dt className="wa-kicker">To</dt>
                              <dd className="mt-1">
                                <HexInspect value={event.to} href={addressExplorerUrl(chain, event.to)} copyable />
                              </dd>
                            </div>
                            <div>
                              <dt className="wa-kicker">Contract</dt>
                              <dd className="mt-1">
                                <HexInspect value={event.contract} href={addressExplorerUrl(chain, event.contract)} copyable />
                              </dd>
                            </div>
                            <div>
                              <dt className="wa-kicker">Transaction hash</dt>
                              <dd className="mt-1">
                                {event.hash ? (
                                  <HexInspect value={event.hash} href={event.explorerUrl} chars={10} copyable />
                                ) : (
                                  <span className="text-quiet">—</span>
                                )}
                              </dd>
                            </div>
                          </dl>
                          {onInspect && (event.hash || event.id) ? (
                            <button
                              type="button"
                              className="mt-4 text-[12px] tracking-[0.14em] text-scan uppercase hover:text-accent"
                              onClick={() => onInspect(event.hash || event.id)}
                            >
                              Inspect before signing
                            </button>
                          ) : null}
                          {event.signals.map((signal) => (
                            <div key={signal.id} className="mt-5 border-t border-line pt-4">
                              <p className="wa-kicker">Security signal</p>
                              <p className="mt-1 text-sm">{signal.title}</p>
                              {signal.label ? (
                                <p className="mt-1 text-[11px] tracking-[0.12em] text-quiet uppercase">{signal.label}</p>
                              ) : null}
                              <p className="wa-kicker mt-4">Why it matters</p>
                              <p className="mt-1 text-[13px] text-quiet">{signal.why}</p>
                              {signal.evidence.length ? (
                                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                                  {signal.evidence.map((row) => (
                                    <div key={row.label}>
                                      <dt className="wa-kicker">{row.label === 'Transaction' ? 'Evidence' : row.label}</dt>
                                      <dd className="mt-1">
                                        <HexInspect
                                          value={row.value}
                                          href={
                                            String(row.value).startsWith('0x') && String(row.value).length >= 42
                                              ? addressExplorerUrl(chain, row.value)
                                              : String(row.value).startsWith('0x') && String(row.value).length > 16
                                                ? event.explorerUrl
                                                : undefined
                                          }
                                          chars={6}
                                        />
                                      </dd>
                                    </div>
                                  ))}
                                </dl>
                              ) : null}
                            </div>
                          ))}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
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
