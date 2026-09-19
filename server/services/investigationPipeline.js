import { investigateAddress, rememberInvestigation } from './investigateService.js'
import { investigateFindings } from './ai/geminiInvestigator.js'
import { getHistoryById, persistCompletedInvestigation } from './db/persistence.js'

export async function generateAiForPayload(payload) {
  const risk = payload.risk || {}
  return investigateFindings({
    address: payload.address,
    chain: payload.chain,
    riskScore: risk.score,
    severity: risk.severity,
    confidence: risk.confidence,
    signals: risk.signals || [],
    evidence: risk.evidence || [],
    importantTransactions: payload.transactions || [],
  })
}

export async function runInvestigation({ address, chainId, sessionId }) {
  const payload = await investigateAddress({ address, chainId })
  if (!payload.ai) {
    payload.ai = await generateAiForPayload(payload)
  }

  const existing = payload.id ? await getHistoryById(sessionId, payload.id) : null
  if (existing) {
    payload.persisted = true
  } else {
    const saved = await persistCompletedInvestigation(sessionId, payload)
    if (saved) {
      payload.id = saved.id
      payload.persisted = true
      payload.investigatedAt = saved.investigatedAt
    } else {
      payload.persisted = false
    }
  }

  rememberInvestigation(payload)
  return payload
}
