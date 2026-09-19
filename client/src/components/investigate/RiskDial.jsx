import { useAnimatedNumber } from '../../hooks/useAnimatedNumber'
import { riskTone } from '../../lib/format'

export function RiskDial({ score, band, summary }) {
  const shown = useAnimatedNumber(score)
  const display = Math.round(shown)
  const tone = riskTone(score)
  const radius = 78
  const circ = 2 * Math.PI * radius
  const offset = circ - (Math.min(100, Math.max(0, shown)) / 100) * circ

  return (
    <div className="flex flex-col items-center text-center">
      <div
        role="meter"
        aria-label="Wallet Autopsy Risk Model score"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={display}
        className="relative flex h-[200px] w-[200px] items-center justify-center sm:h-[220px] sm:w-[220px]"
      >
        <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="90" cy="90" r={radius} fill="none" stroke="var(--wa-inset)" strokeWidth="6" />
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke={`var(--wa-${tone})`}
            strokeWidth="6"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="butt"
            style={{ transition: 'stroke-dashoffset 700ms cubic-bezier(0.22, 1, 0.36, 1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="wa-display text-6xl leading-none tabular-nums">{display}</span>
          <span className="wa-kicker mt-2" style={{ color: `var(--wa-${tone})` }}>
            Risk
          </span>
        </div>
      </div>
      <p className="mt-5 text-sm text-quiet">{band}</p>
      <p className="mt-1 max-w-xs text-[13px] text-faint">{summary}</p>
    </div>
  )
}
