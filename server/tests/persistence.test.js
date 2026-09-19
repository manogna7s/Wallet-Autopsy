import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { analyzeRisk } from '../services/risk/analyzeRisk.js'
import { investigateFindings } from '../services/ai/geminiInvestigator.js'
import {
  addWatchItem,
  getHistoryById,
  listHistory,
  listWatchItems,
  persistCompletedInvestigation,
  removeWatchItem,
  useMemoryStore,
} from '../services/db/persistence.js'
import { unlimitedApproval, SUBJECT } from './fixtures/riskActivity.js'

async function completedPayload() {
  const activity = unlimitedApproval()
  const risk = analyzeRisk(activity)
  const payload = {
    address: SUBJECT,
    chain: 'ethereum',
    chainLabel: 'Ethereum',
    provider: 'alchemy',
    notices: [],
    truncated: false,
    activity: { empty: false, counts: { events: 1, transactions: 1 } },
    transactions: activity.transactions,
    risk,
  }
  payload.ai = await investigateFindings({
    address: payload.address,
    chain: payload.chain,
    riskScore: risk.score,
    severity: risk.severity,
    confidence: risk.confidence,
    signals: risk.signals,
    evidence: risk.evidence,
    importantTransactions: payload.transactions,
  })
  return payload
}

describe('investigation persistence', () => {
  before(() => {
    useMemoryStore()
  })

  it('saves and retrieves a completed investigation', async () => {
    const payload = await completedPayload()
    const saved = await persistCompletedInvestigation('session-a', payload)
    assert.ok(saved?.id)

    const listed = await listHistory('session-a')
    assert.equal(listed.length, 1)
    assert.equal(listed[0].address, SUBJECT)
    assert.equal(listed[0].riskScore, payload.risk.score)
    assert.ok(listed[0].signalCount >= 1)

    const full = await getHistoryById('session-a', saved.id)
    assert.ok(full)
    assert.equal(full.address, SUBJECT)
    assert.equal(full.source, 'history')
    assert.equal(full.transactions.length, 1)
    assert.equal(full.transactions[0].hash, '0xapprove1')
    assert.ok(full.risk.signals.some((row) => row.type === 'unlimited_token_approval'))
    assert.match(full.ai.summary, /unlimited token approval/i)
    assert.ok(full.ai.keyFindings.length)
    assert.ok(full.ai.whatToCheck.length)
  })

  it('does not leak investigations across sessions', async () => {
    const payload = await completedPayload()
    const saved = await persistCompletedInvestigation('session-b', payload)
    const other = await getHistoryById('session-a', saved.id)
    assert.equal(other, null)
    const listed = await listHistory('session-c')
    assert.equal(listed.length, 0)
  })

  it('stores and removes watchlist items', async () => {
    const item = await addWatchItem('session-a', {
      address: SUBJECT,
      chain: 'ethereum',
      label: 'fixture',
    })
    assert.ok(item.id)
    const listed = await listWatchItems('session-a')
    assert.equal(listed.some((row) => row.address === SUBJECT), true)
    const removed = await removeWatchItem('session-a', item.id)
    assert.equal(removed, true)
    const after = await listWatchItems('session-a')
    assert.equal(after.some((row) => row.id === item.id), false)
  })
})
