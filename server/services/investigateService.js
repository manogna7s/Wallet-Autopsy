import { env } from '../config/env.js'
import { HttpError } from '../utils/http.js'
import { isAddress, normalizeAddress } from '../utils/address.js'
import { resolveChain } from './blockchain/chains.js'
import { createTtlCache } from './blockchain/cache.js'
import {
  getAssetTransfers,
  getApprovalLogs,
  getCode,
  getLatestBlockNumber,
  toHexBlock,
} from './blockchain/alchemyService.js'
import { identifyContracts } from './blockchain/contractService.js'
import { decodeApprovalLog } from './blockchain/tokenService.js'
import {
  mergeAndSortActivity,
  normalizeApproval,
  normalizeTransfer,
} from './blockchain/transactionNormalizer.js'
import { analyzeRisk } from './risk/analyzeRisk.js'

const cache = createTtlCache({ ttlMs: env.cacheTtlMs })
const PAGE_SIZE = 100
const CATEGORIES = ['external', 'internal', 'erc20', 'erc721', 'erc1155']

function cacheKey(chain, address) {
  return `${chain}:${address}`
}

async function fetchTransferPage({ address, direction, pageKey }) {
  const params = {
    fromBlock: '0x0',
    toBlock: 'latest',
    category: CATEGORIES,
    excludeZeroValue: false,
    withMetadata: true,
    maxCount: toHexBlock(PAGE_SIZE),
    order: 'desc',
  }
  if (direction === 'from') params.fromAddress = address
  if (direction === 'to') params.toAddress = address
  if (pageKey) params.pageKey = pageKey
  return getAssetTransfers(params)
}

async function collectTransfers(address, max) {
  const notices = []
  const collected = []
  let truncated = false

  for (const direction of ['from', 'to']) {
    let pageKey
    let pages = 0
    do {
      const result = await fetchTransferPage({ address, direction, pageKey })
      const rows = Array.isArray(result?.transfers) ? result.transfers : []
      collected.push(...rows)
      pageKey = result?.pageKey || null
      pages += 1
      if (collected.length >= max) break
    } while (pageKey && pages < Math.ceil(max / PAGE_SIZE / 2) + 1)

    if (pageKey) {
      truncated = true
      notices.push(`Transfer history for ${direction} addresses was truncated to keep this lookup practical.`)
    }
  }

  return { transfers: collected.slice(0, max * 2), truncated, notices }
}

function earliestBlockHex(transfers) {
  const blocks = transfers
    .map((row) => Number.parseInt(row.blockNum, 16))
    .filter((n) => Number.isFinite(n))
  if (!blocks.length) return null
  return toHexBlock(Math.min(...blocks))
}

async function collectApprovals(address, transfers) {
  const notices = []
  const latest = await getLatestBlockNumber()
  const earliestHex = earliestBlockHex(transfers)
  const earliestNum = earliestHex ? Number.parseInt(earliestHex, 16) : null
  const windows = []
  if (earliestNum != null && latest - earliestNum <= 50_000) {
    windows.push(earliestHex)
  }
  windows.push(toHexBlock(Math.max(0, latest - 50_000)))
  windows.push(toHexBlock(Math.max(0, latest - 10_000)))
  windows.push(toHexBlock(Math.max(0, latest - 2_000)))
  const uniqueWindows = [...new Set(windows)]

  let logs = null
  let usedFallback = false

  for (const [index, fromBlock] of uniqueWindows.entries()) {
    try {
      logs = await getApprovalLogs({ owner: address, fromBlock })
      if (index > 0) usedFallback = true
      break
    } catch {
      if (index === uniqueWindows.length - 1) {
        notices.push('ERC-20 approval logs were not available from Alchemy for this range.')
        return { logs: [], notices }
      }
    }
  }

  if (usedFallback) {
    notices.push('Approval scan used a recent block window; older allowances may be missing.')
  }

  return { logs: Array.isArray(logs) ? logs : [], notices }
}

function summarize(subject, transactions, contracts) {
  const hashes = new Set(transactions.map((row) => row.hash).filter(Boolean))
  const counterparties = new Set()
  const tokenTransfers = transactions.filter((row) => row.transactionType === 'token_transfer').length
  const approvals = transactions.filter((row) => row.transactionType === 'approval')
  const timestamps = transactions.map((row) => row.timestamp).filter(Boolean).sort()

  for (const row of transactions) {
    if (row.from && row.from !== subject) counterparties.add(row.from)
    if (row.to && row.to !== subject) counterparties.add(row.to)
    if (row.spender && row.spender !== subject) counterparties.add(row.spender)
  }

  const contractCount = [...contracts].filter((value) =>
    transactions.some((row) => row.to === value || row.tokenAddress === value),
  ).length

  return {
    empty: transactions.length === 0,
    firstSeen: timestamps[0] || null,
    lastActive: timestamps[timestamps.length - 1] || null,
    counts: {
      transactions: hashes.size,
      events: transactions.length,
      tokenTransfers,
      contracts: contractCount,
      counterparties: counterparties.size,
      approvals: approvals.length,
      unlimitedApprovals: approvals.filter((row) => row.unlimited).length,
    },
  }
}

export async function investigateAddress({ address, chainId }) {
  if (!isAddress(address)) {
    throw new HttpError(400, 'Enter a valid 42-character EVM address (0x…).', 'INVALID_ADDRESS')
  }

  const chain = resolveChain(chainId)
  if (!chain) {
    throw new HttpError(400, 'Unsupported network. Ethereum Mainnet is available in this MVP.', 'UNSUPPORTED_NETWORK')
  }
  if (!env.alchemyKey) {
    throw new HttpError(503, 'Alchemy is not configured on the server.', 'ALCHEMY_NOT_CONFIGURED')
  }

  const subject = normalizeAddress(address)
  const key = cacheKey(chain.id, subject)
  const cached = cache.get(key)
  if (cached) {
    return { ...cached, cached: true }
  }

  const { transfers: rawTransfers, truncated, notices } = await collectTransfers(subject, env.maxTransfers)
  const uniqueAddresses = [
    ...rawTransfers.map((row) => row.to),
    ...rawTransfers.map((row) => row.from),
  ].filter(Boolean)

  const contracts = await identifyContracts(uniqueAddresses, getCode)
  const normalizedTransfers = rawTransfers.map((row) =>
    normalizeTransfer(row, { chain: chain.id, subject, contracts }),
  )

  const tokenSymbols = new Map()
  for (const row of normalizedTransfers) {
    if (row.tokenAddress && row.token) tokenSymbols.set(row.tokenAddress, row.token)
  }

  const approvalResult = await collectApprovals(subject, rawTransfers)
  const normalizedApprovals = approvalResult.logs.map((log) => {
    const decoded = decodeApprovalLog(log)
    const tokenAddress = log.address ? normalizeAddress(log.address) : undefined
    return normalizeApproval(log, {
      chain: chain.id,
      token: tokenAddress ? tokenSymbols.get(tokenAddress) : undefined,
      tokenAddress,
      decoded,
    })
  })

  const transactions = mergeAndSortActivity(normalizedTransfers, normalizedApprovals)
  const activity = summarize(subject, transactions, contracts)
  const noticesOut = [...notices, ...approvalResult.notices]
  const risk = analyzeRisk({
    address: subject,
    chain: chain.id,
    transactions,
    truncated,
    notices: noticesOut,
  })
  const payload = {
    address: subject,
    chain: chain.id,
    chainId: chain.chainId,
    chainLabel: chain.label,
    provider: 'alchemy',
    cached: false,
    truncated,
    notices: noticesOut,
    activity,
    transactions,
    risk,
  }

  cache.set(key, payload)
  return payload
}
