import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isAddress, normalizeAddress, padTopicAddress } from '../utils/address.js'

describe('address helpers', () => {
  it('accepts 42-character hex addresses', () => {
    assert.equal(isAddress('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'), true)
    assert.equal(isAddress('0x123'), false)
    assert.equal(isAddress('not-an-address'), false)
  })

  it('lowercases and pads topic addresses', () => {
    const address = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
    const padded = padTopicAddress(address)
    assert.equal(padded.length, 66)
    assert.equal(padded.endsWith(normalizeAddress(address).slice(2)), true)
  })
})
