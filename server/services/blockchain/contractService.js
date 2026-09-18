import { ZERO_ADDRESS, normalizeAddress } from '../../utils/address.js'

export function isLikelyContractAddress(code) {
  return Boolean(code && code !== '0x' && code !== '0x0')
}

export async function identifyContracts(addresses, getCode, { limit = 20 } = {}) {
  const unique = [...new Set(addresses.map(normalizeAddress).filter(Boolean))]
    .filter((value) => value !== ZERO_ADDRESS)
    .slice(0, limit)

  const contracts = new Set()
  const queue = [...unique]

  async function worker() {
    while (queue.length) {
      const address = queue.shift()
      try {
        const code = await getCode(address)
        if (isLikelyContractAddress(code)) contracts.add(address)
      } catch {
        // Skip unresolved codes rather than inventing contract flags.
      }
    }
  }

  const workers = Array.from({ length: Math.min(4, queue.length) }, () => worker())
  await Promise.all(workers)
  return contracts
}
