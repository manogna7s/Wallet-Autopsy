/**
 * Shared client constants. Live ledger data comes from GET /api/investigate/:address.
 * Do not add fabricated transaction rows here.
 */
export const NETWORKS = [
  { id: 'ethereum', label: 'Ethereum', chainId: 1, enabled: true },
  { id: 'base', label: 'Base', chainId: 8453, enabled: false },
  { id: 'arbitrum', label: 'Arbitrum', chainId: 42161, enabled: false },
]

export const DEMO_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
export const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/

export function isAddress(value) {
  return ADDRESS_RE.test(String(value || '').trim())
}

export function shorten(address, size = 4) {
  if (!address) return '—'
  const value = String(address)
  if (value.length < size * 2 + 4) return value
  return `${value.slice(0, 2 + size)}…${value.slice(-size)}`
}
