import { SeverityMark } from '../ui/Badge'
import { shorten } from '../../data/mock'

export function SigningSafety({ preview }) {
  const rows = [
    { label: 'Transaction', value: preview.transaction },
    {
      label: 'Spender',
      value: preview.spender ? shorten(preview.spender, 5) : 'Unknown',
    },
    {
      label: 'Token',
      value: preview.tokenAddress
        ? `${preview.token} · ${shorten(preview.tokenAddress, 4)}`
        : preview.token,
    },
    { label: 'Allowance', value: preview.allowance },
  ]

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="wa-kicker">Phase 7</p>
          <h2 className="wa-display mt-2 text-3xl">Before you sign</h2>
          <p className="mt-3 max-w-xl text-sm text-quiet">
            Transaction security preview. This is not a wallet connection and cannot send funds.
          </p>
        </div>
      </div>

      <div className="grid gap-8 border-y border-line py-8 md:grid-cols-[1fr_220px]">
        <dl className="grid gap-6 sm:grid-cols-2">
          {rows.map((row) => (
            <div key={row.label}>
              <dt className="wa-kicker">{row.label}</dt>
              <dd className="wa-mono mt-2 text-sm">{row.value}</dd>
            </div>
          ))}
        </dl>
        <div>
          <p className="wa-kicker mb-3">Risk signals</p>
          <ul className="space-y-3">
            {preview.signals.map((item) => (
              <li key={item} className="flex items-center gap-3 text-[13px] text-quiet">
                <SeverityMark severity={item.includes('Unlimited') ? 'high' : 'info'} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
