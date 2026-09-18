import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createApp } from '../index.js'
import { MODEL_NAME } from '../services/risk/config.js'
import { unlimitedApproval, SUBJECT } from './fixtures/riskActivity.js'

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server))
  })
}

function origin(server) {
  const address = server.address()
  return `http://127.0.0.1:${address.port}`
}

describe('POST /api/risk/analyze', () => {
  it('returns deterministic analysis for fixture activity', async () => {
    const server = await listen(createApp())
    try {
      const res = await fetch(`${origin(server)}/api/risk/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(unlimitedApproval()),
      })
      assert.equal(res.status, 200)
      const body = await res.json()
      assert.equal(body.model, MODEL_NAME)
      assert.equal(body.address, SUBJECT)
      assert.ok(body.signals.some((row) => row.type === 'unlimited_token_approval'))
      assert.equal(typeof body.confidence.score, 'number')
    } finally {
      server.close()
    }
  })

  it('rejects invalid addresses and unsupported networks', async () => {
    const server = await listen(createApp())
    try {
      const invalid = await fetch(`${origin(server)}/api/risk/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: '0x123', transactions: [] }),
      })
      assert.equal(invalid.status, 400)
      const invalidBody = await invalid.json()
      assert.equal(invalidBody.code, 'INVALID_ADDRESS')

      const network = await fetch(`${origin(server)}/api/risk/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: SUBJECT, chain: 'base', transactions: [] }),
      })
      assert.equal(network.status, 400)
      const networkBody = await network.json()
      assert.equal(networkBody.code, 'UNSUPPORTED_NETWORK')

      const activity = await fetch(`${origin(server)}/api/risk/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: SUBJECT, chain: 'ethereum' }),
      })
      assert.equal(activity.status, 400)
      const activityBody = await activity.json()
      assert.equal(activityBody.code, 'INVALID_ACTIVITY')
    } finally {
      server.close()
    }
  })

  it('does not expose provider credentials', async () => {
    const server = await listen(createApp())
    try {
      const res = await fetch(`${origin(server)}/api/health`)
      const body = await res.json()
      const blob = JSON.stringify(body)
      assert.doesNotMatch(blob, /ALCHEMY_API_KEY/)
      assert.equal(body.riskModel, MODEL_NAME)
    } finally {
      server.close()
    }
  })
})
