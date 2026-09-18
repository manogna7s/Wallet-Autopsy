import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../ui/Button'
import { useNetwork } from '../../context/NetworkContext'
import { DEMO_ADDRESS, isAddress } from '../../data/mock'
import { cn } from '../../lib/format'

export function AddressSearch({
  initial = '',
  size = 'lg',
  autoFocus = false,
  id = 'address-search',
}) {
  const [value, setValue] = useState(initial)
  const [error, setError] = useState('')
  const { network, setNetworkId, networks } = useNetwork()
  const navigate = useNavigate()
  const large = size === 'lg'

  function submit(event) {
    event.preventDefault()
    const next = value.trim()
    if (!isAddress(next)) {
      setError('Use a 42-character EVM address starting with 0x.')
      return
    }
    setError('')
    navigate(`/investigate/${next}`)
  }

  return (
    <form onSubmit={submit} className="w-full">
      <div
        className={cn(
          'flex flex-col border border-line bg-raised md:flex-row md:items-stretch',
          large && 'wa-glow',
        )}
      >
        <label className="sr-only" htmlFor={`${id}-network`}>
          Chain
        </label>
        <select
          id={`${id}-network`}
          value={network.id}
          onChange={(event) => setNetworkId(event.target.value)}
          className="border-b border-line bg-transparent px-4 py-3 text-[12px] text-quiet md:w-40 md:border-b-0 md:border-r"
        >
          {networks.map((item) => (
            <option key={item.id} value={item.id} disabled={!item.enabled}>
              {item.label}
              {item.enabled ? '' : ' · soon'}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor={id}>
          Wallet or contract address
        </label>
        <input
          id={id}
          value={value}
          onChange={(event) => {
            setValue(event.target.value)
            if (error) setError('')
          }}
          autoFocus={autoFocus}
          spellCheck="false"
          autoComplete="off"
          placeholder="Paste a wallet or contract address"
          className={cn(
            'min-w-0 flex-1 bg-transparent px-4 py-3 text-ink placeholder:text-faint',
            large ? 'wa-mono text-[15px] md:text-base' : 'wa-mono text-sm',
          )}
        />
        <div className="border-t border-line p-2 md:border-t-0 md:border-l">
          <Button type="submit" className="w-full md:w-auto">
            Investigate
          </Button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-quiet">
        <span>
          Example format:{' '}
          <span className="wa-mono text-faint">0x…</span>
        </span>
        <button
          type="button"
          className="wa-mono text-scan hover:text-ink"
          onClick={() => {
            setValue(DEMO_ADDRESS)
            setError('')
          }}
        >
          {DEMO_ADDRESS.slice(0, 8)}…sample
        </button>
        {error ? <span className="text-critical">{error}</span> : null}
      </div>
    </form>
  )
}
