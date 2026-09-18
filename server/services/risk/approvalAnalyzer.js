import { SIGNAL_WEIGHTS, PERMISSION, MAX_UINT256 } from './config.js'
import { isApprovalEvent, isUnlimitedAmount, uniqueHashes, roundConfidence } from './helpers.js'
import { buildEvidence, evidenceItem } from './evidenceBuilder.js'

function allowanceDisplay(row) {
  if (isUnlimitedAmount(row)) return 'Unlimited (effectively max uint256)'
  if (row.value != null) return String(row.value)
  return undefined
}

function approvalConfidence(row, unlimited) {
  let value = unlimited ? 0.72 : 0.5
  if (row.hash) value += 0.1
  if (row.timestamp) value += 0.06
  if (row.tokenAddress) value += 0.05
  if (row.spender) value += 0.05
  if (!row.hash) value -= 0.18
  return roundConfidence(value)
}

function makeApprovalSignal(row, index) {
  const spec = SIGNAL_WEIGHTS.unlimited_token_approval
  const allowance = allowanceDisplay(row)
  return {
    id: `unlimited_token_approval:${row.hash || row.uniqueId || index}`,
    type: 'unlimited_token_approval',
    title: 'Unlimited token approval',
    severity: spec.severity,
    weight: spec.weight,
    confidence: approvalConfidence(row, true),
    summary:
      'Potential exposure detected: an ERC-20 allowance was set to an effectively unlimited amount.',
    token: row.token,
    tokenAddress: row.tokenAddress,
    spender: row.spender || row.to,
    allowance,
    timestamp: row.timestamp,
    evidence: buildEvidence([
      evidenceItem('Token', row.token),
      evidenceItem('Token address', row.tokenAddress),
      evidenceItem('Spender', row.spender || row.to),
      evidenceItem('Allowance', allowance),
      evidenceItem('Transaction', row.hash),
      evidenceItem('Timestamp', row.timestamp),
      evidenceItem('Status', row.status),
    ]),
    affectedTransactions: uniqueHashes([row]),
  }
}

export function analyzeApprovals({ transactions }) {
  const approvals = transactions.filter(isApprovalEvent)
  const signals = []

  approvals.forEach((row, index) => {
    if (isUnlimitedAmount(row)) signals.push(makeApprovalSignal(row, index))
  })

  const spenders = new Set(
    approvals.map((row) => row.spender || row.to).filter(Boolean),
  )
  const unlimitedSpenders = new Set(
    approvals.filter(isUnlimitedAmount).map((row) => row.spender || row.to).filter(Boolean),
  )

  const broadSurface =
    unlimitedSpenders.size >= PERMISSION.distinctUnlimitedSpenders ||
    spenders.size >= PERMISSION.distinctSpenders

  if (broadSurface) {
    const spec = SIGNAL_WEIGHTS.permission_exposure_risk
    const rows = approvals.filter((row) => isUnlimitedAmount(row) || spenders.size >= PERMISSION.distinctSpenders)
    signals.push({
      id: 'permission_exposure_risk:allowance-surface',
      type: 'permission_exposure_risk',
      title: 'Permission / exposure risk',
      severity: spec.severity,
      weight: spec.weight,
      confidence: roundConfidence(0.64 + Math.min(0.2, spenders.size * 0.04)),
      summary:
        'Potential exposure detected: this address has granted allowances to multiple spenders.',
      evidence: buildEvidence([
        evidenceItem('Distinct spenders', String(spenders.size)),
        evidenceItem('Unlimited spenders', String(unlimitedSpenders.size)),
        evidenceItem('Approvals in set', String(approvals.length)),
        evidenceItem('Max uint256', MAX_UINT256.toString()),
      ]),
      affectedTransactions: uniqueHashes(rows),
    })
  }

  return signals
}
