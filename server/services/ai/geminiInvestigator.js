import { env } from '../../config/env.js'
import { buildVerifiedBriefing, formatBriefing } from './briefing.js'
import { buildFallback } from './fallback.js'
import { generateContent as defaultGenerateContent } from './geminiClient.js'
import { parseAndGround } from './grounding.js'

function packageResult(briefing, report, { source, fallbackReason, explainer }) {
  return {
    source,
    fallbackReason: fallbackReason || null,
    generatedFrom: 'verified on-chain findings',
    explainer: explainer || (source === 'gemini' ? env.geminiModel : 'deterministic_template'),
    address: briefing.address,
    chain: briefing.chain,
    score: briefing.score,
    severity: briefing.severity,
    confidence: briefing.confidence,
    summary: report.summary,
    keyFindings: report.keyFindings,
    evidenceExplanation: report.evidenceExplanation,
    whyItMatters: report.whyItMatters || [],
    potentialExposure: report.potentialExposure,
    whatToCheck: report.whatToCheck,
    uncertainty: report.uncertainty,
  }
}

export async function investigateFindings(input, deps = {}) {
  const briefing = buildVerifiedBriefing(input)
  const generate = deps.generateContent || defaultGenerateContent

  if (!briefing.hasFindings) {
    return packageResult(briefing, buildFallback(briefing), {
      source: 'fallback',
      fallbackReason: 'missing_findings',
    })
  }

  const canCall = Boolean(deps.generateContent) || Boolean(env.geminiKey)
  if (!canCall) {
    return packageResult(briefing, buildFallback(briefing), {
      source: 'fallback',
      fallbackReason: 'not_configured',
    })
  }

  try {
    const raw = await generate({
      user: formatBriefing(briefing),
      timeoutMs: env.geminiTimeoutMs,
    })
    const grounded = parseAndGround(raw, briefing)
    if (!grounded) {
      return packageResult(briefing, buildFallback(briefing), {
        source: 'fallback',
        fallbackReason: 'malformed',
      })
    }
    return packageResult(briefing, grounded, { source: 'gemini' })
  } catch (error) {
    const reason =
      error.code === 'GEMINI_TIMEOUT' ? 'timeout' : error.code === 'GEMINI_EMPTY' ? 'malformed' : 'api_failure'
    return packageResult(briefing, buildFallback(briefing), {
      source: 'fallback',
      fallbackReason: reason,
    })
  }
}

export { buildVerifiedBriefing, formatBriefing, parseAndGround, buildFallback }
