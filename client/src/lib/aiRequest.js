export function buildAiRequest(data) {
  if (!data) return null
  const graph = data.graph || { nodes: [], edges: [] }
  const path = data.riskPath || { steps: [] }
  const signalLinked = (data.timeline || []).filter((event) => event.hasSignal)
  const important = (signalLinked.length ? signalLinked : data.timeline || []).slice(0, 12)

  return {
    address: data.address,
    chain: data.network || 'ethereum',
    riskScore: data.risk?.score ?? 0,
    severity: data.risk?.severity || 'low',
    confidence: data.risk?.confidence || null,
    signals: (data.signals || []).map((signal) => ({
      id: signal.id,
      type: signal.type,
      title: signal.title,
      severity: signal.severity,
      summary: signal.summary,
      confidence: signal.confidence,
      contribution: signal.contribution,
      spender: signal.spender,
      token: signal.token,
      tokenAddress: signal.tokenAddress,
      allowance: signal.allowance,
      addresses: signal.addresses,
      evidence: signal.evidence,
      affectedTransactions: signal.affectedTransactions,
    })),
    evidence: data.risk?.evidence || [],
    graphSummary: {
      caption: path.caption,
      steps: path.steps,
      counts: data.forensic?.items || [],
      nodes: (graph.nodes || []).slice(0, 12).map((node) => ({
        type: node.type,
        address: node.address,
        label: node.display || node.label,
        highlight: node.highlight,
        interactionCount: node.interactionCount,
      })),
      edges: (graph.edges || []).slice(0, 16).map((edge) => ({
        kind: edge.kind,
        count: edge.count,
        source: edge.source,
        target: edge.target,
      })),
    },
    importantTransactions: important.map((event) => ({
      hash: event.hash,
      transactionType: event.transactionType,
      typeLabel: event.typeLabel,
      from: event.from,
      to: event.to,
      spender: event.spender,
      token: event.token,
      tokenAddress: event.tokenAddress,
      value: event.value,
      timestamp: event.at,
      status: event.status,
    })),
  }
}
