import { RiskDial } from './RiskDial'
import { SeverityMark } from '../ui/Badge'

export function RiskOverview({ risk }) {
  if (!risk) return null
  const confidencePct = risk.confidence?.score != null ? Math.round(risk.confidence.score * 100) : null

  return (
    <section className="grid gap-10 border-y border-line py-10 lg:grid-cols-[220px_minmax(0,1fr)]">
      <RiskDial
        score={risk.score}
        band={risk.severityLabel || risk.severity}
        summary={risk.summary}
      />
      <div>
        <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <Stat label="Score" value={String(risk.score)} />
          <Stat label="Severity" value={<SeverityMark severity={toneFor(risk.severity)} />} />
          <Stat label="Signals" value={String(risk.signalCount)} />
          <Stat
            label="Confidence"
            value={confidencePct == null ? '—' : `${confidencePct}%`}
          />
        </dl>
        {risk.scoreBreakdown.length ? (
          <ul className="mt-8 space-y-2">
            {risk.scoreBreakdown.map((row) => {
              const title = risk.signals?.find((signal) => signal.id === row.signalId)?.title || row.type
              return (
                <li key={row.signalId} className="flex gap-3 text-[13px] text-quiet">
                  <span className="wa-mono w-10 shrink-0 text-accent">+{row.delta}</span>
                  <span>{title}</span>
                </li>
              )
            })}
          </ul>
        ) : null}
      </div>
    </section>
  )
}

function Stat({ label, value }) {
  return (
    <div>
      <dt className="text-[11px] tracking-[0.14em] text-faint uppercase">{label}</dt>
      <dd className="mt-1 text-sm">{value}</dd>
    </div>
  )
}

function toneFor(severity) {
  if (severity === 'elevated') return 'high'
  if (severity === 'moderate') return 'medium'
  return severity || 'info'
}
