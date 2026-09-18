import axios from 'axios'
import { env } from '../../config/env.js'
import { HttpError, sanitizeProviderMessage } from '../../utils/http.js'
import { ERC20_APPROVAL_TOPIC } from './tokenService.js'
import { padTopicAddress } from '../../utils/address.js'

function rpcUrl() {
  if (!env.alchemyKey) {
    throw new HttpError(503, 'Alchemy is not configured on the server.', 'ALCHEMY_NOT_CONFIGURED')
  }
  return `https://${env.alchemyNetwork}.g.alchemy.com/v2/${env.alchemyKey}`
}

function classifyRpcError(error) {
  const status = error.response?.status
  const message = sanitizeProviderMessage(
    error.response?.data?.error?.message || error.message || 'Alchemy request failed',
  )

  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || message.toLowerCase().includes('timeout')) {
    return new HttpError(504, 'Alchemy timed out while fetching activity.', 'PROVIDER_TIMEOUT')
  }
  if (status === 429) {
    return new HttpError(429, 'Alchemy rate limit reached. Try again shortly.', 'PROVIDER_RATE_LIMIT')
  }
  if (status === 401 || status === 403) {
    return new HttpError(502, 'Alchemy rejected the request. Check the server API key.', 'PROVIDER_AUTH')
  }
  if (status && status >= 500) {
    return new HttpError(502, 'Alchemy is unavailable.', 'PROVIDER_UNAVAILABLE')
  }
  return new HttpError(502, message, 'PROVIDER_ERROR')
}

export async function alchemyRpc(method, params = []) {
  let response
  try {
    response = await axios.post(
      rpcUrl(),
      { jsonrpc: '2.0', id: 1, method, params },
      {
        timeout: env.alchemyTimeoutMs,
        headers: { 'Content-Type': 'application/json' },
        validateStatus: () => true,
      },
    )
  } catch (error) {
    throw classifyRpcError(error)
  }

  if (response.status === 429) {
    throw classifyRpcError({ response, message: 'rate limited' })
  }
  if (response.status === 401 || response.status === 403) {
    throw classifyRpcError({ response, message: 'unauthorized' })
  }
  if (response.status >= 400) {
    throw classifyRpcError({
      response,
      message: response.data?.error?.message || `Alchemy HTTP ${response.status}`,
    })
  }
  if (response.data?.error) {
    throw new HttpError(
      502,
      sanitizeProviderMessage(response.data.error.message || 'Alchemy RPC error'),
      'PROVIDER_ERROR',
    )
  }
  return response.data?.result
}

export async function getAssetTransfers(query) {
  return alchemyRpc('alchemy_getAssetTransfers', [query])
}

export async function getLatestBlockNumber() {
  const hex = await alchemyRpc('eth_blockNumber')
  return Number.parseInt(hex, 16)
}

export async function getCode(address) {
  return alchemyRpc('eth_getCode', [address, 'latest'])
}

export async function getApprovalLogs({ owner, fromBlock, toBlock = 'latest' }) {
  return alchemyRpc('eth_getLogs', [
    {
      fromBlock,
      toBlock,
      topics: [ERC20_APPROVAL_TOPIC, padTopicAddress(owner)],
    },
  ])
}

export function toHexBlock(n) {
  return `0x${Number(n).toString(16)}`
}
