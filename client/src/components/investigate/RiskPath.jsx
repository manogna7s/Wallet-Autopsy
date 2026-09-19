import { formatNumber } from '../../lib/format'
import { HexInspect } from './NodePanel'
import { addressExplorerUrl } from '../../lib/explorer'

export function RiskPath({ path, summary, chain = 'ethereum' }) {
  const steps = path?.steps || []
  const empty = !path || path.empty || steps.length < 2

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="wa-kicker">Relationship</p>
          <h2 className="wa-display mt-2 text-3xl">Detected path</h2>
        </div>
        {summary?.items?.length ? (
          <p className="text-[13px] text-quiet">
            {summary.items.map((item) => `${formatNumber(item.value)} ${item.label}`).join(' · ')}
          </p>
        ) : null}
      </div>

      {empty ? (
        <p className="mt-6 text-sm text-quiet">No chained relationship in this window.</p>
      ) : (
        <ol className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-3 border-y border-line py-5">
          {steps.map((step, index) => (
            <li key={step.id} className="flex items-center gap-4">
              <div>
                <p className="wa-kicker">{step.kicker}</p>
                <p className="mt-1 text-sm">{step.label}</p>
                {step.address ? (
                  <p className="mt-1">
                    <HexInspect
                      value={step.address}
                      href={addressExplorerUrl(chain, step.address)}
                      chars={4}
                    />
                  </p>
                ) : null}
              </div>
              {index < steps.length - 1 ? (
                <span className="text-[11px] tracking-[0.18em] text-scan uppercase" aria-hidden="true">
                  →
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
