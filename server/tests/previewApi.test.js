import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { createApp } from '../index.js'
import { SUBJECT, unlimitedApproval } from './fixtures/riskActivity.js'

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server))
  })
}

function origin(server) {
  const address = server.address()
  return `http://127.0.0.1:${address.port}`
}

describe('POST /api/preview', () => {
  let previousKey

  before(() => {
    previousKey = process.env.GEMINI_API_KEY
    process.env.GEMINI_API_KEY = ''
  })

  after(() => {
    if (previousKey == null) delete process.env.GEMINI_API_KEY
    else process.env.GEMINI_API_KEY = previousKey
  })

  it('returns a read-only transaction checkpoint', async () => {
    const server = await listen(createApp())
    try {
      const res = await fetch(`${origin(server)}/api/preview/transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: SUBJECT,
          chain: 'ethereum',
          transaction: { hash: '0xapprove1' },
          transactions: unlimitedApproval().transactions,
        }),
      })
      assert.equal(res.status, 200)
      const body = await res.json()
      assert.equal(body.simulation, true)
      assert.equal(body.signing, false)
      assert.equal(body.transaction.action, 'Approve')
      assert.equal(body.transaction.allowance, 'Unlimited')
      assert.equal(body.permission.asset, 'USDC')
      assert.ok(body.signals.some((row) => row.warning === 'Unlimited token allowance'))
      assert.equal(body.caption, 'Review this transaction carefully.')
    } finally {
      server.close()
    }
  })

  it('explains the preview without instructing the user to sign', async () => {
    const server = await listen(createApp())
    try {
      const res = await fetch(`${origin(server)}/api/preview/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: SUBJECT,
          chain: 'ethereum',
          transactions: unlimitedApproval().transactions,
        }),
      })
      assert.equal(res.status, 200)
      const body = await res.json()
      assert.equal(body.preview.transaction.hash, '0xapprove1')
      assert.equal(body.report.source, 'fallback')
      assert.match(body.report.summary, /review this transaction carefully/i)
      assert.doesNotMatch(JSON.stringify(body.report).toLowerCase(), /don't sign/)
      assert.doesNotMatch(JSON.stringify(body.report).toLowerCase(), /you should sign/)
    } finally {
      server.close()
    }
  })

  it('rejects missing ledgers and invalid addresses', async () => {
    const server = await listen(createApp())
    try {
      const badAddress = await fetch(`${origin(server)}/api/preview/transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: 'not-an-address', transactions: unlimitedApproval().transactions }),
      })
      assert.equal(badAddress.status, 400)
      const empty = await fetch(`${origin(server)}/api/preview/transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: SUBJECT, transactions: [] }),
      })
      assert.equal(empty.status, 400)
    } finally {
      server.close()
    }
  })
})
