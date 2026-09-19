import { randomUUID } from 'node:crypto'

const MAX_TX = 200
const MAX_HISTORY = 50

function compactTx(row) {
  if (!row || typeof row !== 'object') return null
  return {
    hash: row.hash,
    from: row.from,
    to: row.to,
    value: row.value,
    token: row.token,
    tokenAddress: row.tokenAddress,
    transactionType: row.transactionType,
    timestamp: row.timestamp,
    spender: row.spender,
    unlimited: row.unlimited,
    status: row.status,
    uniqueId: row.uniqueId,
    method: row.method,
    contractInteraction: row.contractInteraction,
    direction: row.direction,
    blockNum: row.blockNum,
  }
}

function findingFromSignal(signal) {
  const related = [
    ...(Array.isArray(signal.addresses) ? signal.addresses : []),
    signal.spender,
    signal.tokenAddress,
  ].filter(Boolean)
  return {
    type: signal.type,
    severity: signal.severity,
    confidence: signal.confidence,
    explanation: signal.summary || signal.explanation,
    evidence: signal.evidence || [],
    transactionHashes: signal.affectedTransactions || signal.transactionHashes || [],
    relatedAddresses: [...new Set(related)],
    title: signal.title,
    signalId: signal.id || signal.signalId,
    timestamp: new Date().toISOString(),
  }
}

function listItem(doc) {
  return {
    id: doc.id,
    address: doc.address,
    chain: doc.chain,
    chainLabel: doc.chainLabel,
    investigatedAt: doc.investigatedAt,
    riskScore: doc.riskScore,
    severity: doc.severity,
    confidence: doc.confidence,
    signalCount: doc.signalCount,
    summary: doc.summary,
    empty: doc.empty,
  }
}

function fullPayload(doc, extras) {
  return {
    id: doc.id,
    address: doc.address,
    chain: doc.chain,
    chainLabel: doc.chainLabel,
    investigatedAt: doc.investigatedAt,
    provider: doc.provider || 'alchemy',
    cached: false,
    truncated: Boolean(doc.truncated),
    notices: doc.notices || [],
    activity: doc.activity || { empty: doc.empty },
    transactions: extras.transactions || [],
    risk: extras.risk,
    ai: extras.ai,
    persisted: true,
    source: 'history',
  }
}

function rebuildRisk(doc, findings) {
  if (doc.risk) return doc.risk
  return {
    model: 'Wallet Autopsy Risk Model',
    address: doc.address,
    chain: doc.chain,
    score: doc.riskScore,
    severity: doc.severity,
    confidence: doc.confidence,
    summary: doc.summary,
    signalCount: findings.length,
    signals: findings.map((finding) => ({
      id: finding.signalId || finding.id,
      type: finding.type,
      title: finding.title || finding.type,
      severity: finding.severity,
      summary: finding.explanation,
      confidence: finding.confidence,
      evidence: finding.evidence || [],
      affectedTransactions: finding.transactionHashes || [],
      addresses: finding.relatedAddresses || [],
    })),
  }
}

function presentAi(report) {
  if (!report) return null
  return {
    source: report.source,
    fallbackReason: report.fallbackReason || null,
    generatedFrom: 'verified on-chain findings',
    summary: report.summary,
    keyFindings: report.findings || report.keyFindings || [],
    findings: report.findings || report.keyFindings || [],
    evidenceExplanation: report.evidenceExplanation || [],
    whyItMatters: report.whyItMatters || [],
    potentialExposure: report.potentialExposure || [],
    whatToCheck: report.whatToCheck || [],
    uncertainty: report.uncertainty || '',
  }
}

export function createMemoryStore() {
  const investigations = new Map()
  const snapshots = new Map()
  const findings = new Map()
  const reports = new Map()
  const watchlist = new Map()

  return {
    kind: 'memory',
    reset() {
      investigations.clear()
      snapshots.clear()
      findings.clear()
      reports.clear()
      watchlist.clear()
    },
    async saveInvestigation(sessionId, payload) {
      const id = randomUUID()
      const investigatedAt = new Date().toISOString()
      const risk = payload.risk || {}
      const signals = risk.signals || []
      const doc = {
        id,
        sessionId,
        address: payload.address,
        chain: payload.chain,
        chainLabel: payload.chainLabel,
        investigatedAt,
        riskScore: risk.score ?? 0,
        severity: risk.severity,
        confidence: risk.confidence,
        signalCount: risk.signalCount ?? signals.length,
        summary: risk.summary || payload.ai?.summary || '',
        notices: payload.notices || [],
        truncated: Boolean(payload.truncated),
        empty: Boolean(payload.activity?.empty),
        activity: payload.activity,
        risk,
        provider: payload.provider,
      }
      investigations.set(id, doc)
      snapshots.set(
        id,
        (payload.transactions || []).slice(0, MAX_TX).map(compactTx).filter(Boolean),
      )
      findings.set(id, signals.map(findingFromSignal))
      if (payload.ai) {
        reports.set(id, {
          investigationId: id,
          summary: payload.ai.summary,
          findings: payload.ai.keyFindings || payload.ai.findings || [],
          evidenceExplanation: payload.ai.evidenceExplanation || [],
          potentialExposure: payload.ai.potentialExposure || [],
          whatToCheck: payload.ai.whatToCheck || [],
          uncertainty: payload.ai.uncertainty || '',
          whyItMatters: payload.ai.whyItMatters || [],
          source: payload.ai.source,
          fallbackReason: payload.ai.fallbackReason,
          timestamp: investigatedAt,
        })
      }

      const owned = [...investigations.values()]
        .filter((row) => row.sessionId === sessionId)
        .sort((a, b) => String(b.investigatedAt).localeCompare(String(a.investigatedAt)))
      for (const extra of owned.slice(MAX_HISTORY)) {
        investigations.delete(extra.id)
        snapshots.delete(extra.id)
        findings.delete(extra.id)
        reports.delete(extra.id)
      }
      return { id, investigatedAt }
    },
    async listInvestigations(sessionId) {
      return [...investigations.values()]
        .filter((row) => row.sessionId === sessionId)
        .sort((a, b) => String(b.investigatedAt).localeCompare(String(a.investigatedAt)))
        .map(listItem)
    },
    async getInvestigation(sessionId, id) {
      const doc = investigations.get(id)
      if (!doc || doc.sessionId !== sessionId) return null
      const txs = snapshots.get(id) || []
      const signalDocs = findings.get(id) || []
      return fullPayload(doc, {
        transactions: txs,
        risk: rebuildRisk(doc, signalDocs),
        ai: presentAi(reports.get(id)),
      })
    },
    async addWatch(sessionId, { address, chain, label }) {
      const key = `${sessionId}:${address}:${chain}`
      for (const item of watchlist.values()) {
        if (item.sessionId === sessionId && item.address === address && item.chain === chain) {
          return item
        }
      }
      const item = {
        id: randomUUID(),
        sessionId,
        address,
        chain,
        label: label || '',
        createdAt: new Date().toISOString(),
      }
      watchlist.set(item.id, item)
      return item
    },
    async removeWatch(sessionId, id) {
      const item = watchlist.get(id)
      if (!item || item.sessionId !== sessionId) return false
      watchlist.delete(id)
      return true
    },
    async listWatch(sessionId) {
      return [...watchlist.values()]
        .filter((item) => item.sessionId === sessionId)
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
        .map((item) => ({
          id: item.id,
          address: item.address,
          chain: item.chain,
          label: item.label,
          createdAt: item.createdAt,
        }))
    },
  }
}

export { compactTx, findingFromSignal, listItem, fullPayload, rebuildRisk, presentAi, MAX_TX }
