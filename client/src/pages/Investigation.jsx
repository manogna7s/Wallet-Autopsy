import { Link, useParams } from 'react-router-dom'
import { useEffect } from 'react'
import { useInvestigation } from '../hooks/useInvestigation'
import { useWatchlist } from '../context/WatchlistContext'
import { useHistoryLog } from '../context/HistoryContext'
import { DataBadge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { EmptyState, ErrorState } from '../components/ui/EmptyState'
import { ScanLoader } from '../components/investigate/ScanLoader'
import { RiskOverview } from '../components/investigate/RiskOverview'
import { RiskPath } from '../components/investigate/RiskPath'
import { SignalList } from '../components/investigate/SignalList'
import { Timeline } from '../components/investigate/Timeline'
import { RelationshipGraph } from '../components/investigate/RelationshipGraph'
import { SigningSafety } from '../components/investigate/SigningSafety'
import { ActivityChart } from '../components/investigate/ActivityChart'
import { shorten } from '../data/mock'
import { formatDate, formatNumber } from '../lib/format'

export function InvestigationPage() {
  const { address } = useParams()
  const { status, data, error } = useInvestigation(address)
  const { isWatched, watch, unwatch } = useWatchlist()
  const { record } = useHistoryLog()
  const watched = isWatched(address)

  useEffect(() => {
    if (status !== 'ready' || !data) return
    record({
      address: data.address,
      network: data.network,
      networkLabel: data.networkLabel,
      eventCount: data.eventCount,
      empty: data.empty,
      riskScore: data.risk?.score,
      severity: data.risk?.severity,
    })
  }, [status, data, record])

  if (status === 'loading' || status === 'idle') {
    return (
      <div className="mx-auto max-w-6xl px-5 py-16 md:px-8">
        <ScanLoader address={address} />
      </div>
    )
  }

  if (status === 'error' || !data) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-16 md:px-8">
        <ErrorState
          title="Investigation failed"
          body={error?.message || 'Unknown address format.'}
        />
        <Button as={Link} to="/investigate" variant="secondary" className="mt-8">
          Back to search
        </Button>
      </div>
    )
  }

  if (data.empty) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-16 md:px-8">
        <DataBadge>Ethereum mainnet</DataBadge>
        {data.risk ? (
          <div className="mt-10">
            <RiskOverview risk={data.risk} />
          </div>
        ) : null}
        <div className="mt-10">
          <EmptyState
            kicker={shorten(data.address, 6)}
            title="No activity in the fetched window."
            body="No transfers or approvals in the fetched window. Score 0."
            action={
              <Button as={Link} to="/investigate" variant="secondary">
                Try another address
              </Button>
            }
          />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-5 pb-24 pt-10 md:px-8 md:pt-14">
      <div className="flex flex-wrap items-center gap-3">
        <DataBadge>{data.cached ? 'Cached Alchemy snapshot' : 'Alchemy · live fetch'}</DataBadge>
        {data.truncated ? <DataBadge>Truncated history</DataBadge> : null}
      </div>
      {data.notices.length ? (
        <p className="mt-4 text-[12px] text-quiet">{data.notices[0]}</p>
      ) : null}

      <header className="mt-8 grid gap-8 border-y border-line py-8 md:grid-cols-3">
        <Meta label="Address" value={shorten(data.address, 6)} mono title={data.address} />
        <Meta label="Network" value={data.networkLabel} />
        <Meta label="Status" value={data.statusLabel} />
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button
          variant={watched ? 'danger' : 'secondary'}
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

      {data.risk ? (
        <div className="mt-10">
          <RiskOverview risk={data.risk} />
        </div>
      ) : null}

      <section className="mt-12">
        <RiskPath path={data.riskPath} summary={data.forensic} />
      </section>

      <section className="mt-12">
        {data.graph?.nodes?.length ? <RelationshipGraph graph={data.graph} chain={data.network} /> : null}
      </section>

      <section className="mt-16">
        {data.timeline.length ? <Timeline events={data.timeline} /> : null}
      </section>

      {data.signals.length ? (
        <section className="mt-16">
          <SignalList signals={data.signals} />
        </section>
      ) : null}

      <section className="mt-16">
        <p className="wa-kicker">Activity</p>
        <dl className="mt-6 grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4">
          <Stat label="Events" value={formatNumber(data.eventCount)} />
          <Stat label="Counterparties" value={formatNumber(data.counterparties)} />
          <Stat label="First seen" value={formatDate(data.firstSeen)} />
          <Stat label="Last active" value={formatDate(data.lastActive)} />
        </dl>
        {data.activity.length ? (
          <div className="mt-8">
            <ActivityChart data={data.activity} />
          </div>
        ) : null}
      </section>

      {data.preview ? (
        <section className="mt-20">
          <SigningSafety preview={data.preview} />
        </section>
      ) : null}
    </div>
  )
}

function Meta({ label, value, mono, title }) {
  return (
    <div>
      <p className="wa-kicker">{label}</p>
      <p className={`mt-2 text-lg ${mono ? 'wa-mono text-base' : ''}`} title={title}>
        {value}
      </p>
    </div>
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
