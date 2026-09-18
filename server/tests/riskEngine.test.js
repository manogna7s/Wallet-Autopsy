import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { analyzeRisk } from '../services/risk/analyzeRisk.js'
import { MODEL_NAME } from '../services/risk/config.js'
import { normalizeListing } from '../services/risk/intelligence.js'
import {
  SUBJECT,
  emptyActivity,
  unlimitedApproval,
  multipleUnlimitedApprovals,
  flaggedCounterpartyOnce,
  repeatedFlaggedInteractions,
  highFrequencyBurst,
  suddenLargeTransfer,
  unknownContractActivity,
  listedContractActivity,
  shortRepeatBurst,
} from './fixtures/riskActivity.js'

function types(analysis) {
  return analysis.signals.map((signal) => signal.type)
}

function hasType(analysis, type) {
  return analysis.signals.some((signal) => signal.type === type)
}

function textBlob(analysis) {
  return JSON.stringify(analysis).toLowerCase()
}

describe('Wallet Autopsy Risk Model', () => {
  it('scores an empty wallet at 0 without inventing activity', () => {
    const analysis = analyzeRisk(emptyActivity())
    assert.equal(analysis.model, MODEL_NAME)
    assert.equal(analysis.score, 0)
    assert.equal(analysis.severity, 'low')
    assert.equal(analysis.signals.length, 0)
    assert.equal(analysis.confidence.id, 'low')
    assert.match(analysis.summary, /no security signals/i)
  })

  it('detects unlimited token approvals with evidence', () => {
    const analysis = analyzeRisk(unlimitedApproval())
    const signal = analysis.signals.find((row) => row.type === 'unlimited_token_approval')
    assert.ok(signal)
    assert.equal(signal.token, 'USDC')
    assert.equal(signal.spender, '0x4444444444444444444444444444444444444444')
    assert.match(signal.allowance, /unlimited/i)
    assert.deepEqual(signal.affectedTransactions, ['0xapprove1'])
    assert.ok(signal.evidence.some((row) => row.label === 'Transaction' && row.value === '0xapprove1'))
    assert.match(signal.summary, /potential exposure detected/i)
    assert.ok(analysis.score > 0)
    assert.ok(analysis.scoreBreakdown.some((row) => row.delta > 0 && row.signalId === signal.id))
  })

  it('gives weaker evidence a lower confidence than a complete approval event', () => {
    const strong = analyzeRisk(unlimitedApproval())
    const weak = analyzeRisk(unlimitedApproval({ weak: true }))
    const strongSignal = strong.signals.find((row) => row.type === 'unlimited_token_approval')
    const weakSignal = weak.signals.find((row) => row.type === 'unlimited_token_approval')
    assert.ok(strongSignal.confidence > weakSignal.confidence)
    assert.ok(strongSignal.contribution >= weakSignal.contribution)
    assert.notDeepEqual(
      { score: strong.score, confidence: strong.confidence.score },
      { score: weak.score, confidence: weak.confidence.score },
    )
  })

  it('adds permission exposure when multiple unlimited spenders exist', () => {
    const analysis = analyzeRisk(multipleUnlimitedApprovals())
    assert.equal(hasType(analysis, 'permission_exposure_risk'), true)
    assert.equal(hasType(analysis, 'unlimited_token_approval'), true)
  })

  it('flags a demo counterparty without calling the wallet a scam', () => {
    const analysis = analyzeRisk(flaggedCounterpartyOnce())
    assert.equal(hasType(analysis, 'flagged_counterparty'), true)
    assert.equal(hasType(analysis, 'relationship_risk'), true)
    assert.match(analysis.summary, /security signals detected/i)
    assert.doesNotMatch(textBlob(analysis), /this wallet is a scam/)
    assert.doesNotMatch(textBlob(analysis), /will be hacked/)
  })

  it('detects repeated risky interaction with a labeled address', () => {
    const analysis = analyzeRisk(repeatedFlaggedInteractions())
    assert.equal(hasType(analysis, 'repeated_risky_interaction'), true)
    const repeated = analysis.signals.find((row) => row.type === 'repeated_risky_interaction')
    assert.ok((repeated.affectedTransactions || []).length >= 2)
  })

  it('labels high frequency as a behavioral anomaly, not malicious activity', () => {
    const analysis = analyzeRisk(highFrequencyBurst())
    const signal = analysis.signals.find((row) => row.title === 'Unusually high transaction frequency')
    assert.ok(signal)
    assert.equal(signal.behaviorLabel, 'Behavioral anomaly')
    assert.match(signal.summary, /behavioral anomaly/i)
    assert.match(signal.summary, /not classified as malicious activity/i)
  })

  it('detects a sudden large transfer against historical outbound activity', () => {
    const analysis = analyzeRisk(suddenLargeTransfer())
    const signal = analysis.signals.find((row) => row.title === 'Sudden large transfer')
    assert.ok(signal)
    assert.equal(signal.behaviorLabel, 'Behavioral anomaly')
    assert.ok(signal.affectedTransactions.includes('0xlarge1'))
  })

  it('treats unknown contracts as insufficient information, not malice', () => {
    const analysis = analyzeRisk(unknownContractActivity())
    const signal = analysis.signals.find((row) => row.type === 'suspicious_contract_interaction')
    assert.ok(signal)
    assert.equal(signal.title, 'Unverified / insufficient information')
    assert.match(signal.summary, /unknown is not the same as malicious/i)
    assert.equal(signal.severity, 'info')
    assert.ok(signal.confidence < 0.5)
    assert.equal(signal.contribution, 0)
    assert.equal(analysis.score, 0)
  })

  it('can mark a listed demo contract without fabricating a sanctions hit', () => {
    const analysis = analyzeRisk(listedContractActivity())
    const signal = analysis.signals.find((row) => row.title === 'Listed contract interaction')
    assert.ok(signal)
    assert.doesNotMatch(textBlob(analysis), /sanctioned/)
  })

  it('detects repeated short-interval interactions as a behavioral anomaly', () => {
    const analysis = analyzeRisk(shortRepeatBurst())
    const signal = analysis.signals.find((row) => row.title === 'Repeated interactions in a short period')
    assert.ok(signal)
    assert.equal(signal.behaviorLabel, 'Behavioral anomaly')
  })

  it('is deterministic for the same fixture', () => {
    const a = analyzeRisk(repeatedFlaggedInteractions())
    const b = analyzeRisk(repeatedFlaggedInteractions())
    assert.deepEqual(a, b)
  })

  it('explains every score increase', () => {
    const analysis = analyzeRisk(multipleUnlimitedApprovals())
    const explained = analysis.scoreBreakdown.reduce((sum, row) => sum + row.delta, 0)
    assert.equal(explained, analysis.score)
    for (const row of analysis.scoreBreakdown) {
      assert.ok(row.delta > 0)
      assert.ok(row.reason.startsWith(`+${row.delta}`))
    }
  })

  it('ignores sanctioned labels that are not from a verified legitimate source', () => {
    const dropped = normalizeListing({
      address: '0x9999999999999999999999999999999999999999',
      labels: ['sanctioned'],
      source: 'local_demo_list',
      verified: true,
    })
    assert.equal(dropped, null)

    const kept = normalizeListing({
      address: '0x9999999999999999999999999999999999999999',
      labels: ['sanctioned'],
      source: 'ofac_sdn',
      verified: true,
      note: 'Test-only structural listing. Not a real sanctions record.',
    })
    assert.ok(kept.labels.includes('sanctioned'))

    const analysis = analyzeRisk({
      address: SUBJECT,
      chain: 'ethereum',
      transactions: [
        {
          hash: '0xsanc1',
          timestamp: '2024-06-01T12:00:00.000Z',
          from: SUBJECT,
          to: '0x9999999999999999999999999999999999999999',
          value: 1,
          transactionType: 'transfer',
          status: 'confirmed',
        },
      ],
      listings: [
        {
          address: '0x9999999999999999999999999999999999999999',
          labels: ['sanctioned'],
          source: 'blog-post',
          verified: false,
        },
      ],
    })
    assert.equal(hasType(analysis, 'flagged_counterparty'), false)
  })
})
