export function ScanLoader({ address }) {
  return (
    <div className="relative overflow-hidden border-y border-line py-20" aria-live="polite" aria-busy="true">
      <div className="wa-scan-bar pointer-events-none absolute inset-x-0 top-0 h-px bg-scan" />
      <p className="wa-kicker">Scanning ledger</p>
      <h2 className="wa-display mt-3 text-4xl md:text-5xl">Investigating address</h2>
      <p className="wa-mono mt-4 text-sm text-quiet">{address}</p>
      <p className="mt-6 max-w-md text-sm text-quiet">Fetching activity, then scoring it. Nothing invented.</p>
    </div>
  )
}
