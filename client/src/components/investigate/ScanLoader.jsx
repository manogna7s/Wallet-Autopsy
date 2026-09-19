import { useEffect, useState } from 'react'
import { SCAN_STAGES } from '../../lib/stages'

export function ScanLoader({ address }) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setStep(SCAN_STAGES.length - 1)
      return undefined
    }
    const id = window.setInterval(() => {
      setStep((current) => (current < SCAN_STAGES.length - 1 ? current + 1 : current))
    }, 420)
    return () => window.clearInterval(id)
  }, [])

  const progress = ((step + 1) / SCAN_STAGES.length) * 100

  return (
    <div className="relative overflow-hidden border-y border-line py-16 md:py-20" id="stage-scan" role="status" aria-live="polite" aria-busy="true">
      <div className="wa-scan-bar pointer-events-none absolute inset-x-0 top-0 h-px bg-scan" />
      <p className="wa-kicker">Scanning ledger</p>
      <h2 className="wa-display mt-3 text-4xl md:text-5xl">Investigating address</h2>
      <p className="wa-mono mt-4 text-sm text-quiet break-all">{address}</p>

      <div className="mt-8 h-px w-full bg-line">
        <div
          className="h-px bg-scan transition-[width] duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <ol className="mt-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {SCAN_STAGES.map((label, index) => {
          const active = index === step
          const done = index < step
          return (
            <li
              key={label}
              className={
                active ? 'text-sm text-ink' : done ? 'text-sm text-quiet' : 'text-sm text-faint'
              }
            >
              <span className="wa-kicker mr-2">{String(index + 1).padStart(2, '0')}</span>
              {label}
              {active ? (
                <span className="sr-only"> in progress</span>
              ) : done ? (
                <span className="sr-only"> complete</span>
              ) : null}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
