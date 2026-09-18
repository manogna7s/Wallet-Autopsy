import { BEHAVIOR, SIGNAL_WEIGHTS } from './config.js'
import {
  counterpartiesOf,
  eventTime,
  isContractEvent,
  roundConfidence,
  slidingWindowMax,
  uniqueHashes,
} from './helpers.js'
import { collectListedInteractions } from './counterpartyAnalyzer.js'
import { getListing, isRiskyListing } from './intelligence.js'
import { buildEvidence, evidenceItem, listingEvidence } from './evidenceBuilder.js'

function iso(ms) {
  return ms == null ? undefined : new Date(ms).toISOString()
}

export function analyzeBehavior(context) {
  const { address, transactions } = context
  const spec = SIGNAL_WEIGHTS.unusual_transaction_pattern
  const signals = []
  const timed = transactions
    .map((row, index) => ({ row, index, time: eventTime(row) }))
    .filter((item) => item.time != null)

  if (timed.length >= BEHAVIOR.highFrequencyCount) {
    const peak = slidingWindowMax(
      transactions.map(eventTime),
      BEHAVIOR.highFrequencyWindowMs,
    )
    if (peak.count >= BEHAVIOR.highFrequencyCount) {
      const rows = peak.indexes.map((index) => transactions[index]).filter(Boolean)
      signals.push({
        id: 'unusual_transaction_pattern:frequency',
        type: 'unusual_transaction_pattern',
        title: 'Unusually high transaction frequency',
        severity: spec.severity,
        weight: spec.weight,
        confidence: roundConfidence(0.52 + Math.min(0.2, (peak.count - BEHAVIOR.highFrequencyCount) * 0.02)),
        behaviorLabel: 'Behavioral anomaly',
        summary:
          'Behavioral anomaly: many events occurred inside a short time window. This is not classified as malicious activity.',
        evidence: buildEvidence([
          evidenceItem('Events in window', String(peak.count)),
          evidenceItem('Window start', iso(peak.start)),
          evidenceItem('Window end', iso(peak.end)),
          evidenceItem('Threshold', `${BEHAVIOR.highFrequencyCount} events / 1 hour`),
        ]),
        affectedTransactions: uniqueHashes(rows),
      })
    }
  }

  const byCounterparty = new Map()
  transactions.forEach((row, index) => {
    for (const other of counterpartiesOf(row, address)) {
      if (!byCounterparty.has(other)) byCounterparty.set(other, [])
      byCounterparty.get(other).push({ row, index, time: eventTime(row) })
    }
  })

  const shortRepeats = []
  for (const [counterparty, items] of byCounterparty) {
    const times = items.map((item) => item.time)
    const peak = slidingWindowMax(times, BEHAVIOR.shortRepeatWindowMs)
    if (peak.count < BEHAVIOR.shortRepeatCount) continue
    const rows = peak.indexes.map((index) => items[index]?.row).filter(Boolean)
    shortRepeats.push({ counterparty, peak, rows })
  }
  shortRepeats.sort((a, b) => b.peak.count - a.peak.count)

  for (const item of shortRepeats.slice(0, 2)) {
    signals.push({
      id: `unusual_transaction_pattern:short-repeat:${item.counterparty}`,
      type: 'unusual_transaction_pattern',
      title: 'Repeated interactions in a short period',
      severity: spec.severity,
      weight: spec.weight,
      confidence: roundConfidence(0.5 + (item.rows.every((row) => row.hash) ? 0.08 : 0)),
      behaviorLabel: 'Behavioral anomaly',
      summary:
        'Behavioral anomaly: the same counterparty appears repeatedly inside a short interval. This is not classified as malicious activity.',
      addresses: [item.counterparty],
      evidence: buildEvidence([
        evidenceItem('Counterparty', item.counterparty),
        evidenceItem('Events in window', String(item.peak.count)),
        evidenceItem('Window', '10 minutes'),
        evidenceItem('Transaction', item.rows[0]?.hash),
      ]),
      affectedTransactions: uniqueHashes(item.rows),
    })
  }

  const contractTimes = transactions.map((row) => (isContractEvent(row) ? eventTime(row) : null))
  if (contractTimes.filter((time) => time != null).length >= BEHAVIOR.contractBurstUnique) {
    const peak = slidingWindowMax(contractTimes, BEHAVIOR.contractBurstWindowMs)
    const rows = peak.indexes.map((index) => transactions[index]).filter(isContractEvent)
    const uniqueContracts = new Set(rows.map((row) => row.to).filter(Boolean))
    if (uniqueContracts.size >= BEHAVIOR.contractBurstUnique) {
      signals.push({
        id: 'unusual_transaction_pattern:contract-burst',
        type: 'unusual_transaction_pattern',
        title: 'Unusual contract interaction burst',
        severity: spec.severity,
        weight: spec.weight,
        confidence: roundConfidence(0.46 + Math.min(0.16, uniqueContracts.size * 0.02)),
        behaviorLabel: 'Behavioral anomaly',
        summary:
          'Behavioral anomaly: many distinct contracts were touched in a short window. This is not classified as malicious activity.',
        evidence: buildEvidence([
          evidenceItem('Unique contracts in window', String(uniqueContracts.size)),
          evidenceItem('Window', '30 minutes'),
          evidenceItem('Events', String(rows.length)),
        ]),
        affectedTransactions: uniqueHashes(rows),
      })
    }
  }

  const listed = collectListedInteractions(context)
  const repeatSpec = SIGNAL_WEIGHTS.repeated_risky_interaction
  for (const [counterparty, { listing, rows }] of listed) {
    if (rows.length < BEHAVIOR.repeatedRiskyMin) continue
    signals.push({
      id: `repeated_risky_interaction:${counterparty}`,
      type: 'repeated_risky_interaction',
      title: 'Repeated risky interaction',
      severity: repeatSpec.severity,
      weight: repeatSpec.weight,
      confidence: roundConfidence(0.66 + (rows.length >= 4 ? 0.08 : 0)),
      summary:
        'Security signals detected: this address interacted more than once with a labeled counterparty.',
      addresses: [counterparty],
      evidence: buildEvidence([
        evidenceItem('Counterparty', counterparty),
        ...listingEvidence(listing),
        evidenceItem('Interactions', String(rows.length)),
      ]),
      affectedTransactions: uniqueHashes(rows),
    })
  }

  const relationSpec = SIGNAL_WEIGHTS.relationship_risk
  const related = [...listed.entries()]
  if (related.length) {
    const rows = related.flatMap(([, value]) => value.rows)
    const addresses = related.map(([counterparty]) => counterparty)
    const anyListedContract = related.some(([, value]) => {
      const listing = value.listing
      return listing.kind === 'contract' || getListing(listing.address) && isRiskyListing(listing)
    })
    signals.push({
      id: 'relationship_risk:direct',
      type: 'relationship_risk',
      title: 'Relationship risk',
      severity: relationSpec.severity,
      weight: relationSpec.weight,
      confidence: roundConfidence(0.6 + (anyListedContract ? 0.05 : 0)),
      summary:
        'Security signals detected: the investigated address has a direct on-chain relationship with a labeled address or contract.',
      addresses,
      evidence: buildEvidence([
        evidenceItem('Listed counterparties', String(addresses.length)),
        evidenceItem('Counterparty', addresses[0]),
        evidenceItem('Direct interactions', String(rows.length)),
      ]),
      affectedTransactions: uniqueHashes(rows),
    })
  }

  return signals
}
