import { DataBadge, SeverityMark } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Skeleton } from '../ui/Skeleton'
import { AiInvestigation } from './AiInvestigation'
import { ExplorerLink } from './NodePanel'
import { useSigningPreview } from '../../hooks/useSigningPreview'
import { addressExplorerUrl, txExplorerUrl } from '../../lib/explorer'
import { cn, formatDateTime, formatTokenValue, toneFor } from '../../lib/format'
import { shorten } from '../../data/mock'

export function SigningSafety({ address, chain, ledger, inspectable = [], selectedHash, onSelect }) {
  const { preview, status, error, report, explainStatus, explainError, explain } = useSigningPreview({
    address,
    chain,
    ledger,
    selectedHash,
  })

  if (!ledger?.length) return null

  return (
    <section>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="wa-kicker">Before you sign</p>
          <h2 className="wa-display mt-2 text-4xl md:text-5xl">Transaction checkpoint</h2>
          <p className="mt-4 max-w-xl text-sm text-quiet">
            Read-only inspection of an interaction already on this wallet. No wallet is connected, nothing is
            broadcast, and keys are never requested.
          </p>
        </div>
        <DataBadge>Simulation · not a signer</DataBadge>
      </div>

      {inspectable.length > 1 ? (
        <div className="mb-8 flex flex-wrap gap-2">
          {inspectable.map((row) => {
            const key = row.hash || row.uniqueId
            const active = selectedHash && (row.hash === selectedHash || row.uniqueId === selectedHash)
            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelect?.(row.hash || row.uniqueId)}
                className={cn(
                  'border px-3 py-2 text-left text-[12px] transition',
                  active ? 'border-scan/60 bg-inset text-ink' : 'border-line text-quiet hover:border-scan/40 hover:text-ink',
                )}
                aria-pressed={active}
              >
                <span className="block tracking-[0.12em] uppercase">
                  {row.transactionType === 'approval' ? 'Approve' : row.transactionType?.replace('_', ' ') || 'Event'}
                </span>
                <span className="wa-mono mt-1 block text-[11px]">
                  {row.token || 'ETH'}
                  {row.hash ? ` · ${shorten(row.hash, 4)}` : ''}
                </span>
              </button>
            )
          })}
        </div>
      ) : null}

      {status === 'loading' ? <CheckpointSkeleton /> : null}
      {status === 'error' ? (
        <p className="border-y border-line py-8 text-sm text-quiet">
          {error?.status === 429
            ? 'Provider rate limit reached. Try again shortly.'
            : 'Unable to retrieve this transaction preview. Deterministic findings above are still available.'}
        </p>
      ) : null}
      {status === 'ready' && preview ? (
        <Checkpoint
          preview={preview}
          chain={chain}
          explain={explain}
          explainStatus={explainStatus}
          explainError={explainError}
          report={report}
        />
      ) : null}
    </section>
  )
}

function Checkpoint({ preview, chain, explain, explainStatus, explainError, report }) {
  const tx = preview.transaction || {}
  const permission = preview.permission || {}
  const impact = preview.riskImpact || {}

  return (
    <div className={cn('border-y border-line', (preview.signals || []).length ? 'wa-glow-risk' : 'wa-glow')}>
      <Stage kicker="01" title="Transaction">
        <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Fact label="From" value={tx.from} explorer={addressExplorerUrl(chain, tx.from)} />
          <Fact label="To" value={tx.to} explorer={addressExplorerUrl(chain, tx.to)} />
          <Fact label="Contract" value={tx.contract} explorer={addressExplorerUrl(chain, tx.contract)} />
          <Fact label="Token" value={tx.token || '—'} />
          <Fact label="Action" value={tx.action || '—'} />
          <Fact label="Allowance" value={tx.allowance || '—'} accent={tx.allowance === 'Unlimited'} />
        </dl>
        {tx.hash ? (
          <p className="mt-6">
            <span className="wa-kicker mr-2">Hash</span>
            <ExplorerLink href={txExplorerUrl(chain, tx.hash)}>{shorten(tx.hash, 10)}</ExplorerLink>
          </p>
        ) : null}
      </Stage>

      <Arrow />

      <Stage kicker="02" title="Permission">
        <dl className="grid gap-6 sm:grid-cols-3">
          <CopyBlock label="Permission being granted" value={permission.granted || '—'} />
          <CopyBlock
            label="Who receives the permission"
            value={
              permission.recipient
                ? `${permission.recipientRole || 'Counterparty'} · ${shorten(permission.recipient, 6)}`
                : '—'
            }
            mono
            title={permission.recipient}
            href={addressExplorerUrl(chain, permission.recipient)}
          />
          <CopyBlock
            label="What asset is affected"
            value={
              permission.assetAddress
                ? `${permission.asset} · ${shorten(permission.assetAddress, 4)}`
                : permission.asset || '—'
            }
            title={permission.assetAddress}
          />
        </dl>
      </Stage>

      <Arrow />

      <Stage kicker="03" title="Security signals">
            {(preview.signals || []).length ? (
          <ul className="space-y-4">
            {preview.signals.map((signal) => (
              <li key={signal.id || signal.type} className="flex items-start gap-3">
                <div>
                  <p className="text-sm">{signal.warning || signal.title}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <SeverityMark severity={toneFor(signal.severity)} />
                    {signal.contribution ? (
                      <span className="wa-mono text-[11px] text-quiet">+{signal.contribution}</span>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-quiet">No engine signals are linked to this interaction in the fetched window.</p>
        )}
      </Stage>

      <Arrow />

      <Stage kicker="04" title="Related history">
        {(preview.relatedHistory || []).length ? (
          <ul className="space-y-3">
            {preview.relatedHistory.map((row) => (
              <li key={row.hash || `${row.timestamp}-${row.to}`} className="flex flex-wrap items-baseline justify-between gap-3 text-[13px]">
                <span>
                  {row.type}
                  {row.token ? ` · ${formatTokenValue(row.value, row.token)}` : ''}
                </span>
                <span className="text-quiet">
                  {row.timestamp ? formatDateTime(row.timestamp) : ''}
                  {row.hash ? (
                    <>
                      {' · '}
                      <ExplorerLink href={txExplorerUrl(chain, row.hash)}>{shorten(row.hash, 4)}</ExplorerLink>
                    </>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-quiet">No other events in this window share the same counterparties.</p>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <div>
            <p className="wa-kicker">Counterparty relationships</p>
            {(preview.relationships || []).length ? (
              <ul className="mt-3 space-y-3">
                {preview.relationships.map((row) => (
                  <li key={row.address} className="flex flex-wrap items-center justify-between gap-3 text-[13px]">
                    <span>
                      <span className="text-quiet">{row.role}</span>{' '}
                      <ExplorerLink href={addressExplorerUrl(chain, row.address)}>{shorten(row.address, 6)}</ExplorerLink>
                    </span>
                    <span className="text-quiet">
                      {row.interactionCount} event{row.interactionCount === 1 ? '' : 's'}
                      {row.listed ? ' · listed' : ''}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-quiet">No counterparties on this event.</p>
            )}
          </div>
          <div>
            <p className="wa-kicker">Risk impact</p>
            <p className="mt-3 text-sm text-quiet">{impact.note}</p>
            <p className="mt-3 wa-mono text-[12px] text-faint">
              Wallet score {impact.walletScore ?? '—'} · related +{impact.relatedContribution ?? 0}
            </p>
          </div>
        </div>
      </Stage>

      <Arrow />

      <Stage kicker="05" title="AI explanation">
        <p className="text-[15px] text-ink">{preview.caption}</p>
        {explainStatus !== 'ready' ? (
          <div className="mt-6">
            <Button onClick={explain} disabled={explainStatus === 'loading'}>
              {explainStatus === 'loading' ? 'Investigating…' : 'Investigate Before Signing'}
            </Button>
            <p className="mt-3 text-[12px] text-faint">Opens an engine-bound explanation. This does not sign.</p>
          </div>
        ) : null}
        {explainStatus === 'error' ? (
          <p className="mt-4 text-sm text-quiet">
            AI explanation unavailable. Deterministic findings are still available.
          </p>
        ) : null}
        {explainStatus === 'loading' || explainStatus === 'ready' ? (
          <div className="mt-10">
            <AiInvestigation
              mode="signing"
              status={explainStatus === 'loading' ? 'loading' : 'ready'}
              report={report}
              error={explainError}
            />
          </div>
        ) : null}
      </Stage>
    </div>
  )
}

function Stage({ kicker, title, children }) {
  return (
    <div className="px-5 py-10 md:px-8">
      <p className="wa-kicker">{kicker}</p>
      <h3 className="wa-display mt-2 text-3xl">{title}</h3>
      <div className="mt-8">{children}</div>
    </div>
  )
}

function Arrow() {
  return (
    <div className="flex items-center gap-4 px-5 md:px-8" aria-hidden="true">
      <span className="h-px flex-1 bg-line" />
      <span className="text-[11px] tracking-[0.24em] text-faint">↓</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  )
}

function Fact({ label, value, explorer, accent }) {
  const display = value && String(value).startsWith('0x') && String(value).length > 16 ? shorten(value, 6) : value || '—'
  return (
    <div>
      <dt className="wa-kicker">{label}</dt>
      <dd className={cn('wa-mono mt-2 text-sm', accent && 'text-high')}>
        {explorer ? <ExplorerLink href={explorer}>{display}</ExplorerLink> : display}
      </dd>
    </div>
  )
}

function CopyBlock({ label, value, mono, title, href }) {
  const inner = <span className={cn(mono && 'wa-mono')}>{value}</span>
  return (
    <div>
      <dt className="wa-kicker">{label}</dt>
      <dd className="mt-2 text-sm text-quiet" title={title}>
        {href ? <ExplorerLink href={href}>{inner}</ExplorerLink> : inner}
      </dd>
    </div>
  )
}

function CheckpointSkeleton() {
  return (
    <div className="border-y border-line py-10">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-6 h-24 w-full" />
      <Skeleton className="mt-4 h-24 w-full" />
    </div>
  )
}
