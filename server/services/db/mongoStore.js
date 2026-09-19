import mongoose from 'mongoose'
import { Investigation } from '../../models/Investigation.js'
import { TransactionSnapshot } from '../../models/TransactionSnapshot.js'
import { RiskFinding } from '../../models/RiskFinding.js'
import { AIReport } from '../../models/AIReport.js'
import { Watchlist } from '../../models/Watchlist.js'
import { compactTx, findingFromSignal, listItem, fullPayload, rebuildRisk, presentAi, MAX_TX } from './memoryStore.js'

const MAX_HISTORY = 50

function toListItem(doc) {
  return listItem({
    id: String(doc._id),
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
  })
}

export const mongoStore = {
  kind: 'mongo',
  async saveInvestigation(sessionId, payload) {
    const risk = payload.risk || {}
    const signals = risk.signals || []
    const doc = await Investigation.create({
      sessionId,
      address: payload.address,
      chain: payload.chain,
      chainLabel: payload.chainLabel,
      investigatedAt: new Date(),
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
    })

    const txs = (payload.transactions || []).slice(0, MAX_TX).map(compactTx).filter(Boolean)
    if (txs.length) {
      await TransactionSnapshot.insertMany(txs.map((row) => ({ ...row, investigationId: doc._id })))
    }
    if (signals.length) {
      await RiskFinding.insertMany(
        signals.map((signal) => ({ ...findingFromSignal(signal), investigationId: doc._id })),
      )
    }
    if (payload.ai) {
      await AIReport.create({
        investigationId: doc._id,
        summary: payload.ai.summary,
        findings: payload.ai.keyFindings || payload.ai.findings || [],
        evidenceExplanation: payload.ai.evidenceExplanation || [],
        potentialExposure: payload.ai.potentialExposure || [],
        whatToCheck: payload.ai.whatToCheck || [],
        uncertainty: payload.ai.uncertainty || '',
        whyItMatters: payload.ai.whyItMatters || [],
        source: payload.ai.source,
        fallbackReason: payload.ai.fallbackReason,
        timestamp: new Date(),
      })
    }

    const extras = await Investigation.find({ sessionId }).sort({ investigatedAt: -1 }).skip(MAX_HISTORY).select('_id')
    if (extras.length) {
      const ids = extras.map((row) => row._id)
      await Promise.all([
        Investigation.deleteMany({ _id: { $in: ids } }),
        TransactionSnapshot.deleteMany({ investigationId: { $in: ids } }),
        RiskFinding.deleteMany({ investigationId: { $in: ids } }),
        AIReport.deleteMany({ investigationId: { $in: ids } }),
      ])
    }

    return { id: String(doc._id), investigatedAt: doc.investigatedAt }
  },
  async listInvestigations(sessionId) {
    const rows = await Investigation.find({ sessionId }).sort({ investigatedAt: -1 }).limit(MAX_HISTORY)
    return rows.map(toListItem)
  },
  async getInvestigation(sessionId, id) {
    if (!mongoose.isValidObjectId(id)) return null
    const doc = await Investigation.findOne({ _id: id, sessionId })
    if (!doc) return null
    const [txs, signalDocs, report] = await Promise.all([
      TransactionSnapshot.find({ investigationId: doc._id }).lean(),
      RiskFinding.find({ investigationId: doc._id }).lean(),
      AIReport.findOne({ investigationId: doc._id }).lean(),
    ])
    return fullPayload(
      {
        id: String(doc._id),
        address: doc.address,
        chain: doc.chain,
        chainLabel: doc.chainLabel,
        investigatedAt: doc.investigatedAt,
        provider: doc.provider,
        truncated: doc.truncated,
        notices: doc.notices,
        activity: doc.activity,
        empty: doc.empty,
        risk: doc.risk,
        riskScore: doc.riskScore,
        severity: doc.severity,
        confidence: doc.confidence,
        summary: doc.summary,
      },
      {
        transactions: txs,
        risk: rebuildRisk(
          { ...doc.toObject(), risk: doc.risk, address: doc.address, chain: doc.chain },
          signalDocs,
        ),
        ai: presentAi(report),
      },
    )
  },
  async addWatch(sessionId, { address, chain, label }) {
    const existing = await Watchlist.findOne({ sessionId, address, chain })
    if (existing) {
      return {
        id: String(existing._id),
        address: existing.address,
        chain: existing.chain,
        label: existing.label,
        createdAt: existing.createdAt,
      }
    }
    const item = await Watchlist.create({ sessionId, address, chain, label: label || '' })
    return {
      id: String(item._id),
      address: item.address,
      chain: item.chain,
      label: item.label,
      createdAt: item.createdAt,
    }
  },
  async removeWatch(sessionId, id) {
    if (!mongoose.isValidObjectId(id)) return false
    const result = await Watchlist.deleteOne({ _id: id, sessionId })
    return result.deletedCount > 0
  },
  async listWatch(sessionId) {
    const rows = await Watchlist.find({ sessionId }).sort({ createdAt: -1 })
    return rows.map((item) => ({
      id: String(item._id),
      address: item.address,
      chain: item.chain,
      label: item.label,
      createdAt: item.createdAt,
    }))
  },
}
