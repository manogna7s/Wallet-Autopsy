import { shorten, isAddress } from '../data/mock'
import { addressExplorerUrl, txExplorerUrl } from './explorer'

export const MAX_GRAPH_NODES = 12
export const MAX_TIMELINE_EVENTS = 48

const HIGHLIGHT_TYPES = new Set([
  'flagged_counterparty',
  'repeated_risky_interaction',
  'relationship_risk',
  'unlimited_token_approval',
  'permission_exposure_risk',
])

function normalize(value) {
  return String(value || '').trim().toLowerCase()
}

function looksLikeAddress(value) {
  return isAddress(value)
}

export function toneFor(severity) {
  if (severity === 'elevated') return 'high'
  if (severity === 'moderate') return 'medium'
  return severity || 'info'
}

function eventTime(row) {
  if (!row?.timestamp && !row?.at) return null
  const value = Date.parse(row.timestamp || row.at)
  return Number.isFinite(value) ? value : null
}

function later(a, b) {
  if (a && !b) return a
  if (b && !a) return b
  if (!a && !b) return null
  return Date.parse(a) >= Date.parse(b) ? a : b
}

function earlier(a, b) {
  if (a && !b) return a
  if (b && !a) return b
  if (!a && !b) return null
  return Date.parse(a) <= Date.parse(b) ? a : b
}

export function isInformationalSignal(signal) {
  return (
    signal?.title === 'Unverified / insufficient information' ||
    (signal?.type === 'suspicious_contract_interaction' && signal?.severity === 'info')
  )
}

export function isHighlightSignal(signal) {
  if (!signal || isInformationalSignal(signal)) return false
  if (HIGHLIGHT_TYPES.has(signal.type)) return true
  if (signal.type === 'suspicious_contract_interaction' && (signal.contribution || 0) > 0) return true
  return (signal.contribution || 0) > 0
}

function signalAddresses(signal) {
  if (!signal) return []
  const found = new Set()
  for (const address of signal.addresses || []) {
    if (looksLikeAddress(address)) found.add(normalize(address))
  }
  if (looksLikeAddress(signal.spender)) found.add(normalize(signal.spender))
  if (looksLikeAddress(signal.tokenAddress)) found.add(normalize(signal.tokenAddress))
  for (const row of signal.evidence || []) {
    if (looksLikeAddress(row.value)) found.add(normalize(row.value))
  }
  return [...found]
}

function edgeKind(row, subject) {
  if (row.transactionType === 'approval' || row.method === 'approve') return 'approved'
  if (row.transactionType === 'contract_interaction' || row.contractInteraction) return 'called'
  if (row.direction === 'in' || (row.to === subject && row.from !== subject)) return 'received from'
  if (row.direction === 'out' || row.from === subject) return 'transferred to'
  return 'interacted with'
}

function counterpartiesOf(row, subject) {
  const found = new Set()
  for (const key of ['from', 'to', 'spender']) {
    const value = normalize(row[key])
    if (value && value !== subject && looksLikeAddress(value)) found.add(value)
  }
  return [...found]
}

function nodeTypeLabel(type) {
  if (type === 'wallet') return 'Investigated wallet'
  if (type === 'flagged') return 'Flagged address'
  if (type === 'contract') return 'Smart contract'
  if (type === 'token') return 'Token contract'
  return 'Counterparty'
}

function classifyType(address, stats, listing) {
  if (listing?.flagged) return 'flagged'
  if (stats.asToken && !stats.asContract && !stats.asPeer) return 'token'
  if (stats.asToken && !stats.asPeer) return 'token'
  if (stats.asContract) return 'contract'
  return 'counterparty'
}

function riskLabel(listing, stats) {
  if (listing?.flagged) return listing.label || 'Listed'
  if (listing?.approval) return 'Approval exposure'
  if (listing?.behavioral) return 'Behavioral anomaly'
  return null
}

function collectListings(signals, subject) {
  const map = new Map()
  for (const signal of signals) {
    const highlight = isHighlightSignal(signal)
    const informational = isInformationalSignal(signal)
    if (!highlight && !informational) continue
    for (const address of signalAddresses(signal)) {
      if (address === subject) continue
      const current = map.get(address) || {
        flagged: false,
        approval: false,
        behavioral: false,
        informational: false,
        severity: null,
        label: null,
        signals: [],
      }
      current.signals.push(signal)
      if (highlight) {
        if (
          signal.type === 'flagged_counterparty' ||
          signal.type === 'relationship_risk' ||
          signal.type === 'repeated_risky_interaction' ||
          (signal.type === 'suspicious_contract_interaction' && signal.severity !== 'info')
        ) {
          current.flagged = true
          current.label = current.label || (signal.type === 'repeated_risky_interaction' ? 'Repeated listed interaction' : 'Listed')
        }
        if (signal.type === 'unlimited_token_approval' || signal.type === 'permission_exposure_risk') {
          current.approval = true
          current.label = current.label || 'Approval exposure'
        }
        if (signal.type === 'unusual_transaction_pattern') {
          current.behavioral = true
          current.label = current.label || 'Behavioral anomaly'
        }
        const rank = { critical: 5, high: 4, elevated: 3, medium: 2, moderate: 2, low: 1, info: 0 }
        if ((rank[signal.severity] || 0) >= (rank[current.severity] || -1)) current.severity = signal.severity
      } else {
        current.informational = true
      }
      map.set(address, current)
    }
  }
  return map
}

function buildStats(subject, transactions) {
  const stats = new Map()
  function ensure(address) {
    if (!stats.has(address)) {
      stats.set(address, {
        asPeer: false,
        asContract: false,
        asToken: false,
        tokenSymbol: null,
        count: 0,
        first: null,
        last: null,
        kinds: new Set(),
        hashes: [],
      })
    }
    return stats.get(address)
  }

  for (const row of transactions) {
    const kind = edgeKind(row, subject)
    const peers = counterpartiesOf(row, subject)
    for (const address of peers) {
      const entry = ensure(address)
      entry.asPeer = true
      entry.count += 1
      entry.first = earlier(entry.first, row.timestamp)
      entry.last = later(entry.last, row.timestamp)
      entry.kinds.add(kind)
      if (row.hash) entry.hashes.push(row.hash)
      if (row.contractInteraction || row.transactionType === 'contract_interaction' || row.transactionType === 'approval') {
        if (address === normalize(row.to) || address === normalize(row.spender)) entry.asContract = true
      }
    }
    const token = normalize(row.tokenAddress)
    if (token && token !== subject && looksLikeAddress(token)) {
      const entry = ensure(token)
      entry.asToken = true
      entry.tokenSymbol = entry.tokenSymbol || row.token || null
      if (!peers.includes(token)) {
        entry.count += 1
        entry.first = earlier(entry.first, row.timestamp)
        entry.last = later(entry.last, row.timestamp)
        entry.kinds.add('interacted with')
        if (row.hash) entry.hashes.push(row.hash)
      }
    }
  }
  return stats
}

function selectAddresses(stats, listings) {
  const riskLinked = [...listings.entries()]
    .filter(([, listing]) => listing.flagged || listing.approval || listing.behavioral)
    .map(([address, listing]) => ({
      address,
      listing,
      count: stats.get(address)?.count || 0,
    }))
    .sort((a, b) => b.count - a.count)

  const picked = []
  const seen = new Set()
  for (const row of riskLinked) {
    if (picked.length >= MAX_GRAPH_NODES - 1) break
    picked.push(row.address)
    seen.add(row.address)
  }

  const rest = [...stats.entries()]
    .filter(([address]) => !seen.has(address))
    .sort((a, b) => b[1].count - a[1].count)

  for (const [address] of rest) {
    if (picked.length >= MAX_GRAPH_NODES - 1) break
    picked.push(address)
  }

  return { picked, total: stats.size, omitted: Math.max(0, stats.size - picked.length) }
}

function buildEdges(subject, transactions, visible) {
  const grouped = new Map()
  for (const row of transactions) {
    const kind = edgeKind(row, subject)
    const peers = counterpartiesOf(row, subject)
    const links = []
    for (const address of peers) {
      if (!visible.has(address)) continue
      const inbound = kind === 'received from'
      links.push({
        source: inbound ? address : subject,
        target: inbound ? subject : address,
        kind,
        row,
      })
    }
    const token = normalize(row.tokenAddress)
    if (token && visible.has(token) && !peers.includes(token)) {
      links.push({ source: subject, target: token, kind: 'interacted with', row })
    }
    for (const link of links) {
      const key = `${link.source}|${link.target}|${link.kind}`
      const current = grouped.get(key) || {
        id: key,
        source: link.source,
        target: link.target,
        kind: link.kind,
        count: 0,
        latest: null,
        hash: null,
        hashes: [],
      }
      current.count += 1
      const nextLatest = later(current.latest, link.row.timestamp)
      if (nextLatest !== current.latest) {
        current.latest = link.row.timestamp || current.latest
        current.hash = link.row.hash || current.hash
      } else if (!current.hash && link.row.hash) {
        current.hash = link.row.hash
      }
      if (link.row.hash) current.hashes.push(link.row.hash)
      grouped.set(key, current)
    }
  }
  return [...grouped.values()]
}

export function buildForensicGraph({ subject, chain, transactions, signals }) {
  const listings = collectListings(signals, subject)
  const stats = buildStats(subject, transactions)
  const { picked, total, omitted } = selectAddresses(stats, listings)
  const visible = new Set([subject, ...picked])

  const nodes = [
    {
      id: subject,
      address: subject,
      type: 'wallet',
      typeLabel: nodeTypeLabel('wallet'),
      label: 'Investigated',
      display: shorten(subject, 4),
      isSubject: true,
      riskRelevant: false,
      highlight: false,
      interactionCount: transactions.length,
      firstInteraction: null,
      lastInteraction: null,
      relationships: ['origin'],
      relatedSignals: [],
      evidenceTransactions: [],
      explorerUrl: addressExplorerUrl(chain, subject),
    },
  ]

  const subjectTimes = transactions.map((row) => row.timestamp).filter(Boolean).sort()
  if (subjectTimes[0]) nodes[0].firstInteraction = subjectTimes[0]
  if (subjectTimes.length) nodes[0].lastInteraction = subjectTimes[subjectTimes.length - 1]

  for (const address of picked) {
    const entry = stats.get(address) || {
      count: 0,
      first: null,
      last: null,
      kinds: new Set(),
      hashes: [],
      asContract: false,
      asToken: false,
      tokenSymbol: null,
    }
    const listing = listings.get(address)
    const type = classifyType(address, entry, listing)
    const relatedSignals = listing?.signals || []
    const evidence = [
      ...new Set(
        relatedSignals.flatMap((signal) => signal.affectedTransactions || []).filter((hash) => entry.hashes.includes(hash)),
      ),
    ]
    nodes.push({
      id: address,
      address,
      type,
      typeLabel: nodeTypeLabel(type),
      label: entry.tokenSymbol || shorten(address, 4),
      display: entry.tokenSymbol || shorten(address, 4),
      isSubject: false,
      riskRelevant: Boolean(listing && (listing.flagged || listing.approval || listing.behavioral)),
      highlight: Boolean(listing && (listing.flagged || listing.approval || listing.behavioral)),
      riskSeverity: listing?.severity || null,
      riskLabel: riskLabel(listing, entry),
      interactionCount: entry.count,
      firstInteraction: entry.first,
      lastInteraction: entry.last,
      relationships: [...entry.kinds],
      relatedSignals: relatedSignals.filter(isHighlightSignal).map((signal) => signal.id),
      relatedSignalObjects: relatedSignals.filter(isHighlightSignal),
      evidenceTransactions: evidence.slice(0, 8),
      latestHash: entry.hashes[0] || null,
      explorerUrl: addressExplorerUrl(chain, address),
      tokenSymbol: entry.tokenSymbol,
    })
  }

  const hashToSignals = new Map()
  for (const signal of signals) {
    if (!isHighlightSignal(signal)) continue
    for (const hash of signal.affectedTransactions || []) {
      if (!hashToSignals.has(hash)) hashToSignals.set(hash, [])
      hashToSignals.get(hash).push(signal)
    }
  }

  const edges = buildEdges(subject, transactions, visible).map((edge) => {
    const linked = edge.hashes.some((hash) => hashToSignals.has(hash))
    const sourceNode = nodes.find((node) => node.id === edge.source)
    const targetNode = nodes.find((node) => node.id === edge.target)
    const riskRelevant = Boolean(linked || sourceNode?.highlight || targetNode?.highlight)
    return {
      ...edge,
      latestHash: edge.hash,
      explorerUrl: txExplorerUrl(chain, edge.hash),
      riskRelevant,
      countLabel: `${edge.kind} · ${edge.count}`,
    }
  })

  return {
    subject,
    nodes,
    edges,
    totalCounterparties: total,
    omitted,
    riskNodeCount: nodes.filter((node) => node.highlight).length,
  }
}

export function filterGraph(graph, { filter = 'all', riskOnly = true } = {}) {
  let nodes = graph.nodes
  if (riskOnly || filter === 'signals') {
    nodes = nodes.filter((node) => node.isSubject || node.riskRelevant || node.highlight)
  }
  if (filter === 'wallets') {
    nodes = nodes.filter(
      (node) => node.isSubject || node.type === 'counterparty' || node.type === 'flagged' || node.type === 'wallet',
    )
  } else if (filter === 'contracts') {
    nodes = nodes.filter((node) => node.isSubject || node.type === 'contract' || node.type === 'flagged')
  } else if (filter === 'tokens') {
    nodes = nodes.filter((node) => node.isSubject || node.type === 'token')
  }

  const ids = new Set(nodes.map((node) => node.id))
  const edges = graph.edges.filter((edge) => {
    if (!ids.has(edge.source) || !ids.has(edge.target)) return false
    if (riskOnly) return edge.riskRelevant
    return true
  })
  return { ...graph, nodes, edges }
}

export function layoutGraph(nodes, subject) {
  const cx = 420
  const cy = 310
  const others = nodes.filter((node) => node.id !== subject)
  const inner = others.filter((node) => node.highlight || node.riskRelevant)
  const outer = others.filter((node) => !node.highlight && !node.riskRelevant)
  const positions = new Map([[subject, { x: cx - 70, y: cy - 28 }]])

  function ring(list, radius, startAngle = -Math.PI / 2) {
    list.forEach((node, index) => {
      const angle = startAngle + (index / Math.max(list.length, 1)) * Math.PI * 2
      positions.set(node.id, {
        x: cx + Math.cos(angle) * radius - 70,
        y: cy + Math.sin(angle) * radius - 28,
      })
    })
  }

  ring(inner, inner.length === 1 ? 210 : 230)
  ring(outer, 340, Math.PI / 8)
  return nodes.map((node) => ({
    ...node,
    position: positions.get(node.id) || { x: cx, y: cy },
  }))
}

export function buildTimeline({ chain, transactions, signals }) {
  const byHash = new Map()
  for (const signal of signals) {
    for (const hash of signal.affectedTransactions || []) {
      if (!byHash.has(hash)) byHash.set(hash, [])
      byHash.get(hash).push(signal)
    }
  }

  function toEvent(row, index) {
    const linked = (row.hash ? byHash.get(row.hash) : null) || []
    const highlight = linked.filter(isHighlightSignal)
    const contractAddress =
      row.transactionType === 'approval'
        ? row.spender || row.to
        : row.tokenAddress ||
          (row.contractInteraction || row.transactionType === 'contract_interaction' ? row.to : undefined)
    return {
      id: row.uniqueId || row.hash || `tx-${index}`,
      at: row.timestamp,
      blockNum: row.blockNum,
      transactionType: row.transactionType,
      typeLabel: typeTitle(row),
      from: row.from,
      to: row.to,
      token: row.token,
      tokenAddress: row.tokenAddress,
      value: row.value,
      contract: contractAddress,
      status: row.status,
      hash: row.hash,
      explorerUrl: txExplorerUrl(chain, row.hash),
      direction: row.direction,
      method: row.method,
      spender: row.spender,
      unlimited: row.unlimited,
      hasSignal: highlight.length > 0,
      severity: highlight[0]?.severity || (row.unlimited ? 'high' : 'info'),
      signals: highlight.map((signal) => ({
        id: signal.id,
        title: signal.title,
        severity: signal.severity,
        why: signal.summary,
        evidence: signal.evidence || [],
        hash: row.hash,
        explorerUrl: txExplorerUrl(chain, row.hash),
        label: signal.label || signal.behaviorLabel,
      })),
    }
  }

  const events = transactions.map(toEvent)
  const linked = events.filter((event) => event.hasSignal)
  const rest = events.filter((event) => !event.hasSignal)
  const room = Math.max(0, MAX_TIMELINE_EVENTS - linked.length)
  return [...linked, ...rest.slice(0, room)].sort((a, b) => {
    const ta = a.at ? Date.parse(a.at) : 0
    const tb = b.at ? Date.parse(b.at) : 0
    return tb - ta
  })
}

function typeTitle(row) {
  if (row.transactionType === 'approval') return row.unlimited ? 'Unlimited token approval' : 'Token approval'
  if (row.transactionType === 'contract_interaction') return 'Contract interaction'
  if (row.transactionType === 'token_transfer') return row.token ? `${row.token} transfer` : 'Token transfer'
  if (row.transactionType === 'nft_transfer') return 'NFT transfer'
  if (row.transactionType === 'internal_transfer') return 'Internal transfer'
  return 'Transfer'
}

function firstSignalAddress(signal, subject) {
  if (!signal) return null
  return signalAddresses(signal).find((address) => address && address !== subject)
}

export function buildRiskPath({ subject, signals, graph }) {
  const steps = [
    {
      id: 'origin',
      kind: 'wallet',
      kicker: 'Investigated',
      label: 'Your wallet',
      address: subject,
    },
  ]

  function pushSignal(signal, kicker) {
    if (!signal) return null
    steps.push({
      id: signal.id,
      kind: 'signal',
      kicker: kicker || 'Engine signal',
      label: signal.title,
      detail: signal.summary,
    })
    return firstSignalAddress(signal, subject)
  }

  function pushAddress(address, kicker) {
    if (!address) return
    const node = graph.nodes.find((item) => item.id === address)
    steps.push({
      id: `addr-${address}`,
      kind: node?.type || 'counterparty',
      kicker: kicker || node?.riskLabel || node?.typeLabel || 'Counterparty',
      label: node?.display || shorten(address, 4),
      address,
    })
  }

    const spender = pushSignal(approval, 'Engine signal')
    if (spender) pushAddress(spender, 'Spender')

    const repeated = signals.find((signal) => signal.type === 'repeated_risky_interaction')
    const flagged =
      repeated ||
      signals.find((signal) => signal.type === 'flagged_counterparty' || signal.type === 'relationship_risk')
    const listed = firstSignalAddress(flagged, subject)
    if (flagged && listed && listed !== spender) {
      pushSignal(flagged, 'Engine signal')
      pushAddress(listed, repeated ? 'Repeated counterparty' : 'Listed counterparty')
    }

    const listedContract = signals.find(
      (signal) => signal.type === 'suspicious_contract_interaction' && !isInformationalSignal(signal),
    )
    const contractAddr = firstSignalAddress(listedContract, subject)
    if (listedContract && contractAddr && contractAddr !== spender && contractAddr !== listed) {
      pushSignal(listedContract, 'Engine signal')
      pushAddress(contractAddr, 'Listed contract')
    }

    if (steps.length === 1) {
      const behavior = signals.find((signal) => signal.type === 'unusual_transaction_pattern')
      const peer = pushSignal(behavior, 'Engine signal')
      if (peer) pushAddress(peer, 'Counterparty')
    }

  return {
    caption: 'Detected relationship',
    steps,
    empty: steps.length <= 1,
  }
}

export function buildForensicSummary(signals, graph) {
  const relationshipTypes = new Set([
    'flagged_counterparty',
    'relationship_risk',
    'repeated_risky_interaction',
  ])
  const listedContracts = signals.filter(
    (signal) => signal.type === 'suspicious_contract_interaction' && !isInformationalSignal(signal),
  )
  const relationshipAddresses = new Set()
  for (const signal of signals) {
    if (relationshipTypes.has(signal.type) || listedContracts.includes(signal)) {
      for (const address of signalAddresses(signal)) relationshipAddresses.add(address)
    }
  }
  const approvalRisks = signals.filter(
    (signal) => signal.type === 'unlimited_token_approval' || signal.type === 'permission_exposure_risk',
  ).length
  const behavioralAnomalies = signals.filter((signal) => signal.type === 'unusual_transaction_pattern').length

  const items = [
    {
      key: 'relationships',
      label: relationshipAddresses.size === 1 ? 'suspicious relationship' : 'suspicious relationships',
      value: relationshipAddresses.size,
    },
    {
      key: 'approvals',
      label: approvalRisks === 1 ? 'approval risk' : 'approval risks',
      value: approvalRisks,
    },
    {
      key: 'behavior',
      label: behavioralAnomalies === 1 ? 'behavioral anomaly' : 'behavioral anomalies',
      value: behavioralAnomalies,
    },
  ]

  const mix = [
    { name: 'Wallets', count: graph.nodes.filter((node) => node.type === 'counterparty' || node.type === 'wallet').length },
    { name: 'Contracts', count: graph.nodes.filter((node) => node.type === 'contract' || node.type === 'flagged').length },
    { name: 'Tokens', count: graph.nodes.filter((node) => node.type === 'token').length },
    { name: 'Risk-linked', count: graph.nodes.filter((node) => node.highlight).length },
  ]

  return { items, mix }
}
