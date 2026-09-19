import assert from 'node:assert/strict'
import { before, describe, it } from 'node:test'
import { createApp } from '../index.js'
import { analyzeRisk } from '../services/risk/analyzeRisk.js'
import { persistCompletedInvestigation, useMemoryStore } from '../services/db/persistence.js'
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

const SESSION = '11111111-1111-1111-1111-111111111111'

describe('history and watchlist API', () => {
  before(() => {
    useMemoryStore()
  })

  it('creates, lists, retrieves, and reopens a saved investigation', async () => {
    const activity = unlimitedApproval()
    const risk = analyzeRisk(activity)
    const saved = await persistCompletedInvestigation(SESSION, {
      address: SUBJECT,
      chain: 'ethereum',
      chainLabel: 'Ethereum',
      notices: [],
      activity: { empty: false, counts: { events: 1 } },
      transactions: activity.transactions,
      risk,
      ai: {
        source: 'fallback',
        summary: 'Several security signals were detected. The strongest signal is an effectively unlimited token approval.',
        keyFindings: ['Unlimited token approval'],
        evidenceExplanation: ['Approval tx 0xapprove1'],
        potentialExposure: ['Spender may move the approved token.'],
        whatToCheck: ['Confirm the current allowance.'],
        uncertainty: 'This does not prove malicious intent.',
      },
    })

    const server = await listen(createApp())
    try {
      const headers = { Cookie: `wa_sid=${SESSION}` }
      const list = await fetch(`${origin(server)}/api/history`, { headers })
      assert.equal(list.status, 200)
      const listBody = await list.json()
      assert.ok(listBody.items.some((row) => row.id === saved.id))

      const detail = await fetch(`${origin(server)}/api/history/${saved.id}`, { headers })
      assert.equal(detail.status, 200)
      const body = await detail.json()
      assert.equal(body.address, SUBJECT)
      assert.equal(body.transactions[0].hash, '0xapprove1')
      assert.match(body.ai.summary, /unlimited token approval/i)
      assert.ok(body.risk.signals.length)

      const missing = await fetch(`${origin(server)}/api/history/${saved.id}`, {
        headers: { Cookie: 'wa_sid=22222222-2222-2222-2222-222222222222' },
      })
      assert.equal(missing.status, 404)
    } finally {
      server.close()
    }
  })

  it('adds and deletes watchlist items for the session', async () => {
    const server = await listen(createApp())
    try {
      const headers = { Cookie: `wa_sid=${SESSION}`, 'Content-Type': 'application/json' }
      const created = await fetch(`${origin(server)}/api/watchlist`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ address: SUBJECT, chain: 'ethereum', label: 'lab' }),
      })
      assert.equal(created.status, 201)
      const item = await created.json()
      assert.equal(item.address, SUBJECT)

      const listed = await fetch(`${origin(server)}/api/watchlist`, {
        headers: { Cookie: `wa_sid=${SESSION}` },
      })
      const listedBody = await listed.json()
      assert.ok(listedBody.items.some((row) => row.id === item.id))

      const removed = await fetch(`${origin(server)}/api/watchlist/${item.id}`, {
        method: 'DELETE',
        headers: { Cookie: `wa_sid=${SESSION}` },
      })
      assert.equal(removed.status, 204)
    } finally {
      server.close()
    }
  })
})
