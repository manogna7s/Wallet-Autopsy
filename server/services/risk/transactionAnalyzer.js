import { BEHAVIOR, SIGNAL_WEIGHTS } from './config.js'
import {
  counterpartiesOf,
  eventTime,
  isContractEvent,
  median,
  numericValue,
  roundConfidence,
  tokenKey,
  uniqueHashes,
} from './helpers.js'
import { buildEvidence, evidenceItem } from './evidenceBuilder.js'

function outboundTransfers(transactions, subject) {
  return transactions.filter((row) => {
    if (row.transactionType === 'approval') return false
    if (row.from !== subject) return false
    return numericValue(row.value) != null
  })
}

export function analyzeTransactions({ address, transactions }) {
  const signals = []
  const outbound = outboundTransfers(transactions, address)
  const groups = new Map()

  for (const row of outbound) {
    const key = tokenKey(row)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(row)
  }

  const candidates = []
  for (const [key, rows] of groups) {
    if (rows.length < BEHAVIOR.minSamplesForOutlier) continue
    const values = rows.map((row) => numericValue(row.value))
    const mid = median(values)
    if (mid == null || mid <= 0) continue
    const outliers = rows.filter((row) => numericValue(row.value) >= mid * BEHAVIOR.largeTransferMultiple)
    if (!outliers.length) continue
    const largest = outliers.reduce((best, row) =>
      numericValue(row.value) > numericValue(best.value) ? row : best,
    )
    candidates.push({ key, rows, outliers, largest, mid })
  }

  candidates.sort((a, b) => numericValue(b.largest.value) / b.mid - numericValue(a.largest.value) / a.mid)
  const selected = candidates.slice(0, 1)

  for (const item of selected) {
    const spec = SIGNAL_WEIGHTS.unusual_transaction_pattern
    const timestampCoverage = item.outliers.filter((row) => eventTime(row) != null).length / item.outliers.length
    signals.push({
      id: `unusual_transaction_pattern:large:${item.key}`,
      type: 'unusual_transaction_pattern',
      title: 'Sudden large transfer',
      severity: spec.severity,
      weight: spec.weight,
      confidence: roundConfidence(0.42 + timestampCoverage * 0.2 + (item.rows.length >= 8 ? 0.08 : 0)),
      behaviorLabel: 'Behavioral anomaly',
      summary:
        'Behavioral anomaly: a transfer is much larger than the median of similar outbound activity. This is not classified as malicious activity.',
      evidence: buildEvidence([
        evidenceItem('Token', item.largest.token || (item.key === 'native' ? 'native' : item.key)),
        evidenceItem('Largest value', String(item.largest.value)),
        evidenceItem('Median outbound', String(item.mid)),
        evidenceItem('Multiple of median', String(BEHAVIOR.largeTransferMultiple)),
        evidenceItem('Samples', String(item.rows.length)),
        evidenceItem('Token groups compared', String(candidates.length)),
        evidenceItem('Counterparty', counterpartiesOf(item.largest, address)[0]),
        evidenceItem('Transaction', item.largest.hash),
        evidenceItem('Timestamp', item.largest.timestamp),
      ]),
      affectedTransactions: uniqueHashes(item.outliers),
    })
  }

  const failed = transactions.filter((row) => row.status === 'failed' || row.status === 'reverted')
  if (failed.length >= 3 && failed.some(isContractEvent)) {
    const spec = SIGNAL_WEIGHTS.unusual_transaction_pattern
    signals.push({
      id: 'unusual_transaction_pattern:failed-calls',
      type: 'unusual_transaction_pattern',
      title: 'Repeated failed contract calls',
      severity: spec.severity,
      weight: spec.weight,
      confidence: roundConfidence(0.48),
      behaviorLabel: 'Behavioral anomaly',
      summary:
        'Behavioral anomaly: several contract calls in the fetched set did not succeed. This is not classified as malicious activity.',
      evidence: buildEvidence([
        evidenceItem('Failed events', String(failed.length)),
        evidenceItem('Status values', [...new Set(failed.map((row) => row.status))].join(', ')),
      ]),
      affectedTransactions: uniqueHashes(failed),
    })
  }

  return signals
}
