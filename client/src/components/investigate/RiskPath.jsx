import { shorten } from '../../data/mock'
import { cn, formatNumber } from '../../lib/format'

export function RiskPath({ path, summary }) {
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
        <ol className="mt-8 flex flex-wrap items-stretch gap-2">
          {steps.map((step, index) => (
            <li key={step.id} className="flex items-stretch gap-2">
              <div
                className={cn(
                  'min-w-[148px] border bg-raised px-4 py-3',
                  step.kind === 'flagged' ? 'border-critical/40' : 'border-line',
                )}
              >
                <p className="wa-kicker">{step.kicker}</p>
                <p className="mt-1 text-sm">{step.label}</p>
                {step.address ? (
                  <p className="wa-mono mt-1 text-[11px] text-faint">{shorten(step.address, 4)}</p>
                ) : null}
              </div>
              {index < steps.length - 1 ? (
                <span className="flex items-center text-[11px] tracking-[0.18em] text-scan uppercase">
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
