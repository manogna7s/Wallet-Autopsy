import { isAddress, normalizeAddress } from '../../utils/address.js'

const MAX_SIGNALS = 8
const MAX_TX = 12
const MAX_NODES = 12
const MAX_EDGES = 16
const MAX_EVIDENCE = 16
const HEX_RE = /0x[a-fA-F0-9]{4,}/g

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function clipText(value, max = 400) {
  const text = String(value ?? '').trim()
  if (!text) return ''
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

function collectHex(...values) {
  const set = new Set()
  for (const value of values) {
    if (value == null) continue
    if (typeof value === 'object') {
      collectHexFromUnknown(value, set)
      continue
    }
    const matches = String(value).match(HEX_RE) || []
    for (const match of matches) set.add(match.toLowerCase())
  }
  return set
}

function collectHexFromUnknown(value, set) {
  if (value == null) return
  if (typeof value !== 'object') {
    const matches = String(value).match(HEX_RE) || []
    for (const match of matches) set.add(match.toLowerCase())
    return
  }
  if (Array.isArray(value)) {
    for (const item of value) collectHexFromUnknown(item, set)
    return
  }
  for (const item of Object.values(value)) collectHexFromUnknown(item, set)
}

function compactEvidence(items) {
  return asArray(items)
    .slice(0, MAX_EVIDENCE)
    .map((row) => ({
      label: clipText(row?.label || 'Evidence', 80),
      value: clipText(row?.value ?? row, 240),
    }))
    .filter((row) => row.value)
}

function compactSignal(signal) {
  if (!signal || typeof signal !== 'object') return null
  return {
    id: clipText(signal.id, 120),
    type: clipText(signal.type, 80),
    title: clipText(signal.title || signal.type, 160),
    severity: clipText(signal.severity || 'info', 24),
    summary: clipText(signal.summary, 500),
    confidence: typeof signal.confidence === 'number' ? signal.confidence : undefined,
    contribution: typeof signal.contribution === 'number' ? signal.contribution : undefined,
    spender: signal.spender ? String(signal.spender) : undefined,
    token: clipText(signal.token, 32) || undefined,
    tokenAddress: signal.tokenAddress ? String(signal.tokenAddress) : undefined,
    allowance: clipText(signal.allowance, 80) || undefined,
    addresses: asArray(signal.addresses).slice(0, 8).map(String),
    evidence: compactEvidence(signal.evidence),
    affectedTransactions: asArray(signal.affectedTransactions).slice(0, 8).map(String),
  }
}

function compactTx(row, index) {
  if (!row || typeof row !== 'object') return null
  return {
    hash: row.hash ? String(row.hash) : undefined,
    type: clipText(row.transactionType || row.type || row.typeLabel, 48) || undefined,
    from: row.from ? String(row.from) : undefined,
    to: row.to ? String(row.to) : undefined,
    spender: row.spender ? String(row.spender) : undefined,
    token: clipText(row.token, 32) || undefined,
    tokenAddress: row.tokenAddress ? String(row.tokenAddress) : undefined,
    value: row.value != null ? String(row.value) : undefined,
    timestamp: row.timestamp || row.at || undefined,
    status: clipText(row.status, 24) || undefined,
    index,
  }
}

function compactGraph(graph) {
  const source = graph && typeof graph === 'object' ? graph : {}
  const nodes = asArray(source.nodes)
    .slice(0, MAX_NODES)
    .map((node) => ({
      type: clipText(node?.type, 32),
      address: node?.address ? String(node.address) : undefined,
      label: clipText(node?.label || node?.display, 80),
      highlight: Boolean(node?.highlight),
      interactionCount: node?.interactionCount,
    }))
  const edges = asArray(source.edges)
    .slice(0, MAX_EDGES)
    .map((edge) => ({
      kind: clipText(edge?.kind, 40),
      count: edge?.count,
      source: edge?.source ? String(edge.source) : undefined,
      target: edge?.target ? String(edge.target) : undefined,
    }))
  return {
    caption: clipText(source.caption, 80) || undefined,
    counts: asArray(source.counts).slice(0, 6),
    steps: asArray(source.steps)
      .slice(0, 8)
      .map((step) => ({
        kicker: clipText(step?.kicker, 40),
        label: clipText(step?.label, 80),
        address: step?.address ? String(step.address) : undefined,
      })),
    nodes,
    edges,
  }
}

export function buildVerifiedBriefing(input = {}) {
  const address = isAddress(input.address) ? normalizeAddress(input.address) : ''
  const chain = clipText(input.chain || input.network || 'ethereum', 32) || 'ethereum'
  const scoreRaw = input.riskScore ?? input.score
  const score = Math.max(0, Math.min(100, Number(scoreRaw) || 0))
  const severity = clipText(input.severity, 24) || 'low'
  const confidence =
    input.confidence && typeof input.confidence === 'object'
      ? {
          score: typeof input.confidence.score === 'number' ? input.confidence.score : undefined,
          label: clipText(input.confidence.label, 24) || undefined,
        }
      : typeof input.confidence === 'number'
        ? { score: input.confidence }
        : null

  const signals = asArray(input.signals || input.detectedSignals)
    .slice(0, MAX_SIGNALS)
    .map(compactSignal)
    .filter(Boolean)

  const evidence = compactEvidence(input.evidence)
  const graphSummary = compactGraph(input.graphSummary || input.relationshipGraph || {})
  const transactions = asArray(input.transactions || input.importantTransactions)
    .slice(0, MAX_TX)
    .map(compactTx)
    .filter(Boolean)

  const allowedHex = collectHex(address, signals, evidence, graphSummary, transactions)

  return {
    address,
    chain,
    score,
    severity,
    confidence,
    signals,
    evidence,
    graphSummary,
    transactions,
    hasFindings: signals.length > 0,
    allowedHex,
    intent: input.intent === 'signing_preview' ? 'signing_preview' : undefined,
  }
}

export function formatBriefing(briefing) {
  const payload = {
    investigatedAddress: briefing.address,
    chain: briefing.chain,
    deterministicRisk: {
      model: 'Wallet Autopsy Risk Model',
      score: briefing.score,
      severity: briefing.severity,
      confidence: briefing.confidence,
      note: 'This score was already calculated. Do not change it, and do not invent a new score.',
    },
    detectedSignals: briefing.signals,
    evidence: briefing.evidence,
    relationshipGraphSummary: briefing.graphSummary,
    importantTransactions: briefing.transactions,
    inspection: briefing.intent === 'signing_preview'
      ? {
          kind: 'transaction_preview',
          instruction:
            'Explain this specific transaction. Cover what it does, what permission is granted, what asset is involved, why it was flagged, the evidence, and what to verify. Never instruct the user to sign or not sign. End with: Review this transaction carefully.',
        }
      : undefined,
  }
  return `VERIFIED_FINDINGS (the only facts you may use):\n${JSON.stringify(payload, null, 2)}`
}
