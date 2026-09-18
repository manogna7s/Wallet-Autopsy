import { Button } from './Button'

export function EmptyState({ kicker = 'Empty', title, body, action }) {
  return (
    <div className="border-y border-line py-16">
      {kicker ? <p className="wa-kicker mb-3">{kicker}</p> : null}
      <h2 className="wa-display text-3xl md:text-4xl">{title}</h2>
      {body ? <p className="mt-4 max-w-lg text-sm text-quiet">{body}</p> : null}
      {action ? <div className="mt-8">{action}</div> : null}
    </div>
  )
}

export function ErrorState({ title = 'Investigation failed', body, onRetry }) {
  return (
    <div className="border border-critical/30 bg-critical/5 px-6 py-10">
      <p className="wa-kicker text-critical">Error</p>
      <h2 className="wa-display mt-2 text-3xl">{title}</h2>
      {body ? <p className="mt-3 max-w-lg text-sm text-quiet">{body}</p> : null}
      {onRetry ? (
        <Button className="mt-6" variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  )
}
