import { cn, formatDateTime, formatTokenValue, toneFor } from '../../lib/format'
import { txExplorerUrl } from '../../lib/explorer'
import { shorten } from '../../data/mock'
import { SeverityMark } from '../ui/Badge'

const SHORT_TYPE = {
  wallet: 'You',
  counterparty: 'Wallet',
  contract: 'Contract',
  token: 'Token',
  flagged: 'Listed',
}

export function ExplorerLink({ href, children, title, label, className }) {
  const classes = cn('wa-mono text-[12px] text-scan transition hover:text-accent', className)
  if (!href) {
    return (
      <span className={cn('wa-mono text-[12px] text-quiet', className)} title={title}>
        {children}
      </span>
    )
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title={title}
      aria-label={label || (title ? `Open ${title} on a block explorer` : undefined)}
      className={classes}
    >
      {children}
    </a>
  )
}

export function HexInspect({ value, href, chars = 6, className, copyable = false }) {
  if (!value) return <span className="text-quiet">—</span>
  const text = String(value)
  const hex = text.startsWith('0x') && text.length > 12

  function copy(event) {
    event.preventDefault()
    event.stopPropagation()
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {})
    }
  }

  return (
    <span className="group/hex inline-flex max-w-full items-center gap-1.5">
      <ExplorerLink href={href} title={text} className={className}>
        {hex ? shorten(text, chars) : text}
      </ExplorerLink>
      {copyable ? (
        <button
          type="button"
          onClick={copy}
          className="shrink-0 text-[10px] tracking-[0.14em] text-faint uppercase opacity-0 transition hover:text-ink group-hover/hex:opacity-100 focus-visible:opacity-100"
          aria-label={`Copy ${text}`}
        >
          Copy
        </button>
      ) : null}
    </span>
  )
}

export function NodePanel({ node, chain, onClose }) {
  if (!node) return null
  const rel = node.relationships?.filter((item) => item !== 'origin').join(' · ') || 'origin'
  return (
    <aside
      className="absolute inset-x-0 bottom-0 z-20 flex max-h-[58%] w-full flex-col overflow-y-auto border-t border-line bg-raised/95 md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-[min(100%,300px)] md:border-l md:border-t-0"
      aria-label="Selected node"
    >
      <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <p className="wa-kicker">{SHORT_TYPE[node.type] || node.typeLabel}</p>
          <p className="mt-1 text-sm">{node.display || node.label}</p>
        </div>
        <button type="button" className="text-[12px] text-quiet hover:text-ink" onClick={onClose} aria-label="Close node details">
          Close
        </button>
      </div>
      <dl className="space-y-3 px-4 py-4">
        <Row label="Address">
          <HexInspect value={node.address} href={node.explorerUrl} chars={6} copyable />
        </Row>
        <Row label="Link">{rel}</Row>
        <Row label="Events">{node.interactionCount ?? '—'}</Row>
        {node.firstInteraction ? <Row label="First">{formatDateTime(node.firstInteraction)}</Row> : null}
        {node.lastInteraction ? <Row label="Latest">{formatDateTime(node.lastInteraction)}</Row> : null}
        <Row label="Flag">{node.riskLabel || '—'}</Row>
      </dl>
      <div className="border-t border-line px-4 py-4">
        <p className="wa-kicker">Signals</p>
        {node.relatedSignalObjects?.length ? (
          <ul className="mt-3 space-y-2">
            {node.relatedSignalObjects.map((signal) => (
              <li key={signal.id} className="flex items-center gap-2 text-[13px]">
                <SeverityMark severity={toneFor(signal.severity)} />
                <span>{signal.title}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[12px] text-quiet">None</p>
        )}
      </div>
      <div className="border-t border-line px-4 py-4">
        <p className="wa-kicker">Tx</p>
        {node.evidenceTransactions?.length ? (
          <ul className="mt-2 space-y-1">
            {node.evidenceTransactions.map((hash) => (
              <li key={hash}>
                <HexInspect value={hash} href={txExplorerUrl(chain, hash)} chars={8} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[12px] text-quiet">None</p>
        )}
      </div>
    </aside>
  )
}

function Row({ label, children }) {
  return (
    <div>
      <dt className="wa-kicker">{label}</dt>
      <dd className="mt-1 text-[13px] text-quiet">{children}</dd>
    </div>
  )
}

export function ValueLine({ value, token }) {
  return formatTokenValue(value, token)
}
