import { useEffect, useState } from 'react'
import { explainInvestigation } from '../api/client'
import { buildAiRequest } from '../lib/aiRequest'

export function useAiInvestigation(data) {
  const [state, setState] = useState({ status: 'idle', report: null, error: null })
  const address = data?.address
  const score = data?.risk?.score
  const signalKey = (data?.signals || []).map((signal) => signal.id).join('|')

  useEffect(() => {
    if (!address) {
      setState({ status: 'idle', report: null, error: null })
      return undefined
    }

    if (data.ai) {
      setState({ status: 'ready', report: data.ai, error: null })
      return undefined
    }

    const payload = buildAiRequest(data)
    let on = true
    setState({ status: 'loading', report: null, error: null })
    explainInvestigation(payload)
      .then((report) => {
        if (!on) return
        setState({ status: 'ready', report, error: null })
      })
      .catch((error) => {
        if (!on) return
        setState({ status: 'error', report: null, error })
      })

    return () => {
      on = false
    }
  }, [address, score, signalKey, data])

  return state
}
