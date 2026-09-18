import { MODEL_NAME } from './config.js'
import { primaryLabel } from './intelligence.js'

export function evidenceItem(label, value) {
  if (value == null || value === '') return null
  if (typeof value === 'boolean') return { label, value: value ? 'true' : 'false' }
  return { label, value: String(value) }
}

export function buildEvidence(items) {
  return items.filter(Boolean)
}

export function listingEvidence(listing) {
  if (!listing) return []
  return buildEvidence([
    evidenceItem('Label', primaryLabel(listing)),
    evidenceItem('Source', listing.source),
    evidenceItem('Note', listing.note),
  ])
}

export function buildOverallEvidence(signals, context) {
  const items = [
    evidenceItem('Model', MODEL_NAME),
    evidenceItem('Address', context.address),
    evidenceItem('Chain', context.chain),
    evidenceItem('Events analyzed', String(context.transactions.length)),
    evidenceItem('Signals', String(signals.length)),
  ]
  if (context.truncated) items.push(evidenceItem('Coverage', 'Fetched history was truncated'))
  const hashes = new Set()
  for (const signal of signals) {
    for (const hash of signal.affectedTransactions || []) hashes.add(hash)
  }
  if (hashes.size) items.push(evidenceItem('Affected transactions', String(hashes.size)))
  return buildEvidence(items)
}

export function scoreReason(signal, delta) {
  const confidencePct = Math.round((signal.confidence || 0) * 100)
  return `+${delta} from ${signal.title} (confidence ${confidencePct}%). ${signal.summary}`
}
