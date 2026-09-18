export function cn(...parts) {
  return parts.filter(Boolean).join(' ')
}

export function formatDate(iso) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(iso))
}

export function formatDateTime(iso) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(iso))
}

export function formatNumber(value) {
  if (value == null || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('en-US').format(value)
}

export function formatTokenValue(value, token) {
  if (value == null || value === '') return '—'
  const text = String(value)
  const compact = text.length > 22 && /^\d+$/.test(text) ? `${text.slice(0, 6)}…${text.slice(-4)}` : text
  return token ? `${compact} ${token}` : compact
}

export function toneFor(severity) {
  if (severity === 'elevated') return 'high'
  if (severity === 'moderate') return 'medium'
  return severity || 'info'
}

export function riskTone(score) {
  if (score >= 80) return 'critical'
  if (score >= 55) return 'high'
  if (score >= 30) return 'medium'
  if (score > 0) return 'low'
  return 'info'
}
