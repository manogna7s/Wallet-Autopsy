import { Link, useParams } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useInvestigation } from '../hooks/useInvestigation'
import { useSavedInvestigation } from '../hooks/useSavedInvestigation'
import { useWatchlist } from '../context/WatchlistContext'
import { useHistoryLog } from '../context/HistoryContext'
import { DataBadge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { EmptyState, ErrorState } from '../components/ui/EmptyState'
import { ScanLoader } from '../components/investigate/ScanLoader'
import { StageRail } from '../components/investigate/StageRail'
import { RiskOverview } from '../components/investigate/RiskOverview'
import { RiskPath } from '../components/investigate/RiskPath'
import { SignalList } from '../components/investigate/SignalList'
import { Timeline } from '../components/investigate/Timeline'
import { RelationshipGraph } from '../components/investigate/RelationshipGraph'
import { SigningSafety } from '../components/investigate/SigningSafety'
import { ActivityChart } from '../components/investigate/ActivityChart'
import { AiInvestigation } from '../components/investigate/AiInvestigation'
import { useAiInvestigation } from '../hooks/useAiInvestigation'
import { HexInspect } from '../components/investigate/NodePanel'
import { shorten } from '../data/mock'
import { addressExplorerUrl } from '../lib/explorer'
import { formatDate, formatNumber } from '../lib/format'
import { EMPTY_ACTIVITY, investigationErrorCopy } from '../lib/errorCopy'
import { useStageObserver } from '../hooks/useStageObserver'

export function InvestigationPage() {
  const { address, id } = useParams()
  const live = useInvestigation(id ? null : address)
  const saved = useSavedInvestigation(id)
  const { status, data, error } = id ? saved : live
  const { isWatched, watch, unwatch } = useWatchlist()
  const { record, refresh } = useHistoryLog()
  const watched = isWatched(data?.address || address)
  const ai = useAiInvestigation(status === 'ready' ? data : null)
  const checkpointRef = useRef(null)
  const [inspectHash, setInspectHash] = useState(null)

  useEffect(() => {
    setInspectHash(data?.defaultInspectHash || null)
  }, [data?.id, data?.address, data?.defaultInspectHash])

  function inspectTransaction(hash) {
    if (!hash) return
    setInspectHash(hash)
    checkpointRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  useEffect(() => {
    if (status !== 'ready' || !data || data.source === 'history') return
    record({
      id: data.id,
      address: data.address,
      network: data.network,
      networkLabel: data.networkLabel,
      eventCount: data.eventCount,
      empty: data.empty,
      riskScore: data.risk?.score,
      severity: data.risk?.severity,
      investigatedAt: data.investigatedAt,
    })
    if (data.persisted) refresh()
  }, [status, data, record, refresh])

  const available = useMemo(() => {
    if (status === 'loading' || status === 'idle') return ['search', 'scan']
    if (status === 'error' || !data) return ['search']
    if (data.empty) return ['search', 'scan', 'activity', 'signals', 'ai']
    return [
      'search',
      'scan',
      'activity',
      'signals',
      'evidence',
      'graph',
      'ai',
      data.ledger?.length ? 'sign' : null,
    ].filter(Boolean)
  }, [status, data])

  const stageFallback =
    status === 'loading' || status === 'idle' || status === 'error' || !data ? 'scan' : 'activity'
  const stage = useStageObserver(stageFallback, available)

  if (status === 'loading' || status === 'idle') {
    return (
      <div className="mx-auto max-w-6xl px-5 py-10 md:px-8 md:py-16">
        <StageRail current="scan" available={available} />
        <div className="mt-8">
          <ScanLoader address={address || data?.address || 'Saved investigation'} />
        </div>
      </div>
    )
  }

  if (status === 'error' || !data) {
    const copy = investigationErrorCopy(error)
    return (
      <div className="mx-auto max-w-6xl px-5 py-10 md:px-8 md:py-16">
        <StageRail current="scan" available={available} />
        <div className="mt-10">
          <ErrorState title={copy.title} body={copy.body} onRetry={() => window.location.reload()} />
          <Button as={Link} to="/investigate" variant="secondary" className="mt-8">
            Back to search
          </Button>
        </div>
      </div>
    )
  }

  if (data.empty) {
    return (
      <div className="mx-auto max-w-6xl px-5 pb-20 pt-10 md:px-8 md:pt-14">
        <StageRail current={stage} available={available} />
        <div className="mt-8">
          <DataBadge>Ethereum mainnet</DataBadge>
        </div>
        {data.risk ? (
          <section id="stage-signals" className="mt-10 scroll-mt-40">
            <RiskOverview risk={data.risk} />
          </section>
        ) : null}
        <section id="stage-ai" className="mt-12 scroll-mt-40">
          <AiInvestigation status={ai.status} report={ai.report} error={ai.error} />
        </section>
        <section id="stage-activity" className="mt-10 scroll-mt-40">
          <EmptyState kicker={shorten(data.address, 6)} title={EMPTY_ACTIVITY.title} body={EMPTY_ACTIVITY.body} />
        </section>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-5 pb-24 pt-8 md:px-8 md:pt-12">
      <StageRail current={stage} available={available} />

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <DataBadge>
          {data.source === 'history'
            ? 'Saved investigation'
            : data.cached
              ? 'Cached Alchemy snapshot'
              : 'Alchemy · live fetch'}
        </DataBadge>
        {data.persisted ? <DataBadge>Stored</DataBadge> : null}
        {data.truncated ? <DataBadge>Truncated history</DataBadge> : null}
      </div>
      {data.notices.length ? (
        <p className="mt-4 text-[12px] text-quiet">{data.notices[0]}</p>
      ) : null}

      <header className="mt-8 grid gap-6 border-y border-line py-7 sm:grid-cols-2 lg:grid-cols-4">
        <Meta
          label="Address"
          value={
            <HexInspect
              value={data.address}
              href={addressExplorerUrl(data.network, data.address)}
              chars={6}
              copyable
              className="text-base text-ink"
            />
          }
        />
        <Meta label="Network" value={data.networkLabel} />
        <Meta label="Status" value={data.statusLabel} />
        <div>
          <p className="wa-kicker">Watchlist</p>
          <Button
            className="mt-2"
            variant={watched ? 'danger' : 'secondary'}
            aria-pressed={watched}
            onClick={() =>
              watched
                ? unwatch(data.address)
                : watch({
                    address: data.address,
                    network: data.network,
                    riskScore: data.risk?.score,
                  })
            }
          >
            {watched ? 'Unwatch' : 'Watch'}
          </Button>
        </div>
      </header>

      <section id="stage-activity" className="mt-14 scroll-mt-40">
        <p className="wa-kicker">Activity found</p>
        <h2 className="wa-display mt-2 text-3xl">Fetched window</h2>
        <dl className="mt-7 grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4">
          <Stat label="Events" value={formatNumber(data.eventCount)} />
          <Stat label="Counterparties" value={formatNumber(data.counterparties)} />
          <Stat label="First seen" value={formatDate(data.firstSeen)} />
          <Stat label="Last active" value={formatDate(data.lastActive)} />
        </dl>
        {data.activity.length ? (
          <div className="mt-8 border-t border-line pt-6">
            <ActivityChart data={data.activity} />
          </div>
        ) : null}
      </section>

      {data.risk ? (
        <section id="stage-signals" className="mt-16 scroll-mt-40">
          <RiskOverview risk={data.risk} />
          {data.signals.length ? (
            <div className="mt-12">
              <SignalList signals={data.signals} chain={data.network} />
            </div>
          ) : null}
        </section>
      ) : null}

      <section id="stage-evidence" className="mt-16 scroll-mt-40">
        {data.timeline.length ? (
          <Timeline events={data.timeline} chain={data.network} onInspect={inspectTransaction} />
        ) : null}
      </section>

      <section id="stage-graph" className="mt-16 scroll-mt-40">
        <RiskPath path={data.riskPath} summary={data.forensic} chain={data.network} />
        {data.graph?.nodes?.length ? (
          <div className="mt-12">
            <RelationshipGraph graph={data.graph} chain={data.network} />
          </div>
        ) : null}
      </section>

      <section id="stage-ai" className="mt-16 scroll-mt-40">
        <AiInvestigation status={ai.status} report={ai.report} error={ai.error} />
      </section>

      {data.ledger?.length ? (
        <section id="stage-sign" ref={checkpointRef} className="mt-20 scroll-mt-40">
          <SigningSafety
            address={data.address}
            chain={data.network}
            ledger={data.ledger}
            inspectable={data.inspectable}
            selectedHash={inspectHash || data.defaultInspectHash}
            onSelect={inspectTransaction}
          />
        </section>
      ) : null}
    </div>
  )
}

function Meta({ label, value }) {
  return (
    <div>
      <p className="wa-kicker">{label}</p>
      <div className="mt-2 text-lg">{value}</div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div>
      <dt className="text-[11px] tracking-[0.14em] text-faint uppercase">{label}</dt>
      <dd className="mt-1 text-sm tabular-nums">{value}</dd>
    </div>
  )
}
