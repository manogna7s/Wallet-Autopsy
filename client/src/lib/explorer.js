import { isAddress } from '../data/mock'

const EXPLORERS = {
  ethereum: {
    name: 'Etherscan',
    origin: 'https://etherscan.io',
  },
}

export function explorerFor(chain) {
  return EXPLORERS[chain] || null
}

export function txExplorerUrl(chain, hash) {
  const explorer = explorerFor(chain)
  if (!explorer || !hash || !String(hash).startsWith('0x') || String(hash).length < 10) return null
  return `${explorer.origin}/tx/${hash}`
}

export function addressExplorerUrl(chain, address) {
  const explorer = explorerFor(chain)
  if (!explorer || !isAddress(address)) return null
  return `${explorer.origin}/address/${address}`
}
