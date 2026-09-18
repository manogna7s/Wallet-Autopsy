const BASE = import.meta.env.VITE_API_URL ?? ''

export async function request(path, options = {}) {
  const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers }
  let res
  try {
    res = await fetch(`${BASE}${path}`, { ...options, headers })
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
