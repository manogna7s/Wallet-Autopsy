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

function buildPreview(transactions, signals) {
  const approval = signals.find((row) => row.type === 'unlimited_token_approval' || row.type === 'permission_exposure_risk')
  const row = transactions.find((item) => item.transactionType === 'approval')
  if (!approval && !row) return null
  return {
    action: 'approve',
    transaction: 'ERC-20 approve',
    token: row?.token || 'Unknown token',
    tokenAddress: row?.tokenAddress,
    spender: row?.spender || row?.to,
    spenderLabel: row?.spender || row?.to,
    allowance: row?.unlimited ? 'Unlimited' : row?.value || 'Finite',
    signals: [approval?.title || (row?.unlimited ? 'Unlimited allowance' : 'Token approval')].filter(Boolean),
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

  return {
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
    preview: buildPreview(transactions, signals),
    empty: Boolean(payload.activity?.empty),
    notices: payload.notices || [],
    truncated: Boolean(payload.truncated),
    cached: Boolean(payload.cached),
    provider: payload.provider,
    eventCount: transactions.length,
    displayAddress: shorten(payload.address, 6),
  }
}
