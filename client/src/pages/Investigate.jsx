import { useSearchParams } from 'react-router-dom'
import { AddressSearch } from '../components/search/AddressSearch'
import { DataBadge } from '../components/ui/Badge'

export function InvestigatePage() {
  const [params] = useSearchParams()
  const q = params.get('q') || ''

  return (
    <div className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-24">
      <DataBadge>Ethereum mainnet</DataBadge>
      <p className="wa-kicker mt-6">Investigate</p>
      <h1 className="wa-display mt-3 text-5xl md:text-6xl">Open the ledger.</h1>
      <p className="mt-5 max-w-lg text-sm text-quiet">
        Enter an Ethereum address. The API fetches transfers and detectable approvals from Alchemy,
        then this view shows only what came back.
      </p>
      <div className="mt-12">
        <AddressSearch initial={q} autoFocus />
      </div>
    </div>
  )
}
