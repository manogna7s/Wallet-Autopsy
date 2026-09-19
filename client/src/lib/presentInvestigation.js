import { shorten } from '../data/mock'
import {
  buildForensicGraph,
  buildForensicSummary,
  buildRiskPath,
  buildTimeline,
} from './forensics'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function monthlyActivity(transactions) {
  const buckets = new Map()
  for (const row of transactions) {
    if (!row.timestamp) continue
    const date = new Date(row.timestamp)
    if (Number.isNaN(date.getTime())) continue
    const key = `${date.getUTCFullYear()}-${date.getUTCMonth()}`
    buckets.set(key, (buckets.get(key) || 0) + 1)
  }
  const sorted = [...buckets.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-6)
  return sorted.map(([key, txs]) => {
    const month = Number(key.split('-')[1])
    return { month: MONTHS[month], txs }
  })
}

function presentSignal(signal) {
  return {
    id: signal.id,
    type: signal.type,
    title: signal.title,
    severity: signal.severity || 'info',
    summary: signal.summary,
    confidence: signal.confidence,
    contribution: signal.contribution,
    label: signal.behaviorLabel,
    behaviorLabel: signal.behaviorLabel,
    spender: signal.spender,
    token: signal.token,
    tokenAddress: signal.tokenAddress,
    addresses: signal.addresses || [],
    allowance: signal.allowance,
    evidence: (signal.evidence || []).map((row) => ({
      label: row.label,
      value: String(row.value ?? ''),
    })),
    affectedTransactions: signal.affectedTransactions || [],
  }
}

function presentRisk(risk) {
  if (!risk) return null
  return {
    model: risk.model || 'Wallet Autopsy Risk Model',
    score: risk.score ?? 0,
    severity: risk.severity || 'low',
    severityLabel: risk.severityLabel,
    confidence: risk.confidence || null,
    signalCount: risk.signalCount ?? risk.signals?.length ?? 0,
    summary: risk.summary,
    scoreBreakdown: risk.scoreBreakdown || [],
    evidence: (risk.evidence || []).map((row) => ({
      label: row.label,
      value: String(row.value ?? ''),
    })),
    signals: (risk.signals || []).map(presentSignal),
  }
}

function compactLedger(transactions) {
  return transactions.map((row) => ({
    hash: row.hash,
    timestamp: row.timestamp,
    from: row.from,
    to: row.to,
    value: row.value,
    token: row.token,
    tokenAddress: row.tokenAddress,
    transactionType: row.transactionType,
    contractInteraction: row.contractInteraction,
    method: row.method,
    status: row.status,
    unlimited: row.unlimited,
    spender: row.spender,
    uniqueId: row.uniqueId,
  }))
}

function inspectableRows(transactions, signals) {
  const hashes = new Set(
    (signals || []).flatMap((signal) => signal.affectedTransactions || []).map((hash) => String(hash).toLowerCase()),
  )
  const ranked = transactions.map((row, index) => {
    let rank = 0
    if (row.transactionType === 'approval' && row.unlimited) rank += 120
    else if (row.transactionType === 'approval' || row.method === 'approve') rank += 90
    if (row.hash && hashes.has(String(row.hash).toLowerCase())) rank += 40
    return { row, index, rank }
  })
  ranked.sort(
    (a, b) => b.rank - a.rank || String(b.row.timestamp || '').localeCompare(String(a.row.timestamp || '')),
  )
  const picked = []
  const seen = new Set()
  for (const item of ranked) {
    const key = item.row.hash || item.row.uniqueId || `i-${item.index}`
    if (seen.has(key)) continue
    seen.add(key)
    picked.push(item.row)
    if (picked.length >= 12) break
  }
  return picked
}

function presentAi(ai) {
  if (!ai) return null
  return {
    source: ai.source,
    fallbackReason: ai.fallbackReason || null,
    generatedFrom: ai.generatedFrom || 'verified on-chain findings',
    explainer: ai.explainer,
    summary: ai.summary,
    keyFindings: ai.keyFindings || ai.findings || [],
    findings: ai.findings || ai.keyFindings || [],
    evidenceExplanation: ai.evidenceExplanation || [],
    whyItMatters: ai.whyItMatters || [],
    potentialExposure: ai.potentialExposure || [],
    whatToCheck: ai.whatToCheck || [],
    uncertainty: ai.uncertainty || '',
  }
}

export function presentInvestigation(payload) {
  const subject = payload.address
  const chain = payload.chain
  const transactions = payload.transactions || []
  const risk = presentRisk(payload.risk)
  const signals = risk?.signals || []
  const graph = buildForensicGraph({ subject, chain, transactions, signals })
  const timeline = buildTimeline({ chain, transactions, signals })
  const riskPath = buildRiskPath({ subject, signals, graph })
  const forensic = buildForensicSummary(signals, graph)

  const ledger = compactLedger(transactions)
  const inspectable = inspectableRows(ledger, signals)

  return {
    id: payload.id,
    persisted: Boolean(payload.persisted || payload.id),
    source: payload.source || 'live',
    investigatedAt: payload.investigatedAt,
    ai: presentAi(payload.ai),
    address: payload.address,
    network: payload.chain,
    networkLabel: payload.chainLabel || 'Ethereum',
    status: payload.activity?.empty ? 'empty' : 'complete',
    statusLabel: payload.activity?.empty ? 'No activity found' : 'Investigation complete',
    firstSeen: payload.activity?.firstSeen,
    lastActive: payload.activity?.lastActive,
    interactionCount: payload.activity?.counts?.transactions ?? 0,
    contractsInteracted: payload.activity?.counts?.contracts ?? 0,
    counterparties: payload.activity?.counts?.counterparties ?? 0,
    tokenTransfers: payload.activity?.counts?.tokenTransfers ?? 0,
    approvalCount: payload.activity?.counts?.approvals ?? 0,
    activity: monthlyActivity(transactions),
    timeline,
    graph,
    riskPath,
    forensic,
    signals,
    risk,
    ledger,
    inspectable,
    defaultInspectHash: inspectable[0]?.hash || inspectable[0]?.uniqueId || null,
    empty: Boolean(payload.activity?.empty),
    notices: payload.notices || [],
    truncated: Boolean(payload.truncated),
    cached: Boolean(payload.cached),
    provider: payload.provider,
    eventCount: transactions.length,
    displayAddress: shorten(payload.address, 6),
  }
}
