import { normalizeAddress } from '../../utils/address.js'
import { compact } from './tokenService.js'

function metadataTimestamp(transfer) {
  return transfer?.metadata?.blockTimestamp || undefined
}

function mapCategory(category, contractInteraction) {
  if (category === 'erc20') return 'token_transfer'
  if (category === 'erc721' || category === 'erc1155' || category === 'specialnft') {
    return 'nft_transfer'
  }
  if (category === 'internal') return 'internal_transfer'
  if (contractInteraction) return 'contract_interaction'
  return 'transfer'
}

export function normalizeTransfer(transfer, { chain, subject, contracts }) {
  const from = transfer.from ? normalizeAddress(transfer.from) : undefined
  const to = transfer.to ? normalizeAddress(transfer.to) : undefined
  const tokenAddress = transfer.rawContract?.address
    ? normalizeAddress(transfer.rawContract.address)
    : undefined
  const contractInteraction = Boolean(to && contracts?.has(to))
  const transactionType = mapCategory(transfer.category, contractInteraction)
  const direction =
    from === subject ? 'out' : to === subject ? 'in' : undefined

  return compact({
    hash: transfer.hash || undefined,
    timestamp: metadataTimestamp(transfer),
    chain,
    from,
    to,
    value: transfer.value ?? undefined,
    token: transfer.asset || undefined,
    tokenAddress,
    transactionType,
    contractInteraction: contractInteraction || undefined,
    status: transfer.hash ? 'confirmed' : undefined,
    uniqueId: transfer.uniqueId || undefined,
    blockNum: transfer.blockNum || undefined,
    category: transfer.category || undefined,
    direction,
  })
}

export function normalizeApproval(log, { chain, token, tokenAddress, decoded }) {
  return compact({
    hash: log.transactionHash || undefined,
    chain,
    from: decoded.owner,
    to: decoded.spender,
    value: decoded.value,
    token,
    tokenAddress: tokenAddress ? normalizeAddress(tokenAddress) : undefined,
    transactionType: 'approval',
    method: 'approve',
    status: log.transactionHash ? 'confirmed' : undefined,
    unlimited: decoded.unlimited || undefined,
    spender: decoded.spender,
    blockNum: log.blockNumber || undefined,
    uniqueId: log.transactionHash
      ? `${log.transactionHash}:approval:${log.logIndex ?? log.transactionIndex ?? ''}`
      : undefined,
  })
}

export function mergeAndSortActivity(transfers, approvals) {
  const byId = new Map()
  for (const row of [...transfers, ...approvals]) {
    const key = row.uniqueId || `${row.hash}:${row.transactionType}:${row.from}:${row.to}`
    if (!byId.has(key)) byId.set(key, row)
  }
  return [...byId.values()].sort((a, b) => {
    const ta = a.timestamp ? Date.parse(a.timestamp) : 0
    const tb = b.timestamp ? Date.parse(b.timestamp) : 0
    if (tb !== ta) return tb - ta
    return String(b.blockNum || '').localeCompare(String(a.blockNum || ''))
  })
}
