import { DEMO_ADDRESSES } from '../../services/risk/intelligence.js'

export const SUBJECT = '0x1111111111111111111111111111111111111111'
export const NEUTRAL = '0x2222222222222222222222222222222222222222'
export const UNKNOWN_CONTRACT = '0x3333333333333333333333333333333333333333'
export const SPENDER_A = '0x4444444444444444444444444444444444444444'
export const SPENDER_B = '0x5555555555555555555555555555555555555555'
export const USDC = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
export const MAX_UINT256 = '115792089237316195423570985008687907853269984665640564039457584007913129639935'

const hour = 60 * 60 * 1000
const start = Date.parse('2024-06-01T12:00:00.000Z')

function ts(offsetMs = 0) {
  return new Date(start + offsetMs).toISOString()
}

export function transfer(overrides = {}) {
  return {
    hash: overrides.hash || '0xabc1',
    timestamp: overrides.timestamp || ts(),
    chain: 'ethereum',
    from: overrides.from || SUBJECT,
    to: overrides.to || NEUTRAL,
    value: overrides.value ?? 1,
    token: overrides.token,
    tokenAddress: overrides.tokenAddress,
    transactionType: overrides.transactionType || 'transfer',
    contractInteraction: overrides.contractInteraction,
    method: overrides.method,
    status: overrides.status || 'confirmed',
    uniqueId: overrides.uniqueId,
  }
}

export function emptyActivity() {
  return { address: SUBJECT, chain: 'ethereum', transactions: [] }
}

export function unlimitedApproval({ weak = false } = {}) {
  const row = {
    hash: weak ? undefined : '0xapprove1',
    timestamp: weak ? undefined : ts(),
    chain: 'ethereum',
    from: SUBJECT,
    to: SPENDER_A,
    value: MAX_UINT256,
    token: 'USDC',
    tokenAddress: USDC,
    transactionType: 'approval',
    method: 'approve',
    status: weak ? undefined : 'confirmed',
    unlimited: true,
    spender: SPENDER_A,
    uniqueId: 'approval-1',
  }
  return {
    address: SUBJECT,
    chain: 'ethereum',
    transactions: [row],
  }
}

export function multipleUnlimitedApprovals() {
  return {
    address: SUBJECT,
    chain: 'ethereum',
    transactions: [
      {
        hash: '0xap1',
        timestamp: ts(),
        chain: 'ethereum',
        from: SUBJECT,
        to: SPENDER_A,
        value: MAX_UINT256,
        token: 'USDC',
        tokenAddress: USDC,
        transactionType: 'approval',
        method: 'approve',
        unlimited: true,
        spender: SPENDER_A,
        status: 'confirmed',
      },
      {
        hash: '0xap2',
        timestamp: ts(hour),
        chain: 'ethereum',
        from: SUBJECT,
        to: SPENDER_B,
        value: MAX_UINT256,
        token: 'DAI',
        tokenAddress: '0x6b175474e89094c44da98b954eedeac495271d0f',
        transactionType: 'approval',
        method: 'approve',
        unlimited: true,
        spender: SPENDER_B,
        status: 'confirmed',
      },
    ],
  }
}

export function flaggedCounterpartyOnce() {
  return {
    address: SUBJECT,
    chain: 'ethereum',
    transactions: [
      transfer({
        hash: '0xflag1',
        to: DEMO_ADDRESSES.flagged,
        value: 0.4,
        token: 'ETH',
      }),
    ],
  }
}

export function repeatedFlaggedInteractions() {
  return {
    address: SUBJECT,
    chain: 'ethereum',
    transactions: [
      transfer({ hash: '0xrep1', to: DEMO_ADDRESSES.flagged, value: 0.1, timestamp: ts() }),
      transfer({ hash: '0xrep2', to: DEMO_ADDRESSES.flagged, value: 0.2, timestamp: ts(hour) }),
      transfer({ hash: '0xrep3', to: DEMO_ADDRESSES.suspicious, value: 0.3, timestamp: ts(hour * 2) }),
    ],
  }
}

export function highFrequencyBurst() {
  const transactions = Array.from({ length: 14 }, (_, index) =>
    transfer({
      hash: `0xfreq${index + 1}`,
      to: NEUTRAL,
      value: 0.01,
      timestamp: ts(index * 60 * 1000),
      uniqueId: `freq-${index}`,
    }),
  )
  return { address: SUBJECT, chain: 'ethereum', transactions }
}

export function suddenLargeTransfer() {
  const small = Array.from({ length: 6 }, (_, index) =>
    transfer({
      hash: `0xsmall${index + 1}`,
      to: NEUTRAL,
      value: 1,
      token: 'ETH',
      timestamp: ts(index * hour),
    }),
  )
  small.push(
    transfer({
      hash: '0xlarge1',
      to: NEUTRAL,
      value: 80,
      token: 'ETH',
      timestamp: ts(8 * hour),
    }),
  )
  return { address: SUBJECT, chain: 'ethereum', transactions: small }
}

export function unknownContractActivity() {
  return {
    address: SUBJECT,
    chain: 'ethereum',
    transactions: [
      transfer({
        hash: '0xcall1',
        to: UNKNOWN_CONTRACT,
        value: 0,
        transactionType: 'contract_interaction',
        contractInteraction: true,
        timestamp: ts(),
      }),
      transfer({
        hash: '0xcall2',
        to: UNKNOWN_CONTRACT,
        value: 0.05,
        token: 'ETH',
        transactionType: 'contract_interaction',
        contractInteraction: true,
        timestamp: ts(hour),
      }),
    ],
  }
}

export function listedContractActivity() {
  return {
    address: SUBJECT,
    chain: 'ethereum',
    transactions: [
      transfer({
        hash: '0xlisted1',
        to: DEMO_ADDRESSES.flaggedContract,
        value: 0,
        transactionType: 'contract_interaction',
        contractInteraction: true,
        timestamp: ts(),
      }),
    ],
  }
}

export function shortRepeatBurst() {
  const transactions = Array.from({ length: 5 }, (_, index) =>
    transfer({
      hash: `0xburst${index + 1}`,
      to: NEUTRAL,
      value: 0.02,
      timestamp: ts(index * 60 * 1000),
    }),
  )
  return { address: SUBJECT, chain: 'ethereum', transactions }
}

export { DEMO_ADDRESSES }
