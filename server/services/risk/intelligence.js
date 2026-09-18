import { normalizeAddress } from '../../utils/address.js'

/**
 * Local demo intelligence only.
 * These addresses are synthetic fixtures for Wallet Autopsy.
 * They are not accusations about real people, protocols, or wallets.
 * Sanctioned / blocked labels are accepted only from a verified legitimate source.
 */
export const INTELLIGENCE_SOURCE = 'local_demo_list'

export const LEGITIMATE_SANCTIONS_SOURCES = new Set(['ofac_sdn'])

export const DEMO_ADDRESSES = {
  flagged: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1',
  suspicious: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb1',
  compromised: '0xccccccccccccccccccccccccccccccccccccccc1',
  flaggedContract: '0xddddddddddddddddddddddddddddddddddddddd1',
}

const RAW_LISTINGS = [
  {
    address: DEMO_ADDRESSES.flagged,
    labels: ['flagged'],
    note: 'Demo fixture labeled flagged. Not a real-world accusation.',
    source: INTELLIGENCE_SOURCE,
  },
  {
    address: DEMO_ADDRESSES.suspicious,
    labels: ['suspicious'],
    note: 'Demo fixture labeled suspicious. Not a real-world accusation.',
    source: INTELLIGENCE_SOURCE,
  },
  {
    address: DEMO_ADDRESSES.compromised,
    labels: ['compromised'],
    note: 'Demo fixture labeled compromised. Not a real-world accusation.',
    source: INTELLIGENCE_SOURCE,
  },
  {
    address: DEMO_ADDRESSES.flaggedContract,
    labels: ['flagged'],
    kind: 'contract',
    note: 'Demo fixture contract labeled flagged. Not a real-world accusation.',
    source: INTELLIGENCE_SOURCE,
  },
]

function allowsSanctioned(entry) {
  return entry?.verified === true && LEGITIMATE_SANCTIONS_SOURCES.has(entry.source)
}

export function normalizeListing(entry) {
  if (!entry?.address) return null
  const labels = [...new Set((entry.labels || []).filter(Boolean))].filter((label) => {
    if (label === 'sanctioned' || label === 'blocked') return allowsSanctioned(entry)
    return label === 'flagged' || label === 'suspicious' || label === 'compromised'
  })
  if (!labels.length) return null
  return {
    address: normalizeAddress(entry.address),
    labels,
    kind: entry.kind || undefined,
    note: entry.note || undefined,
    source: entry.source || undefined,
    verified: entry.verified === true || undefined,
  }
}

const LISTINGS = new Map(
  RAW_LISTINGS.map(normalizeListing)
    .filter(Boolean)
    .map((row) => [row.address, row]),
)

export function getListing(address, extraListings = []) {
  const key = normalizeAddress(address)
  if (!key) return null
  const extra = extraListings.map(normalizeListing).find((row) => row?.address === key)
  return extra || LISTINGS.get(key) || null
}

export function lookupListings(addresses, extraListings = []) {
  const found = new Map()
  for (const address of addresses) {
    const listing = getListing(address, extraListings)
    if (listing) found.set(listing.address, listing)
  }
  return found
}

export function primaryLabel(listing) {
  if (!listing?.labels?.length) return null
  if (listing.labels.includes('compromised')) return 'compromised'
  if (listing.labels.includes('sanctioned') || listing.labels.includes('blocked')) return 'sanctioned'
  if (listing.labels.includes('flagged')) return 'flagged'
  if (listing.labels.includes('suspicious')) return 'suspicious'
  return listing.labels[0]
}

export function isRiskyListing(listing) {
  const label = primaryLabel(listing)
  return label === 'flagged' || label === 'suspicious' || label === 'compromised' || label === 'sanctioned'
}
