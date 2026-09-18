import { useEffect, useState } from 'react'
import { getHealth } from '../../api/client'

export function StatusPill() {
  const [state, setState] = useState({ status: 'checking', label: 'API', ok: false })

  useEffect(() => {
    getHealth()
      .then((payload) => {
        if (payload?.alchemy?.configured) {
          setState({ status: 'live', label: 'Ethereum', ok: true })
        } else {
          setState({ status: 'warn', label: 'No Alchemy', ok: false })
        }
      })
      .catch(() => {
        setState({ status: 'down', label: 'API down', ok: false })
      })
  }, [])

  const color =
    state.status === 'live' ? 'bg-accent' : state.status === 'warn' ? 'bg-medium' : 'bg-critical'

  return (
    <div className="flex items-center gap-2 pl-1 text-[11px] tracking-[0.12em] text-quiet uppercase">
      <span className={`h-1.5 w-1.5 rounded-full ${color} ${state.ok ? 'wa-status-dot' : ''}`} aria-hidden="true" />
      {state.label}
    </div>
  )
}
