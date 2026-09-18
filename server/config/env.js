import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
dotenv.config({ path: path.join(root, '.env') })
dotenv.config({ path: path.join(root, 'server', '.env') })

function number(name, fallback) {
  const raw = process.env[name]
  const n = raw == null || raw === '' ? fallback : Number(raw)
  return Number.isFinite(n) ? n : fallback
}

export const env = {
  port: number('PORT', 3002),
  clientOrigin: process.env.CLIENT_ORIGIN || true,
  alchemyKey: process.env.ALCHEMY_API_KEY || '',
  alchemyNetwork: process.env.ALCHEMY_NETWORK || 'eth-mainnet',
  alchemyTimeoutMs: number('ALCHEMY_TIMEOUT_MS', 18000),
  cacheTtlMs: number('ACTIVITY_CACHE_TTL_MS', 5 * 60 * 1000),
  maxTransfers: number('ACTIVITY_MAX_TRANSFERS', 200),
}
