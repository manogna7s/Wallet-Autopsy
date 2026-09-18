export const ERC20_APPROVAL_TOPIC =
  '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925'

export const MAX_UINT256_HEX = `0x${'f'.repeat(64)}`

export function compact(record) {
  const out = {}
  for (const [key, value] of Object.entries(record)) {
    if (value === undefined || value === null || value === '') continue
    out[key] = value
  }
  return out
}

export function hexToBigInt(value) {
  if (value == null || value === '') return null
  const hex = String(value)
  if (!hex.startsWith('0x')) return null
  try {
    return BigInt(hex)
  } catch {
    return null
  }
}

export function isUnlimitedAllowance(data) {
  if (!data) return false
  const hex = String(data).toLowerCase()
  if (hex === MAX_UINT256_HEX) return true
  const amount = hexToBigInt(hex)
  if (amount == null) return false
  const max = BigInt(MAX_UINT256_HEX)
  return amount >= max / 2n
}

export function topicToAddress(topic) {
  if (!topic || topic.length < 42) return undefined
  return `0x${String(topic).slice(-40).toLowerCase()}`
}

export function decodeApprovalLog(log) {
  const owner = topicToAddress(log.topics?.[1])
  const spender = topicToAddress(log.topics?.[2])
  const unlimited = isUnlimitedAllowance(log.data)
  const amount = hexToBigInt(log.data)
  return compact({
    owner,
    spender,
    unlimited,
    value: amount != null ? amount.toString() : undefined,
  })
}
