import { INVESTIGATION_STAGES } from '../../lib/stages'
import { cn } from '../../lib/format'

export function StageRail({ current, available = [] }) {
  const ready = new Set(available)

  return (
    <nav
      aria-label="Investigation sequence"
      className="sticky top-[53px] z-20 -mx-5 border-y border-line bg-canvas/95 px-5 backdrop-blur-sm md:-mx-8 md:px-8"
    >
      <ol className="flex flex-wrap gap-x-5 gap-y-3 py-3.5">
        {INVESTIGATION_STAGES.map((stage, index) => {
          const isCurrent = stage.id === current
          const isReady = ready.has(stage.id)
          const href =
            stage.id === 'search'
              ? '/investigate'
              : isReady && stage.id !== 'scan'
                ? `#stage-${stage.id}`
                : undefined
          const Tag = href ? 'a' : 'span'
          return (
            <li key={stage.id} className="min-w-0">
              <Tag
                href={href}
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'block text-[11px] tracking-[0.14em] uppercase transition',
                  isCurrent ? 'text-ink' : isReady ? 'text-quiet hover:text-ink' : 'text-faint',
                )}
              >
                <span className="text-[10px] text-faint">
                  {String(index + 1).padStart(2, '0')}
                  {index < INVESTIGATION_STAGES.length - 1 ? ' ↓' : ''}
                </span>
                <span
                  className={cn(
                    'mt-1 block border-b pb-0.5',
                    isCurrent ? 'border-accent' : 'border-transparent',
                  )}
                >
                  {stage.label}
                </span>
              </Tag>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
