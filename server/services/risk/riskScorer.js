import { MODEL_NAME, TYPE_DECAY, bandForConfidence, bandForScore } from './config.js'
import { roundConfidence } from './helpers.js'
import { scoreReason } from './evidenceBuilder.js'

function compareSignals(a, b) {
  if (b.weight !== a.weight) return b.weight - a.weight
  if ((b.confidence || 0) !== (a.confidence || 0)) return (b.confidence || 0) - (a.confidence || 0)
  return String(a.id).localeCompare(String(b.id))
}

function compactSignal(signal) {
  const out = {}
  for (const [key, value] of Object.entries(signal)) {
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value) && value.length === 0) continue
    out[key] = value
  }
  return out
}

export function scoreSignals(rawSignals) {
  const ordered = [...rawSignals].sort(compareSignals)
  const typeCounts = {}
  const breakdown = []
  const scored = []
  let score = 0

  for (const signal of ordered) {
    const seen = typeCounts[signal.type] || 0
    typeCounts[signal.type] = seen + 1
    const decay = TYPE_DECAY ** seen
    const evidenceFactor = 0.5 + 0.5 * (signal.confidence || 0.4)
    const rawDelta = signal.weight * evidenceFactor * decay
    const delta = Math.min(100 - score, Math.max(0, Math.round(rawDelta)))
    const next = {
      ...signal,
      contribution: delta,
    }
    scored.push(compactSignal(next))
    if (delta > 0) {
      score += delta
      breakdown.push({
        delta,
        reason: scoreReason(next, delta),
        signalId: signal.id,
        type: signal.type,
      })
    }
  }

  return { score, breakdown, signals: scored }
}

export function computeConfidence(signals, context) {
  const count = context.transactions.length
  if (!count) {
    return {
      score: 0.2,
      label: 'Low',
      id: 'low',
      basis: 'No activity in the fetched window, so exposure cannot be assessed with much confidence.',
    }
  }

  const timed = context.transactions.filter((row) => row.timestamp).length
  const coverage = timed / count
  let value
  let basis

  const sampleFactor = count >= 20 ? 1 : count >= 8 ? 0.92 : count >= 3 ? 0.82 : 0.7

  if (!signals.length) {
    value = count >= 20 ? 0.7 : count >= 5 ? 0.55 : 0.4
    value = value * (0.7 + 0.3 * coverage) * sampleFactor
    basis = 'No configured signals fired on the fetched activity.'
  } else {
    const weightSum = signals.reduce((sum, signal) => sum + (signal.weight || 1), 0)
    const weighted = signals.reduce((sum, signal) => sum + (signal.confidence || 0.4) * (signal.weight || 1), 0)
    value = weighted / weightSum
    value = value * (0.75 + 0.25 * coverage) * sampleFactor
    if (context.truncated) value -= 0.08
    basis = 'Confidence reflects evidence quality on each signal, separate from the risk score. A thin sample is not treated as strong evidence.'
  }

  const rounded = roundConfidence(value)
  const band = bandForConfidence(rounded)
  return {
    score: rounded,
    label: band.label,
    id: band.id,
    basis,
  }
}

export function summarize(score, signals) {
  if (!signals.length) {
    return 'No security signals detected in the fetched activity.'
  }
  const exposure = signals.some(
    (signal) =>
      signal.type === 'unlimited_token_approval' || signal.type === 'permission_exposure_risk',
  )
  if (exposure && score >= 20) {
    return 'Security signals detected. Potential exposure detected.'
  }
  return 'Security signals detected.'
}

export function finalizeAnalysis({ address, chain, signals, context }) {
  const scored = scoreSignals(signals)
  const confidence = computeConfidence(scored.signals, context)
  const band = bandForScore(scored.score)
  return {
    model: MODEL_NAME,
    address,
    chain,
    score: scored.score,
    severity: band.id,
    severityLabel: band.label,
    confidence,
    signals: scored.signals,
    evidence: context.overallEvidence,
    scoreBreakdown: scored.breakdown,
    summary: summarize(scored.score, scored.signals),
    signalCount: scored.signals.length,
  }
}
