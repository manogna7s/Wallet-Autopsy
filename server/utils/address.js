export const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

export function isAddress(value) {
  return ADDRESS_RE.test(String(value || '').trim())
}

export function normalizeAddress(value) {
  return String(value || '').trim().toLowerCase()
}

export function padTopicAddress(address) {
  return `0x${normalizeAddress(address).slice(2).padStart(64, '0')}`
}
