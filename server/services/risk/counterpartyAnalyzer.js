import { SIGNAL_WEIGHTS } from './config.js'
import { counterpartiesOf, roundConfidence, uniqueHashes } from './helpers.js'
import { getListing, isRiskyListing, primaryLabel } from './intelligence.js'
import { buildEvidence, evidenceItem, listingEvidence } from './evidenceBuilder.js'

function listingConfidence(listing) {
  if (primaryLabel(listing) === 'sanctioned' && listing.verified) return 0.9
  if (listing.source === 'local_demo_list') return 0.58
  return 0.62
}

export function collectListedInteractions({ address, transactions, extraListings }) {
  const byAddress = new Map()
  for (const row of transactions) {
    for (const other of counterpartiesOf(row, address)) {
      const listing = getListing(other, extraListings)
      if (!isRiskyListing(listing)) continue
      if (!byAddress.has(other)) byAddress.set(other, { listing, rows: [] })
      byAddress.get(other).rows.push(row)
    }
  }
  return byAddress
}

export function analyzeCounterparties(context) {
  const { address, extraListings } = context
  const spec = SIGNAL_WEIGHTS.flagged_counterparty
  const signals = []
  const grouped = collectListedInteractions(context)

  for (const [counterparty, { listing, rows }] of grouped) {
    const label = primaryLabel(listing)
    signals.push({
      id: `flagged_counterparty:${counterparty}`,
      type: 'flagged_counterparty',
      title: 'Flagged counterparty',
      severity: spec.severity,
      weight: spec.weight,
      confidence: roundConfidence(listingConfidence(listing) + (rows[0]?.hash ? 0.06 : 0)),
      summary: `Security signals detected: a direct counterparty carries a local ${label} label. This is not an accusation that the investigated wallet is a scam.`,
      addresses: [counterparty],
      evidence: buildEvidence([
        evidenceItem('Counterparty', counterparty),
        ...listingEvidence(listing),
        evidenceItem('Interactions', String(rows.length)),
        evidenceItem('Transaction', rows[0]?.hash),
        evidenceItem('Timestamp', rows[0]?.timestamp),
      ]),
      affectedTransactions: uniqueHashes(rows),
    })
  }

  const subjectListing = getListing(address, extraListings)
  if (isRiskyListing(subjectListing)) {
    signals.push({
      id: `flagged_counterparty:subject:${address}`,
      type: 'flagged_counterparty',
      title: 'Investigated address is listed',
      severity: spec.severity,
      weight: spec.weight,
      confidence: roundConfidence(listingConfidence(subjectListing)),
      summary:
        'Security signals detected: the investigated address itself appears on the local intelligence list. Treat this as a label match, not a proven scam.',
      addresses: [address],
      evidence: buildEvidence([
        evidenceItem('Address', address),
        ...listingEvidence(subjectListing),
      ]),
      affectedTransactions: uniqueHashes(context.transactions),
    })
  }

  return signals
}
