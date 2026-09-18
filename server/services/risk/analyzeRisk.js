import { MAX_ANALYZED_EVENTS, MODEL_NAME } from './config.js'
import { analyzeApprovals } from './approvalAnalyzer.js'
import { analyzeTransactions } from './transactionAnalyzer.js'
import { analyzeCounterparties } from './counterpartyAnalyzer.js'
import { analyzeContracts } from './contractAnalyzer.js'
import { analyzeBehavior } from './behaviorAnalyzer.js'
import { buildOverallEvidence } from './evidenceBuilder.js'
import { finalizeAnalysis } from './riskScorer.js'
import { normalizeAddress } from '../../utils/address.js'

function compactAnalysis(analysis) {
  const out = { ...analysis }
  if (!out.evidence?.length) delete out.evidence
  if (!out.scoreBreakdown?.length) delete out.scoreBreakdown
  return out
}

export function analyzeRisk(input = {}) {
  const address = normalizeAddress(input.address)
  const chain = input.chain || 'ethereum'
  const transactions = Array.isArray(input.transactions)
    ? input.transactions.slice(0, MAX_ANALYZED_EVENTS)
    : []
  const extraListings = Array.isArray(input.listings) ? input.listings : []
  const context = {
    address,
    chain,
    transactions,
    truncated: Boolean(input.truncated),
    notices: input.notices || [],
    extraListings,
  }

  const signals = [
    ...analyzeApprovals(context),
    ...analyzeTransactions(context),
    ...analyzeCounterparties(context),
    ...analyzeContracts(context),
    ...analyzeBehavior(context),
  ]

  const overallEvidence = buildOverallEvidence(signals, context)
  return compactAnalysis(
    finalizeAnalysis({
      address,
      chain,
      signals,
      context: { ...context, overallEvidence },
    }),
  )
}

export { MODEL_NAME }
