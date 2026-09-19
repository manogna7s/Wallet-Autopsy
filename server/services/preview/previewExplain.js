import { investigateFindings } from '../ai/geminiInvestigator.js'
import { buildSigningFallback } from './transactionPreview.js'

export async function explainTransactionPreview(preview, deps = {}) {
  const template = buildSigningFallback(preview)
  const packaged = {
    source: 'fallback',
    fallbackReason: 'missing_findings',
    generatedFrom: 'verified on-chain findings',
    explainer: 'deterministic_template',
    address: preview.address,
    chain: preview.chain,
    score: preview.riskImpact?.walletScore ?? 0,
    severity: preview.riskImpact?.walletSeverity || 'low',
    confidence: preview.riskImpact?.confidence || null,
    ...template,
  }

  if (!(preview.signals || []).length) return packaged

  const findings = {
    address: preview.address,
    chain: preview.chain,
    riskScore: preview.riskImpact?.walletScore,
    severity: preview.riskImpact?.walletSeverity,
    confidence: preview.riskImpact?.confidence,
    signals: preview.signals || [],
    evidence: (preview.signals || []).flatMap((signal) => signal.evidence || []).slice(0, 12),
    importantTransactions: [preview.transaction, ...(preview.relatedHistory || [])].filter(Boolean),
    intent: 'signing_preview',
  }

  const report = await investigateFindings(findings, deps)
  if (report.source === 'fallback') {
    return {
      ...report,
      ...template,
      source: 'fallback',
      fallbackReason: report.fallbackReason,
      generatedFrom: 'verified on-chain findings',
    }
  }

  const summary = /review this transaction carefully/i.test(report.summary || '')
    ? report.summary
    : `${report.summary} Review this transaction carefully.`

  return {
    ...report,
    summary,
    whatToCheck: report.whatToCheck?.length ? report.whatToCheck : template.whatToCheck,
    uncertainty: report.uncertainty || template.uncertainty,
  }
}
