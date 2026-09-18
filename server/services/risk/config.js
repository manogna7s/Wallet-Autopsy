export const MODEL_NAME = 'Wallet Autopsy Risk Model'

export const MAX_ANALYZED_EVENTS = 500

export const MAX_UINT256 = (1n << 256n) - 1n

/** Additional events of the same signal type contribute less to the score. */
export const TYPE_DECAY = 0.45

/**
 * Signal weights live in one place so scoring stays explainable.
 * This is not an industry standard.
 */
export const SIGNAL_WEIGHTS = {
  unlimited_token_approval: { weight: 22, severity: 'high' },
  permission_exposure_risk: { weight: 12, severity: 'medium' },
  flagged_counterparty: { weight: 26, severity: 'high' },
  repeated_risky_interaction: { weight: 18, severity: 'high' },
  relationship_risk: { weight: 14, severity: 'medium' },
  suspicious_contract_interaction: { weight: 8, severity: 'info' },
  unusual_transaction_pattern: { weight: 11, severity: 'medium' },
}

export const SEVERITY_BANDS = [
  { min: 0, max: 19, id: 'low', label: 'Low' },
  { min: 20, max: 39, id: 'moderate', label: 'Moderate' },
  { min: 40, max: 64, id: 'elevated', label: 'Elevated' },
  { min: 65, max: 84, id: 'high', label: 'High' },
  { min: 85, max: 100, id: 'critical', label: 'Critical' },
]

export const CONFIDENCE_BANDS = [
  { min: 0, max: 0.39, id: 'low', label: 'Low' },
  { min: 0.4, max: 0.69, id: 'moderate', label: 'Moderate' },
  { min: 0.7, max: 0.89, id: 'high', label: 'High' },
  { min: 0.9, max: 1, id: 'strong', label: 'Strong' },
]

export const BEHAVIOR = {
  highFrequencyWindowMs: 60 * 60 * 1000,
  highFrequencyCount: 12,
  shortRepeatWindowMs: 10 * 60 * 1000,
  shortRepeatCount: 4,
  largeTransferMultiple: 8,
  minSamplesForOutlier: 5,
  contractBurstWindowMs: 30 * 60 * 1000,
  contractBurstUnique: 6,
  repeatedRiskyMin: 2,
}

export const PERMISSION = {
  distinctUnlimitedSpenders: 2,
  distinctSpenders: 3,
}

export function bandForScore(score) {
  const n = Math.max(0, Math.min(100, Number(score) || 0))
  return SEVERITY_BANDS.find((band) => n >= band.min && n <= band.max) || SEVERITY_BANDS[0]
}

export function bandForConfidence(value) {
  const n = Math.max(0, Math.min(1, Number(value) || 0))
  return CONFIDENCE_BANDS.find((band) => n >= band.min && n <= band.max) || CONFIDENCE_BANDS[0]
}
