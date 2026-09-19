import { DataBadge } from '../ui/Badge'
import { Skeleton } from '../ui/Skeleton'

const FALLBACK_NOTE = {
  not_configured: 'AI explanation unavailable. Deterministic findings are still available.',
  timeout: 'AI explanation unavailable. Deterministic findings are still available.',
  api_failure: 'AI explanation unavailable. Deterministic findings are still available.',
  malformed: 'AI explanation unavailable. Deterministic findings are still available.',
  missing_findings: 'AI explanation unavailable. Deterministic findings are still available.',
}

export function AiInvestigation({ status, report, error: _error, mode = 'investigation' }) {
  const signing = mode === 'signing'
  return (
    <article>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="wa-kicker">{signing ? 'Investigate before signing' : 'AI investigation'}</p>
          <h2 className="wa-display mt-2 text-3xl">
            {signing ? 'What this interaction means' : 'What the evidence shows'}
          </h2>
        </div>
        <DataBadge>
          {report?.source === 'gemini' ? 'Gemini · engine-bound' : 'Template · engine-bound'}
        </DataBadge>
      </div>

      <p className="text-[12px] text-quiet">Generated from verified on-chain findings</p>
      {report?.source === 'fallback' && FALLBACK_NOTE[report.fallbackReason] ? (
        <p className="mt-1 text-[12px] text-faint">{FALLBACK_NOTE[report.fallbackReason]}</p>
      ) : null}

      {status === 'loading' ? <LoadingCopy /> : null}

      {status === 'error' ? (
        <p className="mt-6 max-w-2xl text-sm text-quiet">
          AI explanation unavailable. Deterministic findings are still available.
        </p>
      ) : null}

      {status === 'ready' && report ? <ReportBody report={report} signing={signing} /> : null}
    </article>
  )
}

function ReportBody({ report, signing }) {
  return (
    <div className="mt-6">
      <p className="max-w-3xl text-[15px] leading-relaxed text-ink">{report.summary}</p>

      <Block title={signing ? 'What the transaction does' : 'Finding'} items={report.keyFindings} />
      <Block title={signing ? 'Evidence' : 'Evidence'} items={report.evidenceExplanation} />
      <Block title={signing ? 'Why it was flagged' : 'Why it matters'} items={report.whyItMatters} />
      <Block title={signing ? 'Permission and asset' : 'Potential exposure'} items={report.potentialExposure} />
      <Block title={signing ? 'What to verify' : 'What to check'} items={report.whatToCheck} />

      {report.uncertainty ? (
        <section className="mt-8 border-t border-line pt-5">
          <h3 className="wa-kicker">Uncertainty</h3>
          <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-faint">{report.uncertainty}</p>
        </section>
      ) : null}
    </div>
  )
}

function Block({ title, items }) {
  if (!items?.length) return null
  return (
    <section className="mt-8 border-t border-line pt-5">
      <h3 className="wa-kicker">{title}</h3>
      <ul className="mt-3 space-y-2">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="flex gap-3 text-sm text-quiet">
            <span className="mt-2 h-px w-3 shrink-0 bg-faint" aria-hidden="true" />
            <span className="leading-relaxed break-all">{item}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function LoadingCopy() {
  return (
    <div className="mt-8 space-y-4" aria-busy="true">
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-3/5" />
      <Skeleton className="h-24 w-full" />
    </div>
  )
}
