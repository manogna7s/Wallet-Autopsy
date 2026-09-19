import { RiskDial } from './RiskDial'
import { SeverityMark } from '../ui/Badge'
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber'
import { toneFor as severityTone } from '../../lib/format'

export function RiskOverview({ risk }) {
  if (!risk) return null
  const confidencePct = risk.confidence?.score != null ? Math.round(risk.confidence.score * 100) : null
  const breakdown = risk.scoreBreakdown || []
  const total = breakdown.reduce((sum, row) => sum + (Number(row.delta) || 0), 0) || 1

  return (
    <section className="border-y border-line py-10">
      <p className="wa-kicker">Risk signals</p>
      <p className="mt-2 text-[12px] text-quiet">
        {risk.model || 'Wallet Autopsy Risk Model'} · not an industry standard
      </p>
      <div className="mt-6 grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
        <RiskDial
          score={risk.score}
          band={risk.severityLabel || risk.severity}
          summary={risk.summary}
        />
        <div>
          <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            <Stat label="Score" value={<AnimatedStat value={risk.score} />} />
            <Stat label="Severity" value={<SeverityMark severity={severityTone(risk.severity)} />} />
            <Stat label="Signals" value={<AnimatedStat value={risk.signalCount} />} />
            <Stat
              label="Confidence"
              value={confidencePct == null ? '—' : `${confidencePct}%`}
            />
          </dl>
          <p className="wa-kicker mt-8">Why this score exists</p>
          {breakdown.length ? (
            <>
              <div className="mt-3 flex h-1.5 w-full overflow-hidden bg-inset" role="img" aria-label="Score composition by contributing signal">
                {breakdown.map((row) => (
                  <span
                    key={row.signalId}
                    className="h-full"
                    style={{
                      width: `${Math.max(4, ((Number(row.delta) || 0) / total) * 100)}%`,
                      background: `var(--wa-${severityTone(row.severity || risk.severity)})`,
                    }}
                  />
                ))}
              </div>
              <ul className="mt-5 divide-y divide-line border-y border-line">
                {breakdown.map((row) => {
                  const title = risk.signals?.find((signal) => signal.id === row.signalId)?.title || row.type
                  return (
                    <li key={row.signalId} className="wa-row flex gap-3 py-2.5 text-[13px] text-quiet">
                      <span className="wa-mono w-10 shrink-0 text-accent">+{row.delta}</span>
                      <span>{title}</span>
                    </li>
                  )
                })}
              </ul>
            </>
          ) : (
            <p className="mt-3 text-sm text-quiet">No scored signals in this window.</p>
          )}
        </div>
      </div>
    </section>
  )
}

function AnimatedStat({ value }) {
  const shown = useAnimatedNumber(value)
  return <span className="tabular-nums">{Math.round(shown)}</span>
}

function Stat({ label, value }) {
  return (
    <div>
      <dt className="text-[11px] tracking-[0.14em] text-faint uppercase">{label}</dt>
      <dd className="mt-1 text-sm">{value}</dd>
    </div>
  )
}
