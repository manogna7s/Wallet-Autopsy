import { useEffect, useState } from 'react'
import { getSavedInvestigation } from '../api/client'
import { presentInvestigation } from '../lib/presentInvestigation'

export function useSavedInvestigation(id) {
  const [state, setState] = useState({ status: 'idle', data: null, error: null })

  useEffect(() => {
    if (!id) {
      setState({ status: 'idle', data: null, error: null })
      return undefined
    }

    let on = true
    setState({ status: 'loading', data: null, error: null })
    getSavedInvestigation(id)
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
  }, [id])

  return state
}
