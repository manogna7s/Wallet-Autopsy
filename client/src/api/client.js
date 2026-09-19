const BASE = import.meta.env.VITE_API_URL ?? ''

export async function request(path, options = {}) {
  const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers }
  let res
  try {
    res = await fetch(`${BASE}${path}`, { credentials: 'include', ...options, headers })
  } catch {
    const error = new Error('Cannot reach the investigation API. Is the server running?')
    error.status = 0
    throw error
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`
    let code
    try {
      const body = await res.json()
      if (body?.error) message = body.error
      if (body?.code) code = body.code
    } catch {
      /* ignore */
    }
    const error = new Error(message)
    error.status = res.status
    error.code = code
    throw error
  }

  if (res.status === 204) return null
  return res.json()
}

export function getHealth() {
  return request('/api/health')
}

export function investigateAddress(address, chain = 'ethereum') {
  const path = `/api/investigate/${encodeURIComponent(address)}?chain=${encodeURIComponent(chain)}`
  return request(path)
}

export function analyzeRisk(payload) {
  return request('/api/risk/analyze', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function explainInvestigation(payload) {
  return request('/api/ai/investigate', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function previewTransaction(payload) {
  return request('/api/preview/transaction', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function explainTransactionPreview(payload) {
  return request('/api/preview/explain', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function listHistory() {
  return request('/api/history')
}

export function getSavedInvestigation(id) {
  return request(`/api/history/${encodeURIComponent(id)}`)
}

export function listWatchlist() {
  return request('/api/watchlist')
}

export function addWatchlist(payload) {
  return request('/api/watchlist', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function deleteWatchlist(id) {
  return request(`/api/watchlist/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
