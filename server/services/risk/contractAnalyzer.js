import { SIGNAL_WEIGHTS } from './config.js'
import { counterpartiesOf, isContractEvent, roundConfidence, uniqueHashes } from './helpers.js'
import { getListing, isRiskyListing, primaryLabel } from './intelligence.js'
import { buildEvidence, evidenceItem, listingEvidence } from './evidenceBuilder.js'

export function analyzeContracts({ address, transactions, extraListings }) {
  const contractRows = transactions.filter(
    (row) => isContractEvent(row) || (row.to && (row.contractInteraction || row.transactionType === 'contract_interaction')),
  )
  const listed = []
  const unknown = []

  for (const row of contractRows) {
    const targets = counterpartiesOf(row, address).filter(Boolean)
    const focus = row.to || targets[0]
    if (!focus) continue
    const listing = getListing(focus, extraListings)
    if (isRiskyListing(listing)) listed.push({ row, listing, focus })
    else unknown.push({ row, focus })
  }

  const signals = []

  if (listed.length) {
    const spec = SIGNAL_WEIGHTS.suspicious_contract_interaction
    const byContract = new Map()
    for (const item of listed) {
      if (!byContract.has(item.focus)) byContract.set(item.focus, [])
      byContract.get(item.focus).push(item)
    }
    for (const [contract, items] of byContract) {
      const listing = items[0].listing
      signals.push({
        id: `suspicious_contract_interaction:listed:${contract}`,
        type: 'suspicious_contract_interaction',
        title: 'Listed contract interaction',
        severity: 'medium',
        weight: spec.weight + 6,
        confidence: roundConfidence(listing.source === 'local_demo_list' ? 0.6 : 0.7),
        summary: `Security signals detected: interacted with a contract labeled ${primaryLabel(listing)} on the local intelligence list.`,
        addresses: [contract],
        evidence: buildEvidence([
          evidenceItem('Contract', contract),
          ...listingEvidence(listing),
          evidenceItem('Interactions', String(items.length)),
          evidenceItem('Transaction', items[0].row.hash),
        ]),
        affectedTransactions: uniqueHashes(items.map((item) => item.row)),
      })
    }
  }

  if (unknown.length && !listed.length) {
    const spec = SIGNAL_WEIGHTS.suspicious_contract_interaction
    const uniqueContracts = [...new Set(unknown.map((item) => item.focus))]
    signals.push({
      id: 'suspicious_contract_interaction:unverified',
      type: 'suspicious_contract_interaction',
      title: 'Unverified / insufficient information',
      severity: spec.severity,
      weight: 0,
      confidence: roundConfidence(0.34 + Math.min(0.12, uniqueContracts.length * 0.02)),
      summary:
        'Unverified / insufficient information: contract interactions were recorded, but no verified intelligence listing was found. Unknown is not the same as malicious.',
      addresses: uniqueContracts.slice(0, 8),
      evidence: buildEvidence([
        evidenceItem('Unique contracts', String(uniqueContracts.length)),
        evidenceItem('Contract', uniqueContracts[0]),
        evidenceItem('Transactions in set', String(unknown.length)),
        evidenceItem('Assessment', 'Insufficient information'),
      ]),
      affectedTransactions: uniqueHashes(unknown.map((item) => item.row)),
    })
  }

  return signals
}
