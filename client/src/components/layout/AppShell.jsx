import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { NavLinks, Wordmark } from './Nav'
import { StatusPill } from './StatusPill'
import { Button } from '../ui/Button'
import { useNetwork } from '../../context/NetworkContext'
import { isAddress } from '../../data/mock'

export function AppShell() {
  const [open, setOpen] = useState(false)
  const { network, setNetworkId, networks } = useNetwork()
  const navigate = useNavigate()
  const searchRef = useRef(null)

  useEffect(() => {
    function onKey(event) {
      if (event.key === '/' && event.target.tagName !== 'INPUT' && event.target.tagName !== 'TEXTAREA') {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function onNavSearch(event) {
    event.preventDefault()
    const value = String(new FormData(event.currentTarget).get('q') || '').trim()
    if (!isAddress(value)) {
      navigate(`/investigate?q=${encodeURIComponent(value)}`)
      return
    }
    navigate(`/investigate/${value}`)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="absolute left-4 top-4 z-50 -translate-y-16 bg-accent px-3 py-2 text-sm text-accent-ink focus:translate-y-0"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-30 border-b border-line bg-canvas">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-3.5 md:px-8">
          <Link to="/" className="shrink-0 hover:opacity-80" aria-label="Wallet Autopsy home">
            <Wordmark />
          </Link>

          <nav className="hidden md:block" aria-label="Primary">
            <NavLinks />
          </nav>

          <div className="ml-auto hidden items-center gap-3 md:flex">
            <label className="sr-only" htmlFor="network-select">
              Network
            </label>
            <select
              id="network-select"
              value={network.id}
              onChange={(event) => setNetworkId(event.target.value)}
              className="border border-line bg-canvas px-2 py-1.5 text-[12px] text-quiet"
            >
              {networks.map((item) => (
                <option key={item.id} value={item.id} disabled={!item.enabled}>
                  {item.label}
                  {item.enabled ? '' : ' · soon'}
                </option>
              ))}
            </select>

            <form onSubmit={onNavSearch} className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
              <input
                ref={searchRef}
                name="q"
                type="search"
                placeholder="Search address  /"
                className="w-52 border border-line bg-inset py-1.5 pl-8 pr-3 text-[12px] text-ink placeholder:text-faint"
                autoComplete="off"
                spellCheck="false"
              />
            </form>

            <StatusPill />
          </div>

          <div className="ml-auto md:hidden">
            <Button
              variant="ghost"
              className="px-3 py-2"
              aria-expanded={open}
              aria-controls="mobile-nav"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? 'Close' : 'Menu'}
            </Button>
          </div>
        </div>

        {open ? (
          <div id="mobile-nav" className="border-t border-line px-5 py-4 md:hidden">
            <NavLinks onNavigate={() => setOpen(false)} />
            <form onSubmit={onNavSearch} className="mt-4">
              <input
                name="q"
                type="search"
                placeholder="Paste a wallet or contract address"
                className="w-full border border-line bg-inset px-3 py-2 text-sm"
              />
            </form>
          </div>
        ) : null}
      </header>

      <div className="border-b border-line bg-inset/60">
        <p className="mx-auto max-w-6xl px-5 py-1.5 text-[11px] tracking-wide text-quiet md:px-8">
          Ethereum Mainnet via Alchemy · Wallet Autopsy Risk Model is deterministic · Gemini does not score risk
        </p>
      </div>

      <main id="main" className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-8 text-[11px] text-quiet md:flex-row md:items-center md:justify-between md:px-8">
          <p>Blockchain intelligence under a microscope.</p>
          <p>Not a wallet. Not a signer. Evidence before interaction.</p>
        </div>
      </footer>
    </div>
  )
}
