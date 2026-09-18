import { createContext, useContext, useMemo, useState } from 'react'
import { NETWORKS } from '../data/mock'

const NetworkContext = createContext(null)

export function NetworkProvider({ children }) {
  const [networkId, setNetworkId] = useState('ethereum')
  const network = NETWORKS.find((item) => item.id === networkId) || NETWORKS[0]
  const value = useMemo(() => ({ network, networkId, setNetworkId, networks: NETWORKS }), [network, networkId])
  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>
}

export function useNetwork() {
  const ctx = useContext(NetworkContext)
  if (!ctx) throw new Error('useNetwork must be used within NetworkProvider')
  return ctx
}
