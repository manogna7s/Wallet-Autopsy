import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { analyzeRisk } from '../services/risk/analyzeRisk.js'
import { investigateFindings, parseAndGround } from '../services/ai/geminiInvestigator.js'
import { unlimitedApproval, emptyActivity, SUBJECT, SPENDER_A } from './fixtures/riskActivity.js'

function findingsFrom(activity) {
  const risk = analyzeRisk(activity)
  return {
    address: risk.address,
    chain: risk.chain,
    riskScore: risk.score,
    severity: risk.severity,
    confidence: risk.confidence,
    signals: risk.signals,
    evidence: risk.evidence,
    importantTransactions: activity.transactions,
  }
}

function validGeminiJson(overrides = {}) {
  return JSON.stringify({
    summary:
      'Several security signals were detected. The strongest signal is an effectively unlimited token approval to 0x4444444444444444444444444444444444444444. This means that spender may have permission to spend the approved USDC balance, depending on the token and contract behavior.',
    keyFindings: ['Unlimited token approval to 0x4444444444444444444444444444444444444444'],
    evidenceExplanation: ['Approval tx 0xapprove1 granted an effectively unlimited USDC allowance.'],
    whyItMatters: [
      'The spender may move the approved token later without another signature from this wallet, if the allowance remains.',
    ],
    potentialExposure: ['USDC could be moved by the approved spender while the allowance is still unlimited.'],
    whatToCheck: ['Confirm the current USDC allowance on-chain and whether that approval was intended.'],
    uncertainty: 'This does not prove malicious intent. Contract behavior is not simulated.',
    ...overrides,
  })
}

describe('Gemini investigation layer', () => {
  it('explains a valid Gemini response without changing the engine score', async () => {
    const input = findingsFrom(unlimitedApproval())
    let called = 0
    const report = await investigateFindings(input, {
      generateContent: async ({ user }) => {
        called += 1
        assert.match(user, /Do not change it/)
        return validGeminiJson()
      },
    })
    assert.equal(called, 1)
    assert.equal(report.source, 'gemini')
    assert.equal(report.fallbackReason, null)
    assert.equal(report.generatedFrom, 'verified on-chain findings')
    assert.equal(report.score, input.riskScore)
    assert.equal(report.address, SUBJECT)
    assert.match(report.summary, /unlimited token approval/i)
    assert.ok(report.keyFindings.length)
    assert.ok(report.evidenceExplanation.length)
    assert.ok(report.potentialExposure.length)
    assert.ok(report.whatToCheck.length)
    assert.ok(report.uncertainty)
    assert.doesNotMatch(JSON.stringify(report), /this wallet is malicious/i)
  })

  it('falls back when Gemini returns malformed JSON', async () => {
    const input = findingsFrom(unlimitedApproval())
    const report = await investigateFindings(input, {
      generateContent: async () => 'not-json {{{',
    })
    assert.equal(report.source, 'fallback')
    assert.equal(report.fallbackReason, 'malformed')
    assert.equal(report.score, input.riskScore)
    assert.match(report.summary, /unlimited token approval/i)
    assert.equal(report.explainer, 'deterministic_template')
  })

  it('falls back when the Gemini API fails', async () => {
    const input = findingsFrom(unlimitedApproval())
    const report = await investigateFindings(input, {
      generateContent: async () => {
        const error = new Error('upstream 500')
        error.code = 'GEMINI_UNAVAILABLE'
        throw error
      },
    })
    assert.equal(report.source, 'fallback')
    assert.equal(report.fallbackReason, 'api_failure')
    assert.ok(report.keyFindings.includes('Unlimited token approval'))
  })

  it('does not call Gemini when findings are missing', async () => {
    let called = 0
    const report = await investigateFindings(findingsFrom(emptyActivity()), {
      generateContent: async () => {
        called += 1
        return validGeminiJson()
      },
    })
    assert.equal(called, 0)
    assert.equal(report.source, 'fallback')
    assert.equal(report.fallbackReason, 'missing_findings')
    assert.equal(report.score, 0)
    assert.match(report.summary, /no security signals/i)
  })

  it('falls back when Gemini times out', async () => {
    const input = findingsFrom(unlimitedApproval())
    const report = await investigateFindings(input, {
      generateContent: async () => {
        const error = new Error('timeout')
        error.code = 'GEMINI_TIMEOUT'
        throw error
      },
    })
    assert.equal(report.source, 'fallback')
    assert.equal(report.fallbackReason, 'timeout')
    assert.match(report.uncertainty, /malicious intent/i)
  })

  it('strips invented addresses from a Gemini response', () => {
    const input = findingsFrom(unlimitedApproval())
    const briefing = {
      hasFindings: true,
      signals: input.signals,
      allowedHex: new Set([
        SUBJECT.toLowerCase(),
        SPENDER_A.toLowerCase(),
        '0xapprove1',
        '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      ]),
    }
    const grounded = parseAndGround(
      validGeminiJson({
        summary: `Contact 0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef next to ${SPENDER_A}.`,
      }),
      briefing,
    )
    assert.ok(grounded)
    assert.match(grounded.summary, /not in verified findings/)
    assert.doesNotMatch(grounded.summary, /0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef/)
    assert.match(grounded.summary, new RegExp(SPENDER_A, 'i'))
  })

  it('rejects empty objects as malformed', () => {
    const grounded = parseAndGround('{}', { hasFindings: true, signals: [], allowedHex: new Set() })
    assert.equal(grounded, null)
  })
})
