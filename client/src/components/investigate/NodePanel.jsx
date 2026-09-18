import { formatDateTime, formatTokenValue, toneFor } from '../../lib/format'
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

export function ExplorerLink({ href, children }) {
  if (!href) return <span className="wa-mono text-[12px] text-quiet">{children}</span>
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="wa-mono text-[12px] text-scan hover:text-accent"
    >
      {children}
    </a>
  )
}

export function NodePanel({ node, chain, onClose }) {
  if (!node) return null
  const rel = node.relationships?.filter((item) => item !== 'origin').join(' · ') || 'origin'
  return (
    <aside className="absolute inset-y-0 right-0 z-20 flex w-[min(100%,300px)] flex-col overflow-y-auto border-l border-line bg-raised/95">
      <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <p className="wa-kicker">{SHORT_TYPE[node.type] || node.typeLabel}</p>
          <p className="mt-1 text-sm">{node.display || node.label}</p>
        </div>
        <button type="button" className="text-[12px] text-quiet hover:text-ink" onClick={onClose}>
          Close
        </button>
      </div>
      <dl className="space-y-3 px-4 py-4">
        <Row label="Address">
          <ExplorerLink href={node.explorerUrl}>{shorten(node.address, 6)}</ExplorerLink>
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
                <ExplorerLink href={txExplorerUrl(chain, hash)}>{shorten(hash, 8)}</ExplorerLink>
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
