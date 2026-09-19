import { useCallback, useEffect, useMemo, useState } from 'react'
import { explainTransactionPreview, previewTransaction } from '../api/client'

function findLedgerRow(ledger, selectedHash) {
  if (!selectedHash || !ledger?.length) return null
  return ledger.find((row) => row.hash === selectedHash || row.uniqueId === selectedHash) || null
}

export function useSigningPreview({ address, chain, ledger, selectedHash }) {
  const [preview, setPreview] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const [report, setReport] = useState(null)
  const [explainStatus, setExplainStatus] = useState('idle')
  const [explainError, setExplainError] = useState(null)
  const selected = useMemo(() => findLedgerRow(ledger, selectedHash), [ledger, selectedHash])

  useEffect(() => {
    if (!address || !ledger?.length) {
      setPreview(null)
      setStatus('idle')
      setError(null)
      setReport(null)
      setExplainStatus('idle')
      return undefined
    }

    let on = true
    setStatus('loading')
    setError(null)
    setReport(null)
    setExplainStatus('idle')
    setExplainError(null)

    previewTransaction({
      address,
      chain: chain || 'ethereum',
      transaction: selected || (selectedHash ? { hash: selectedHash } : undefined),
      transactions: ledger,
    })
      .then((body) => {
        if (!on) return
        setPreview(body)
        setStatus('ready')
      })
      .catch((err) => {
        if (!on) return
        setPreview(null)
        setError(err)
        setStatus('error')
      })

    return () => {
      on = false
    }
  }, [address, chain, selectedHash, selected, ledger])

  const explain = useCallback(async () => {
    if (!address || !ledger?.length) return
    setExplainStatus('loading')
    setExplainError(null)
    try {
      const body = await explainTransactionPreview({
        address,
        chain: chain || 'ethereum',
        transaction: selected || (selectedHash ? { hash: selectedHash } : undefined),
        transactions: ledger,
      })
      setReport(body.report)
      if (body.preview) setPreview(body.preview)
      setExplainStatus('ready')
    } catch (err) {
      setExplainError(err)
      setExplainStatus('error')
    }
  }, [address, chain, ledger, selected, selectedHash])

  return { preview, status, error, report, explainStatus, explainError, explain }
}
