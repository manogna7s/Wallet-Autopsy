import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { normalizeTransfer, normalizeApproval, mergeAndSortActivity } from '../services/blockchain/transactionNormalizer.js'
import { isUnlimitedAllowance, decodeApprovalLog } from '../services/blockchain/tokenService.js'

const subject = '0xd8da6bf26964af9d7eed9e03e53415d37aa96045'

describe('transaction normalizer', () => {
  it('maps an ERC-20 transfer and omits empty fields', () => {
    const row = normalizeTransfer(
      {
        hash: '0xabc',
        from: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        to: '0x1111111111111111111111111111111111111111',
        value: 12.5,
        asset: 'USDC',
        category: 'erc20',
        uniqueId: '0xabc:erc20',
        blockNum: '0x10',
        metadata: { blockTimestamp: '2024-01-01T00:00:00.000Z' },
        rawContract: { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
      },
      { chain: 'ethereum', subject, contracts: new Set() },
    )

    assert.equal(row.transactionType, 'token_transfer')
    assert.equal(row.token, 'USDC')
    assert.equal(row.method, undefined)
    assert.equal(row.contractInteraction, undefined)
    assert.equal(row.status, 'confirmed')
    assert.equal(row.direction, 'out')
  })

  it('marks contract interaction only when code was detected', () => {
    const contract = '0x7a250d5630b4cf539739df2c5dacb4c659f2488d'
    const row = normalizeTransfer(
      {
        hash: '0xdef',
        from: subject,
        to: contract,
        value: 0,
        asset: 'ETH',
        category: 'external',
        uniqueId: '0xdef:external',
      },
      { chain: 'ethereum', subject, contracts: new Set([contract]) },
    )
    assert.equal(row.transactionType, 'contract_interaction')
    assert.equal(row.contractInteraction, true)
  })

  it('does not invent timestamps for approvals without block time', () => {
    const decoded = decodeApprovalLog({
      topics: [
        '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925',
        `0x000000000000000000000000${subject.slice(2)}`,
        '0x0000000000000000000000007a250d5630b4cf539739df2c5dacb4c659f2488d',
      ],
      data: `0x${'f'.repeat(64)}`,
      address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      transactionHash: '0xaaa',
      blockNumber: '0x20',
      logIndex: '0x1',
    })
    assert.equal(decoded.unlimited, true)
    assert.equal(isUnlimitedAllowance(`0x${'f'.repeat(64)}`), true)

    const row = normalizeApproval(
      { transactionHash: '0xaaa', blockNumber: '0x20', logIndex: '0x1' },
      { chain: 'ethereum', token: 'USDC', tokenAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', decoded },
    )
    assert.equal(row.timestamp, undefined)
    assert.equal(row.transactionType, 'approval')
    assert.equal(row.method, 'approve')
  })

  it('dedupes merged activity by unique id', () => {
    const a = { uniqueId: '1', hash: '0x1', timestamp: '2024-02-01T00:00:00.000Z' }
    const b = { uniqueId: '1', hash: '0x1', timestamp: '2024-02-01T00:00:00.000Z' }
    const merged = mergeAndSortActivity([a, b], [])
    assert.equal(merged.length, 1)
  })
})
