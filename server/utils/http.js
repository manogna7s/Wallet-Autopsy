export class HttpError extends Error {
  constructor(status, message, code) {
    super(message)
    this.status = status
    this.code = code
    this.name = 'HttpError'
  }
}

export function sanitizeProviderMessage(message) {
  return String(message || 'Provider error')
    .replace(/\/v2\/[A-Za-z0-9_-]+/g, '/v2/***')
    .replace(/alchemy\.com\/[^\s]+/gi, 'alchemy.com/***')
}

export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

export function errorHandler(err, req, res, _next) {
  const status = err.status || err.statusCode || 500
  const raw = status === 500 ? 'Internal server error' : err.message
  const message = sanitizeProviderMessage(raw)
  if (status >= 500) console.error(sanitizeProviderMessage(err.stack || err.message))
  res.status(status).json({
    error: message,
    status,
    code: err.code || undefined,
  })
}

export function notFound(req, res, next) {
  next(new HttpError(404, `No route for ${req.method} ${req.path}`))
}
