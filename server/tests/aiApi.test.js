import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { createApp } from '../index.js'
import { unlimitedApproval, SUBJECT } from './fixtures/riskActivity.js'
import { analyzeRisk } from '../services/risk/analyzeRisk.js'

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server))
  })
}

function origin(server) {
  const address = server.address()
  return `http://127.0.0.1:${address.port}`
}

describe('POST /api/ai/investigate', () => {
  let previousKey

  before(() => {
    previousKey = process.env.GEMINI_API_KEY
    process.env.GEMINI_API_KEY = ''
  })

  after(() => {
    if (previousKey == null) delete process.env.GEMINI_API_KEY
    else process.env.GEMINI_API_KEY = previousKey
  })

  it('returns a deterministic template when Gemini is not configured', async () => {
    const server = await listen(createApp())
    try {
      const risk = analyzeRisk(unlimitedApproval())
      const res = await fetch(`${origin(server)}/api/ai/investigate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: SUBJECT,
          chain: 'ethereum',
          riskScore: risk.score,
          severity: risk.severity,
          confidence: risk.confidence,
          signals: risk.signals,
          evidence: risk.evidence,
          importantTransactions: unlimitedApproval().transactions,
        }),
      })
      assert.equal(res.status, 200)
      const body = await res.json()
      assert.equal(body.source, 'fallback')
      assert.equal(body.fallbackReason, 'not_configured')
      assert.equal(body.generatedFrom, 'verified on-chain findings')
      assert.equal(body.score, risk.score)
      assert.match(body.summary, /unlimited token approval/i)
      assert.equal(typeof body.summary, 'string')
      assert.ok(Array.isArray(body.keyFindings))
      assert.ok(Array.isArray(body.evidenceExplanation))
      assert.ok(Array.isArray(body.potentialExposure))
      assert.ok(Array.isArray(body.whatToCheck))
      assert.equal(typeof body.uncertainty, 'string')
    } finally {
      server.close()
    }
  })

  it('uses the missing-findings template without inventing activity', async () => {
    const server = await listen(createApp())
    try {
      const res = await fetch(`${origin(server)}/api/ai/investigate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: SUBJECT,
          chain: 'ethereum',
          riskScore: 0,
          severity: 'low',
          signals: [],
        }),
      })
      assert.equal(res.status, 200)
      const body = await res.json()
      assert.equal(body.fallbackReason, 'missing_findings')
      assert.match(body.summary, /no security signals/i)
      assert.doesNotMatch(JSON.stringify(body), /0xapprove1/)
    } finally {
      server.close()
    }
  })

  it('rejects invalid addresses and unsupported networks', async () => {
    const server = await listen(createApp())
    try {
      const invalid = await fetch(`${origin(server)}/api/ai/investigate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: '0x123', signals: [] }),
      })
      assert.equal(invalid.status, 400)
      const invalidBody = await invalid.json()
      assert.equal(invalidBody.code, 'INVALID_ADDRESS')

      const network = await fetch(`${origin(server)}/api/ai/investigate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: SUBJECT, chain: 'base', signals: [] }),
      })
      assert.equal(network.status, 400)
      const networkBody = await network.json()
      assert.equal(networkBody.code, 'UNSUPPORTED_NETWORK')
    } finally {
      server.close()
    }
  })

  it('does not expose Gemini credentials on health', async () => {
    const server = await listen(createApp())
    try {
      const res = await fetch(`${origin(server)}/api/health`)
      const body = await res.json()
      const blob = JSON.stringify(body)
      assert.doesNotMatch(blob, /GEMINI_API_KEY/)
      assert.equal(typeof body.gemini.configured, 'boolean')
      assert.equal(body.gemini.configured, false)
    } finally {
      server.close()
    }
  })
})
