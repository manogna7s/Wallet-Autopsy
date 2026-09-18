export function InvestigationReport({ report }) {
  return (
    <article>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="wa-kicker">Investigation summary</p>
          <h2 className="wa-display mt-2 text-3xl md:text-4xl">What the evidence shows</h2>
        </div>
        <span className="border border-line px-2 py-0.5 text-[10px] font-semibold tracking-[0.16em] text-quiet uppercase">
          AI brief · engine-bound
        </span>
      </div>

      <p className="wa-display max-w-3xl text-2xl leading-snug text-ink md:text-[1.85rem]">
        {report.summary}
      </p>
      {report.source === 'fallback' ? (
        <p className="mt-4 text-[12px] text-quiet">
          This copy is assembled from the mock engine snapshot. Gemini is not connected in visual
          development.
        </p>
      ) : null}

      <Section title="Key findings" items={report.keyFindings} />
      <Section title="What's driving the risk?" items={report.drivingRisk} />
      <Section title="Evidence" items={report.evidence} mono />
      <Copy title="What happened" body={report.whatHappened} />
      <Copy title="What it could expose" body={report.exposure} />
      <Section title="What to check next" items={report.checkNext} />
    </article>
  )
}

function Section({ title, items, mono }) {
  return (
    <section className="mt-10 border-t border-line pt-6">
      <h3 className="wa-kicker">{title}</h3>
      <ul className="mt-4 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-sm text-quiet">
            <span className="mt-2 h-px w-3 shrink-0 bg-faint" aria-hidden="true" />
            <span className={mono ? 'wa-mono text-[12px] leading-relaxed' : 'leading-relaxed'}>
              {item}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Copy({ title, body }) {
  return (
    <section className="mt-10 border-t border-line pt-6">
      <h3 className="wa-kicker">{title}</h3>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-quiet">{body}</p>
    </section>
  )
}
