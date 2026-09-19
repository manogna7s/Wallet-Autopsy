import { normalizeAddress } from '../../utils/address.js'
import { analyzeRisk } from '../risk/analyzeRisk.js'
import { counterpartiesOf, isApprovalEvent, isUnlimitedAmount } from '../risk/helpers.js'

const MAX_HISTORY = 6
const MAX_RELATIONSHIPS = 6

function sameHash(a, b) {
  if (!a || !b) return false
  return String(a).toLowerCase() === String(b).toLowerCase()
}

function findSelected(transaction, transactions) {
  if (!transaction) return null
  if (typeof transaction === 'object') {
    if (transaction.hash) {
      const match = transactions.find((row) => sameHash(row.hash, transaction.hash))
      if (match) return { ...match, ...transaction }
    }
    if (transaction.uniqueId) {
      const match = transactions.find((row) => row.uniqueId && row.uniqueId === transaction.uniqueId)
      if (match) return { ...match, ...transaction }
    }
    if (transaction.from || transaction.to) return transaction
    return null
  }
  if (typeof transaction === 'string') {
    return (
      transactions.find((row) => sameHash(row.hash, transaction) || row.uniqueId === transaction) || null
    )
  }
  return null
}

function actionLabel(row) {
  if (isApprovalEvent(row)) return 'Approve'
  if (row.transactionType === 'token_transfer') return 'Transfer'
  if (row.transactionType === 'nft_transfer') return 'NFT transfer'
  if (row.transactionType === 'contract_interaction' || row.contractInteraction) return 'Contract call'
  return 'Transfer'
}

function allowanceLabel(row) {
  if (!isApprovalEvent(row)) return '—'
  if (isUnlimitedAmount(row)) return 'Unlimited'
  if (row.value != null && row.value !== '') return String(row.value)
  return 'Finite'
}

function contractAddress(row) {
  if (isApprovalEvent(row)) return row.tokenAddress || row.to
  if (row.tokenAddress) return row.tokenAddress
  if (row.contractInteraction || row.transactionType === 'contract_interaction') return row.to
  return row.to
}

function warningFor(signal) {
  switch (signal.type) {
    case 'unlimited_token_approval':
      return 'Unlimited token allowance'
    case 'permission_exposure_risk':
      return 'Multiple spenders already have token permission'
    case 'flagged_counterparty':
      return signal.spender
        ? 'Spender has suspicious historical interactions'
        : 'Address has historical interaction with a listed counterparty'
    case 'repeated_risky_interaction':
      return 'Address has repeated interaction with flagged counterparties'
    case 'relationship_risk':
      return 'Detected relationship with a listed address'
    case 'unusual_transaction_pattern':
      return 'Behavioral anomaly in the fetched window'
    case 'suspicious_contract_interaction':
      return 'Unverified / insufficient information'
    default:
      return signal.title
  }
}

function peersOf(row, subject) {
  return counterpartiesOf(row, subject)
}

function signalTouches(signal, row, peers) {
  const hashes = signal.affectedTransactions || []
  if (row.hash && hashes.some((hash) => sameHash(hash, row.hash))) return true
  const addresses = [
    ...(signal.addresses || []),
    signal.spender,
    signal.tokenAddress,
  ]
    .filter(Boolean)
    .map((value) => normalizeAddress(value))
  return peers.some((peer) => addresses.includes(peer))
}

function permissionFor(row, subject) {
  const peers = peersOf(row, subject)
  const other =
    (row.to && normalizeAddress(row.to) !== subject ? row.to : null) ||
    (row.from && normalizeAddress(row.from) !== subject ? row.from : null) ||
    peers[0] ||
    null
  if (isApprovalEvent(row)) {
    return {
      granted: isUnlimitedAmount(row)
        ? 'Unlimited token allowance'
        : 'Token allowance (finite)',
      recipient: row.spender || other,
      recipientRole: 'Spender',
      asset: row.token || 'Token',
      assetAddress: row.tokenAddress || null,
    }
  }
  if (row.transactionType === 'token_transfer' || row.transactionType === 'nft_transfer' || row.transactionType === 'transfer') {
    return {
      granted: 'No new allowance in this event — value movement only',
      recipient: other,
      recipientRole: 'Counterparty',
      asset: row.token || 'ETH',
      assetAddress: row.tokenAddress || null,
    }
  }
  if (row.transactionType === 'contract_interaction' || row.contractInteraction) {
    return {
      granted: 'Contract call — bytecode is not simulated',
      recipient: other,
      recipientRole: 'Contract',
      asset: row.token || 'ETH',
      assetAddress: row.tokenAddress || row.to || null,
    }
  }
  return {
    granted: 'No new allowance in this event — value movement only',
    recipient: other,
    recipientRole: 'Recipient',
    asset: row.token || 'ETH',
    assetAddress: row.tokenAddress || null,
  }
}

function relatedHistory(row, transactions, subject) {
  const peers = new Set(peersOf(row, subject))
  return transactions
    .filter((item) => {
      if (item === row) return false
      if (row.hash && sameHash(item.hash, row.hash)) return false
      return peersOf(item, subject).some((peer) => peers.has(peer))
    })
    .sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')))
    .slice(0, MAX_HISTORY)
    .map((item) => ({
      hash: item.hash,
      type: actionLabel(item),
      from: item.from,
      to: item.to,
      token: item.token,
      value: item.value,
      timestamp: item.timestamp,
      spender: item.spender,
    }))
}

function relationships(row, transactions, subject, signals) {
  const counts = new Map()
  for (const item of transactions) {
    for (const peer of peersOf(item, subject)) {
      counts.set(peer, (counts.get(peer) || 0) + 1)
    }
  }
  const flagged = new Set()
  for (const signal of signals) {
    for (const address of [...(signal.addresses || []), signal.spender].filter(Boolean)) {
      flagged.add(normalizeAddress(address))
    }
  }
  return peersOf(row, subject)
    .map((address) => ({
      address,
      role:
        row.spender && normalizeAddress(row.spender) === address
          ? 'Spender'
          : row.to && normalizeAddress(row.to) === address
            ? 'To'
            : 'Counterparty',
      interactionCount: counts.get(address) || 1,
      listed: flagged.has(address),
    }))
    .slice(0, MAX_RELATIONSHIPS)
}

export function pickDefaultTransaction(transactions = [], signals = []) {
  const list = Array.isArray(transactions) ? transactions : []
  const unlimited = list.find((row) => isApprovalEvent(row) && isUnlimitedAmount(row))
  if (unlimited) return unlimited
  const approval = list.find((row) => isApprovalEvent(row))
  if (approval) return approval
  const hashes = new Set(
    (signals || []).flatMap((signal) => signal.affectedTransactions || []).map((hash) => String(hash).toLowerCase()),
  )
  const linked = list.find((row) => row.hash && hashes.has(String(row.hash).toLowerCase()))
  if (linked) return linked
  return [...list].sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')))[0] || null
}

export function previewTransaction({ address, chain, transaction, transactions = [] } = {}) {
  const subject = normalizeAddress(address)
  const pool = Array.isArray(transactions) && transactions.length ? transactions : transaction ? [transaction] : []
  const selected = findSelected(transaction, pool) || pickDefaultTransaction(pool)
  if (!selected) return null

  const analysis = analyzeRisk({
    address: subject,
    chain: chain || 'ethereum',
    transactions: pool,
  })
  const peers = peersOf(selected, subject)
  const relatedSignals = (analysis.signals || []).filter((signal) => signalTouches(signal, selected, peers))
  const contribution = relatedSignals.reduce((sum, signal) => sum + (Number(signal.contribution) || 0), 0)

  return {
    simulation: true,
    signing: false,
    caption: 'Review this transaction carefully.',
    address: subject,
    chain: chain || 'ethereum',
    transaction: {
      hash: selected.hash,
      from: selected.from,
      to: selected.to,
      contract: contractAddress(selected),
      token: selected.token || (isApprovalEvent(selected) ? 'Token' : 'ETH'),
      tokenAddress: selected.tokenAddress,
      action: actionLabel(selected),
      allowance: allowanceLabel(selected),
      value: selected.value,
      timestamp: selected.timestamp,
      status: selected.status,
    },
    permission: permissionFor(selected, subject),
    signals: relatedSignals.map((signal) => ({
      id: signal.id,
      type: signal.type,
      title: signal.title,
      warning: warningFor(signal),
      severity: signal.severity,
      summary: signal.summary,
      contribution: signal.contribution,
      evidence: signal.evidence || [],
      affectedTransactions: signal.affectedTransactions || [],
      spender: signal.spender,
      token: signal.token,
      addresses: signal.addresses || [],
    })),
    relatedHistory: relatedHistory(selected, pool, subject),
    relationships: relationships(selected, pool, subject, relatedSignals),
    riskImpact: {
      walletScore: analysis.score,
      walletSeverity: analysis.severity,
      walletSeverityLabel: analysis.severityLabel,
      relatedContribution: contribution,
      signalCount: relatedSignals.length,
      confidence: analysis.confidence,
      note:
        relatedSignals.length > 0
          ? `This interaction is linked to ${relatedSignals.length} engine signal${relatedSignals.length === 1 ? '' : 's'} contributing +${contribution} of the wallet score.`
          : 'No engine signals are linked to this interaction in the fetched window.',
    },
  }
}

export function buildSigningFallback(preview) {
  const tx = preview.transaction || {}
  const permission = preview.permission || {}
  const warnings = (preview.signals || []).map((signal) => signal.warning || signal.title)
  const evidence = []
  if (tx.hash) evidence.push(`Transaction ${tx.hash}`)
  if (permission.recipient) evidence.push(`${permission.recipientRole || 'Counterparty'} ${permission.recipient}`)
  if (permission.asset) evidence.push(`Asset ${permission.asset}${permission.assetAddress ? ` · ${permission.assetAddress}` : ''}`)
  if (tx.allowance && tx.allowance !== '—') evidence.push(`Allowance ${tx.allowance}`)
  for (const signal of preview.signals || []) {
    for (const row of (signal.evidence || []).slice(0, 2)) {
      evidence.push(`${row.label}: ${row.value}`)
    }
  }

  const why = (preview.signals || []).map((signal) => signal.summary).filter(Boolean)
  if (!why.length) {
    why.push('The engine did not attach a security signal to this interaction. That is not a guarantee of safety.')
  }

  const checks = [
    permission.recipient
      ? `Confirm ${permission.recipientRole || 'the counterparty'} ${permission.recipient} is the intended destination.`
      : 'Confirm the destination address on a block explorer.',
  ]
  if (tx.action === 'Approve') {
    checks.push(`Check the current ${permission.asset || 'token'} allowance and whether an unlimited grant was intended.`)
  }
  if (tx.hash) checks.push(`Open ${tx.hash} on a block explorer and compare it with this preview.`)
  checks.push('This is a read-only inspection. No wallet is connected and nothing is broadcast.')

  return {
    summary: `This ${String(tx.action || 'transaction').toLowerCase()} involves ${permission.asset || 'an asset'}. ${permission.granted ? `${String(permission.granted).replace(/\.$/, '')}.` : ''} ${preview.caption}`.replace(/\s+/g, ' ').trim(),
    keyFindings: warnings.length ? warnings : [`${tx.action || 'Transaction'} to ${permission.recipient || tx.to || 'a counterparty'}`],
    evidenceExplanation: [...new Set(evidence)].slice(0, 8),
    whyItMatters: why.slice(0, 6),
    potentialExposure: (preview.signals || []).length
      ? [
          permission.granted,
          preview.riskImpact?.note,
        ].filter(Boolean)
      : ['No potential exposure was identified for this specific interaction in the fetched window.'],
    whatToCheck: [...new Set(checks)].slice(0, 5),
    uncertainty:
      'This preview does not broadcast a transaction and does not instruct you to approve or reject it. Contract behavior is not simulated, and the fetched window may be incomplete.',
  }
}
