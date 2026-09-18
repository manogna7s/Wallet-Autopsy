import { Router } from 'express'
import { asyncHandler, HttpError } from '../utils/http.js'
import { env } from '../config/env.js'
import { isAddress, normalizeAddress } from '../utils/address.js'
import { investigateAddress } from '../services/investigateService.js'
import { analyzeRisk, MODEL_NAME } from '../services/risk/analyzeRisk.js'
import { SUPPORTED_CHAINS, resolveChain } from '../services/blockchain/chains.js'

const router = Router()

router.get('/health', (req, res) => {
  res.json({
    ok: true,
    alchemy: {
      configured: Boolean(env.alchemyKey),
      network: env.alchemyNetwork,
    },
    riskModel: MODEL_NAME,
    chains: Object.keys(SUPPORTED_CHAINS),
  })
})

router.get(
  '/investigate/:address',
  asyncHandler(async (req, res) => {
    const payload = await investigateAddress({
      address: req.params.address,
      chainId: req.query.chain || req.query.network || 'ethereum',
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

export default router
