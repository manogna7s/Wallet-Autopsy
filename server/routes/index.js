import { Router } from 'express'
import { asyncHandler, HttpError } from '../utils/http.js'
import { env } from '../config/env.js'
import { isAddress, normalizeAddress } from '../utils/address.js'
import { analyzeRisk, MODEL_NAME } from '../services/risk/analyzeRisk.js'
import { investigateFindings } from '../services/ai/geminiInvestigator.js'
import { runInvestigation } from '../services/investigationPipeline.js'
import { SUPPORTED_CHAINS, resolveChain } from '../services/blockchain/chains.js'
import {
  addWatchItem,
  getHistoryById,
  listHistory,
  listWatchItems,
  persistenceStatus,
  removeWatchItem,
} from '../services/db/persistence.js'
import { previewTransaction, buildSigningFallback } from '../services/preview/transactionPreview.js'
import { explainTransactionPreview } from '../services/preview/previewExplain.js'

const router = Router()

router.get('/health', (req, res) => {
  res.json({
    ok: true,
    alchemy: {
      configured: Boolean(env.alchemyKey),
      network: env.alchemyNetwork,
    },
    gemini: {
      configured: Boolean(env.geminiKey),
      model: env.geminiModel,
    },
    mongodb: persistenceStatus(),
    riskModel: MODEL_NAME,
    chains: Object.keys(SUPPORTED_CHAINS),
  })
})

router.get(
  '/investigate/:address',
  asyncHandler(async (req, res) => {
    const payload = await runInvestigation({
      address: req.params.address,
      chainId: req.query.chain || req.query.network || 'ethereum',
      sessionId: req.sessionId,
    })
    res.json(payload)
  }),
)

router.post(
  '/risk/analyze',
  asyncHandler(async (req, res) => {
    const body = req.body || {}
    const address = body.address
    const chainId = body.chain || body.network || 'ethereum'
    const transactions = body.transactions || body.activity

    if (!isAddress(address)) {
      throw new HttpError(400, 'Enter a valid 42-character EVM address (0x…).', 'INVALID_ADDRESS')
    }
    const chain = resolveChain(chainId)
    if (!chain) {
      throw new HttpError(400, 'Unsupported network. Ethereum Mainnet is available in this MVP.', 'UNSUPPORTED_NETWORK')
    }
    if (!Array.isArray(transactions)) {
      throw new HttpError(400, 'Provide normalized transactions as an array.', 'INVALID_ACTIVITY')
    }

    const analysis = analyzeRisk({
      address: normalizeAddress(address),
      chain: chain.id,
      transactions,
      truncated: Boolean(body.truncated),
      notices: body.notices,
      listings: body.listings,
    })
    res.json(analysis)
  }),
)

router.post(
  '/ai/investigate',
  asyncHandler(async (req, res) => {
    const body = req.body || {}
    const address = body.address
    const chainId = body.chain || body.network || 'ethereum'

    if (!isAddress(address)) {
      throw new HttpError(400, 'Enter a valid 42-character EVM address (0x…).', 'INVALID_ADDRESS')
    }
    const chain = resolveChain(chainId)
    if (!chain) {
      throw new HttpError(400, 'Unsupported network. Ethereum Mainnet is available in this MVP.', 'UNSUPPORTED_NETWORK')
    }

    const report = await investigateFindings({
      ...body,
      address: normalizeAddress(address),
      chain: chain.id,
    })
    res.json(report)
  }),
)

router.get(
  '/history',
  asyncHandler(async (req, res) => {
    const items = await listHistory(req.sessionId)
    res.json({ items, storage: persistenceStatus().storage })
  }),
)

router.get(
  '/history/:id',
  asyncHandler(async (req, res) => {
    const payload = await getHistoryById(req.sessionId, req.params.id)
    if (!payload) {
      throw new HttpError(404, 'Saved investigation not found.', 'HISTORY_NOT_FOUND')
    }
    res.json(payload)
  }),
)

router.get(
  '/watchlist',
  asyncHandler(async (req, res) => {
    const items = await listWatchItems(req.sessionId)
    res.json({ items, storage: persistenceStatus().storage })
  }),
)

router.post(
  '/watchlist',
  asyncHandler(async (req, res) => {
    const body = req.body || {}
    if (!isAddress(body.address)) {
      throw new HttpError(400, 'Enter a valid 42-character EVM address (0x…).', 'INVALID_ADDRESS')
    }
    const chain = resolveChain(body.chain || body.network || 'ethereum')
    if (!chain) {
      throw new HttpError(400, 'Unsupported network. Ethereum Mainnet is available in this MVP.', 'UNSUPPORTED_NETWORK')
    }
    try {
      const item = await addWatchItem(req.sessionId, {
        address: normalizeAddress(body.address),
        chain: chain.id,
        label: typeof body.label === 'string' ? body.label.slice(0, 80) : '',
      })
      res.status(201).json(item)
    } catch {
      throw new HttpError(503, 'Watchlist is temporarily unavailable.', 'MONGODB_UNAVAILABLE')
    }
  }),
)

function parsePreviewBody(body) {
  const address = body?.address
  const chainId = body?.chain || body?.network || 'ethereum'
  const transactions = body?.transactions || body?.activity
  const transaction = body?.transaction || body?.selected

  if (!isAddress(address)) {
    throw new HttpError(400, 'Enter a valid 42-character EVM address (0x…).', 'INVALID_ADDRESS')
  }
  const chain = resolveChain(chainId)
  if (!chain) {
    throw new HttpError(400, 'Unsupported network. Ethereum Mainnet is available in this MVP.', 'UNSUPPORTED_NETWORK')
  }
  if (!Array.isArray(transactions) || !transactions.length) {
    throw new HttpError(400, 'Provide the fetched ledger as a transactions array.', 'INVALID_ACTIVITY')
  }

  const preview = previewTransaction({
    address: normalizeAddress(address),
    chain: chain.id,
    transaction,
    transactions,
  })
  if (!preview) {
    throw new HttpError(400, 'Select a transaction from the investigated wallet.', 'INVALID_TRANSACTION')
  }
  return preview
}

router.post(
  '/preview/transaction',
  asyncHandler(async (req, res) => {
    res.json(parsePreviewBody(req.body || {}))
  }),
)

router.post(
  '/preview/explain',
  asyncHandler(async (req, res) => {
    const preview = parsePreviewBody(req.body || {})
    try {
      const report = await explainTransactionPreview(preview)
      res.json({ preview, report })
    } catch {
      const template = buildSigningFallback(preview)
      res.json({
        preview,
        report: {
          source: 'fallback',
          fallbackReason: 'api_failure',
          generatedFrom: 'verified on-chain findings',
          explainer: 'deterministic_template',
          address: preview.address,
          chain: preview.chain,
          score: preview.riskImpact?.walletScore ?? 0,
          severity: preview.riskImpact?.walletSeverity || 'low',
          confidence: preview.riskImpact?.confidence || null,
          ...template,
        },
      })
    }
  }),
)

router.delete(
  '/watchlist/:id',
  asyncHandler(async (req, res) => {
    try {
      const removed = await removeWatchItem(req.sessionId, req.params.id)
      if (!removed) {
        throw new HttpError(404, 'Watchlist item not found.', 'WATCHLIST_NOT_FOUND')
      }
      res.status(204).end()
    } catch (error) {
      if (error instanceof HttpError) throw error
      throw new HttpError(503, 'Watchlist is temporarily unavailable.', 'MONGODB_UNAVAILABLE')
    }
  }),
)

export default router
