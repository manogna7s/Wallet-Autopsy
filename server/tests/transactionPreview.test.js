import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { analyzeRisk } from '../services/risk/analyzeRisk.js'
import {
  pickDefaultTransaction,
  previewTransaction,
  buildSigningFallback,
} from '../services/preview/transactionPreview.js'
import { explainTransactionPreview } from '../services/preview/previewExplain.js'
import {
  SUBJECT,
  SPENDER_A,
  USDC,
  unlimitedApproval,
  repeatedFlaggedInteractions,
  emptyActivity,
  transfer,
} from './fixtures/riskActivity.js'
import { DEMO_ADDRESSES } from '../services/risk/intelligence.js'

describe('transaction preview engine', () => {
  it('previews an unlimited approval without signing fields', () => {
    const activity = unlimitedApproval()
    const preview = previewTransaction({
      address: SUBJECT,
      chain: 'ethereum',
      transaction: { hash: '0xapprove1' },
      transactions: activity.transactions,
    })

    assert.equal(preview.simulation, true)
    assert.equal(preview.signing, false)
    assert.equal(preview.caption, 'Review this transaction carefully.')
    assert.equal(preview.transaction.from, SUBJECT)
    assert.equal(preview.transaction.to, SPENDER_A)
    assert.equal(preview.transaction.token, 'USDC')
    assert.equal(preview.transaction.action, 'Approve')
    assert.equal(preview.transaction.allowance, 'Unlimited')
    assert.equal(preview.transaction.tokenAddress, USDC)
    assert.equal(preview.permission.granted, 'Unlimited token allowance')
    assert.equal(preview.permission.recipient, SPENDER_A)
    assert.equal(preview.permission.recipientRole, 'Spender')
    assert.equal(preview.permission.asset, 'USDC')
    assert.ok(preview.signals.some((row) => row.type === 'unlimited_token_approval'))
    assert.match(preview.signals.find((row) => row.type === 'unlimited_token_approval').warning, /unlimited token allowance/i)
    assert.equal(preview.riskImpact.walletScore, analyzeRisk(activity).score)
  })

  it('defaults to the unlimited approval when no transaction is selected', () => {
    const activity = unlimitedApproval()
    const extra = transfer({ hash: '0xlater', timestamp: '2024-06-02T12:00:00.000Z' })
    const picked = pickDefaultTransaction([...activity.transactions, extra])
    assert.equal(picked.hash, '0xapprove1')
    const preview = previewTransaction({
      address: SUBJECT,
      chain: 'ethereum',
      transactions: [...activity.transactions, extra],
    })
    assert.equal(preview.transaction.hash, '0xapprove1')
  })

  it('attributes flagged counterparties and related history to the selected transfer', () => {
    const activity = repeatedFlaggedInteractions()
    const preview = previewTransaction({
      address: SUBJECT,
      chain: 'ethereum',
      transaction: { hash: activity.transactions[0].hash },
      transactions: activity.transactions,
    })
    assert.ok(preview.signals.some((row) => row.type === 'flagged_counterparty' || row.type === 'repeated_risky_interaction'))
    assert.ok(preview.signals.some((row) => /repeated interaction with (listed|flagged) counterpart/i.test(row.warning)))
    assert.ok(preview.relatedHistory.length >= 1)
    assert.ok(preview.relationships.some((row) => row.address === DEMO_ADDRESSES.flagged))
    assert.ok(preview.riskImpact.relatedContribution > 0)
  })

  it('returns null for an empty ledger', () => {
    assert.equal(previewTransaction({ address: SUBJECT, ...emptyActivity() }), null)
  })

  it('builds a signing fallback that never instructs the user to sign', () => {
    const preview = previewTransaction({
      address: SUBJECT,
      chain: 'ethereum',
      transactions: unlimitedApproval().transactions,
    })
    const report = buildSigningFallback(preview)
    const blob = JSON.stringify(report).toLowerCase()
    assert.match(report.summary, /review this transaction carefully/i)
    assert.doesNotMatch(blob, /don't sign/)
    assert.doesNotMatch(blob, /do not sign/)
    assert.doesNotMatch(blob, /you should sign/)
    assert.ok(report.keyFindings.some((row) => /unlimited/i.test(row)))
    assert.ok(report.whatToCheck.length > 0)
  })

  it('explains with Gemini when available and strips sign instructions', async () => {
    const preview = previewTransaction({
      address: SUBJECT,
      chain: 'ethereum',
      transactions: unlimitedApproval().transactions,
    })
    const report = await explainTransactionPreview(preview, {
      generateContent: async () =>
        JSON.stringify({
          summary: "Don't sign this. Unlimited USDC allowance to 0x4444444444444444444444444444444444444444.",
          keyFindings: ['Unlimited token allowance'],
          evidenceExplanation: ['Approval 0xapprove1'],
          whyItMatters: ['Spender may move USDC later.'],
          potentialExposure: ['USDC allowance'],
          whatToCheck: ['Check the current allowance on-chain.'],
          uncertainty: 'Intent is not proven.',
        }),
    })
    assert.equal(report.source, 'gemini')
    assert.doesNotMatch(report.summary.toLowerCase(), /don't sign/)
    assert.match(report.summary, /review this transaction carefully/i)
  })

  it('uses the signing template when Gemini is unavailable', async () => {
    const preview = previewTransaction({
      address: SUBJECT,
      chain: 'ethereum',
      transactions: unlimitedApproval().transactions,
    })
    const report = await explainTransactionPreview(preview, {
      generateContent: async () => {
        throw Object.assign(new Error('down'), { code: 'GEMINI_EMPTY' })
      },
    })
    assert.equal(report.source, 'fallback')
    assert.match(report.summary, /review this transaction carefully/i)
    assert.ok(report.keyFindings.some((row) => /unlimited/i.test(row)))
  })
})
