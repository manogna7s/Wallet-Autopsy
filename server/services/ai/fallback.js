function strongest(briefing) {
  return briefing.signals[0] || null
}

function whyFor(signal) {
  switch (signal.type) {
    case 'unlimited_token_approval':
      return `An effectively unlimited ${signal.token || 'token'} approval means ${signal.spender || 'the spender'} may have permission to spend that token balance later, depending on the token and contract behavior.`
    case 'permission_exposure_risk':
      return 'Several spenders already have token permission, which widens who could move approved balances if those allowances stay in place.'
    case 'flagged_counterparty':
      return 'The engine matched a counterparty to a local intel list. That is a detected relationship, not proof of a crime.'
    case 'repeated_risky_interaction':
      return 'Repeated contact with a listed address makes the relationship more than a one-off transfer.'
    case 'relationship_risk':
      return 'Activity ties this wallet to a listed address. The link is on-chain; the intent is not proven.'
    case 'suspicious_contract_interaction':
      return 'The contract is unverified or unknown to this model. Unknown is not the same as malicious.'
    case 'unusual_transaction_pattern':
      return 'Timing or size in this window is unusual versus the rest of the fetched activity. That is a behavioral anomaly, not a confirmed attack.'
    default:
      return signal.summary || signal.title
  }
}

function exposureFor(signal) {
  switch (signal.type) {
    case 'unlimited_token_approval':
    case 'permission_exposure_risk':
      return `If the allowance remains, ${signal.spender || 'the spender'} may be able to move the approved ${signal.token || 'token'} without another signature from this wallet.`
    case 'flagged_counterparty':
    case 'repeated_risky_interaction':
    case 'relationship_risk':
      return 'Value or calls already connect this wallet to a listed address. Further interaction with that counterparty would extend the same relationship.'
    case 'suspicious_contract_interaction':
      return 'Calling an unknown contract can change balances or allowances in ways this model cannot simulate.'
    case 'unusual_transaction_pattern':
      return 'A burst or outlier transfer can move a large share of observed value in a short window.'
    default:
      return 'The detected signal describes potential exposure, not a guaranteed loss.'
  }
}

function checksFor(briefing) {
  const checks = []
  for (const signal of briefing.signals) {
    if (signal.type === 'unlimited_token_approval' || signal.type === 'permission_exposure_risk') {
      checks.push(
        `Confirm the current ${signal.token || 'token'} allowance to ${signal.spender || 'the spender'} and whether that approval was intended.`,
      )
    } else if (
      signal.type === 'flagged_counterparty' ||
      signal.type === 'repeated_risky_interaction' ||
      signal.type === 'relationship_risk'
    ) {
      const peer = signal.addresses?.[0]
      checks.push(
        peer
          ? `Open the listed counterparty ${peer} on a block explorer and compare it with the engine evidence.`
          : 'Open the listed counterparty on a block explorer and compare it with the engine evidence.',
      )
    } else if (signal.affectedTransactions?.length) {
      checks.push(`Verify transaction ${signal.affectedTransactions[0]} against the engine evidence.`)
    }
  }
  checks.push('Treat this write-up as an explanation of engine findings, not a decision to send funds or sign.')
  return [...new Set(checks)].slice(0, 5)
}

function evidenceLines(briefing) {
  const lines = []
  for (const signal of briefing.signals) {
    const who = signal.spender || signal.addresses?.[0]
    const tx = signal.affectedTransactions?.[0]
    const bits = [signal.title]
    if (signal.token) bits.push(signal.token)
    if (who) bits.push(who)
    if (tx) bits.push(tx)
    lines.push(bits.join(' · '))
  }
  return [...new Set(lines)].slice(0, 6)
}

export function buildFallback(briefing) {
  if (!briefing.hasFindings) {
    return {
      summary: `No security signals were detected in the fetched activity. The Wallet Autopsy Risk Model score is ${briefing.score}. There is not enough of a finding here for a deeper narrative.`,
      keyFindings: ['No configured signals fired on the verified activity in this window.'],
      evidenceExplanation: briefing.evidence.map((row) => `${row.label}: ${row.value}`).slice(0, 6),
      whyItMatters: [
        'With no engine signals, this write-up cannot describe a specific approval, listed counterparty, or behavioral anomaly.',
      ],
      potentialExposure: [
        'No potential exposure was identified from the fetched transfers and detectable approvals.',
      ],
      whatToCheck: [
        'If this address is new or the history was truncated, fetch a wider window before treating absence of signals as a complete picture.',
      ],
      uncertainty:
        'Empty or thin history is not proof the wallet is safe. This model only sees the fetched Ethereum activity and does not simulate contract behavior.',
    }
  }

  const top = strongest(briefing)
  const titles = briefing.signals.map((signal) => signal.title)
  const lead =
    top?.type === 'unlimited_token_approval'
      ? `Several security signals were detected. The strongest signal is an effectively unlimited token approval to ${top.spender || 'a spender'}. This means ${top.spender || 'that contract'} may have permission to spend the approved ${top.token || 'token'} balance, depending on the token and contract behavior.`
      : `Several security signals were detected. The strongest signal is ${top.title.toLowerCase()}. The Wallet Autopsy Risk Model scored this ${briefing.score} (${briefing.severity}) from those verified findings.`

  return {
    summary: lead,
    keyFindings: [...new Set(titles)],
    evidenceExplanation: evidenceLines(briefing),
    whyItMatters: [...new Set(briefing.signals.map(whyFor))],
    potentialExposure: [...new Set(briefing.signals.map(exposureFor))],
    whatToCheck: checksFor(briefing),
    uncertainty:
      'This does not prove malicious intent, predict an attack, or guarantee safety. Approvals, listings, and behavioral flags are only as complete as the fetched window and the local intel list.',
  }
}
