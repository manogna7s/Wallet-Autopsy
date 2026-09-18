import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { AddressSearch } from '../components/search/AddressSearch'
import { HeroGraph } from '../components/landing/HeroGraph'
import { DEMO_ADDRESS } from '../data/mock'
import { DataBadge } from '../components/ui/Badge'

const STEPS = [
  { n: '01', label: 'Address' },
  { n: '02', label: 'Ledger' },
  { n: '03', label: 'Signals' },
  { n: '04', label: 'Graph' },
  { n: '05', label: 'Evidence' },
]

export function OverviewPage() {
  return (
    <div>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-14 md:grid-cols-[1.05fr_0.95fr] md:px-8 md:pt-20 md:pb-20">
        <div>
          <DataBadge>Ethereum mainnet</DataBadge>
          <h1 className="wa-display mt-6 max-w-xl text-[3.1rem] leading-[0.92] md:text-[5.4rem]">
            Don&apos;t trust an address.
            <span className="mt-2 block italic text-quiet">Investigate it.</span>
          </h1>
          <p className="mt-8 max-w-md text-[15px] leading-relaxed text-quiet">
            Trace wallet behavior, uncover suspicious relationships, and understand the evidence
            before you interact.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button as={Link} to="/investigate">
              Investigate an Address
            </Button>
            <Button as={Link} to={`/investigate/${DEMO_ADDRESS}`} variant="secondary">
              Investigate a known address
            </Button>
          </div>
        </div>
        <div className="border border-line bg-raised/40">
          <p className="wa-kicker px-4 pt-3">Illustration · not live graph data</p>
          <HeroGraph />
        </div>
      </section>

      <section className="border-y border-line">
        <div className="mx-auto max-w-6xl px-5 py-10 md:px-8">
          <p className="wa-kicker mb-8">How an investigation moves</p>
          <ol className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
            {STEPS.map((step, index) => (
              <li key={step.n}>
                <p className="text-[10px] tracking-[0.18em] text-faint uppercase">
                  {step.n}
                  {index < STEPS.length - 1 ? ' →' : ''}
                </p>
                <p className="mt-2 text-sm text-quiet">{step.label}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8">
        <p className="wa-kicker">Open a specimen</p>
        <h2 className="wa-display mt-3 text-4xl md:text-5xl">Paste a wallet or contract.</h2>
        <div className="mt-10 max-w-3xl">
          <AddressSearch />
        </div>
      </section>
    </div>
  )
}
