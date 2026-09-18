import { normalizeAddress } from '../../utils/address.js'
import { MAX_UINT256 } from './config.js'

export function eventTime(row) {
  if (!row?.timestamp) return null
  const value = Date.parse(row.timestamp)
  return Number.isFinite(value) ? value : null
}

export function counterpartiesOf(row, subject) {
  const found = new Set()
  for (const key of ['from', 'to', 'spender']) {
    const value = row?.[key] ? normalizeAddress(row[key]) : ''
    if (value && value !== subject) found.add(value)
  }
  return [...found]
}

export function isContractEvent(row) {
  return Boolean(row?.contractInteraction || row?.transactionType === 'contract_interaction')
}

export function isApprovalEvent(row) {
  return row?.transactionType === 'approval' || row?.method === 'approve'
}

export function parseAmount(value) {
  if (value == null || value === '') return null
  try {
    if (typeof value === 'bigint') return value
    const raw = String(value).trim()
    if (!raw) return null
    if (raw.startsWith('0x')) return BigInt(raw)
    if (raw.includes('e') || raw.includes('E') || raw.includes('.')) return null
    return BigInt(raw)
  } catch {
    return null
  }
}

export function numericValue(value) {
  if (value == null || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function isUnlimitedAmount(row) {
  if (row?.unlimited === true) return true
  const amount = parseAmount(row?.value)
  if (amount == null) return false
  return amount >= MAX_UINT256 / 2n
}

export function median(values) {
  const sorted = values.filter((n) => Number.isFinite(n)).sort((a, b) => a - b)
  if (!sorted.length) return null
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2
  return sorted[mid]
}

export function uniqueHashes(rows) {
  return [...new Set(rows.map((row) => row?.hash).filter(Boolean))]
}

export function slidingWindowMax(times, windowMs) {
  if (!times.length) return { count: 0, start: null, end: null, indexes: [] }
  const sorted = times
    .map((time, index) => ({ time, index }))
    .filter((row) => row.time != null)
    .sort((a, b) => a.time - b.time)
  let best = { count: 0, start: null, end: null, indexes: [] }
  let left = 0
  for (let right = 0; right < sorted.length; right += 1) {
    while (sorted[right].time - sorted[left].time > windowMs) left += 1
    const count = right - left + 1
    if (count > best.count) {
      best = {
        count,
        start: sorted[left].time,
        end: sorted[right].time,
        indexes: sorted.slice(left, right + 1).map((row) => row.index),
      }
    }
  }
  return best
}

export function clampConfidence(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0.4
  return Math.max(0.05, Math.min(0.98, n))
}

export function roundConfidence(value) {
  return Math.round(clampConfidence(value) * 100) / 100
}

export function tokenKey(row) {
  return row?.tokenAddress || row?.token || 'native'
}
