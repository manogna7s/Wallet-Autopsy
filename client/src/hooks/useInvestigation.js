import { useEffect, useState } from 'react'
import { investigateAddress } from '../api/client'
import { isAddress } from '../data/mock'
import { presentInvestigation } from '../lib/presentInvestigation'
import { useNetwork } from '../context/NetworkContext'

export function useInvestigation(address) {
  const { network } = useNetwork()
  const [state, setState] = useState({ status: 'idle', data: null, error: null })

  useEffect(() => {
    if (!address) {
      setState({ status: 'idle', data: null, error: null })
      return undefined
    }
    if (!isAddress(address)) {
      setState({
        status: 'error',
        data: null,
        error: new Error('Enter a valid 42-character EVM address (0x…).'),
      })
      return undefined
    }

    let on = true
    setState({ status: 'loading', data: null, error: null })
    investigateAddress(address, network.id)
      .then((payload) => {
        if (!on) return
        setState({ status: 'ready', data: presentInvestigation(payload), error: null })
      })
      .catch((error) => {
        if (!on) return
        setState({ status: 'error', data: null, error })
      })

    return () => {
      on = false
    }
  }, [address, network.id])

  return state
}
