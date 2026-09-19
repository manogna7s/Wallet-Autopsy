import { randomUUID } from 'node:crypto'

export const SESSION_COOKIE = 'wa_sid'
const MAX_AGE = 60 * 60 * 24 * 30

function parseCookies(header) {
  const out = {}
  if (!header) return out
  for (const part of String(header).split(';')) {
    const index = part.indexOf('=')
    if (index < 0) continue
    const key = part.slice(0, index).trim()
    const value = part.slice(index + 1).trim()
    if (!key) continue
    try {
      out[key] = decodeURIComponent(value)
    } catch {
      out[key] = value
    }
  }
  return out
}

export function sessionMiddleware(req, res, next) {
  const cookies = parseCookies(req.headers.cookie)
  const existing = cookies[SESSION_COOKIE]
  const sessionId = existing && existing.length >= 16 ? existing : randomUUID()
  req.sessionId = sessionId
  if (existing !== sessionId) {
    res.append(
      'Set-Cookie',
      `${SESSION_COOKIE}=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}`,
    )
  }
  next()
}
