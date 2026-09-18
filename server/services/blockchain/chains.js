export const SUPPORTED_CHAINS = {
  ethereum: {
    id: 'ethereum',
    chainId: 1,
    label: 'Ethereum',
    alchemyNetwork: 'eth-mainnet',
  },
}

export function resolveChain(input) {
  const id = String(input || 'ethereum').trim().toLowerCase()
  return SUPPORTED_CHAINS[id] || null
}
