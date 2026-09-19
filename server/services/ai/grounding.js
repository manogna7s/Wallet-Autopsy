const HEX_RE = /0x[a-fA-F0-9]{4,}/g

const FORBIDDEN = [
  { re: /\bthis wallet is (a )?malicious\b/gi, to: 'security signals were detected' },
  { re: /\bthis wallet is a scam\b/gi, to: 'security signals were detected' },
  { re: /\b(this wallet )?will be hacked\b/gi, to: 'potential exposure was detected' },
  { re: /\battack confirmed\b/gi, to: 'detected relationship' },
  { re: /\bguaranteed (to be )?safe\b/gi, to: 'not a guarantee of safety' },
  { re: /\bdefinitely (a )?(scam|hacker|malicious)\b/gi, to: 'not independently classified as malicious' },
  { re: /\bmalicious intent is (certain|proven|clear)\b/gi, to: 'malicious intent is not proven' },
  { re: /\bdo not sign\b/gi, to: 'review this transaction carefully' },
  { re: /\bdon't sign\b/gi, to: 'review this transaction carefully' },
  { re: /\byou should sign\b/gi, to: 'review this transaction carefully' },
  { re: /\byou should not sign\b/gi, to: 'review this transaction carefully' },
]

const STRING_FIELDS = ['summary', 'uncertainty']
const ARRAY_FIELDS = [
  'keyFindings',
  'evidenceExplanation',
  'whyItMatters',
  'potentialExposure',
  'whatToCheck',
]

function extractJson(text) {
  const trimmed = String(text || '').trim()
  if (!trimmed) return null
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const raw = fenced ? fenced[1].trim() : trimmed
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try {
    return JSON.parse(raw.slice(start, end + 1))
  } catch {
    return null
  }
}

function clip(value, max) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim()
  if (!text) return ''
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

function groundText(value, allowedHex) {
  let text = clip(value, 600)
  if (!text) return ''
  text = text.replace(HEX_RE, (match) => {
    const key = match.toLowerCase()
    if (allowedHex.has(key)) return match
    return '[not in verified findings]'
  })
  for (const rule of FORBIDDEN) text = text.replace(rule.re, rule.to)
  return clip(text, 500)
}

function groundList(value, allowedHex, maxItems = 6) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => groundText(item, allowedHex))
    .filter(Boolean)
    .slice(0, maxItems)
}

export function parseAndGround(raw, briefing) {
  const parsed = typeof raw === 'string' ? extractJson(raw) : raw && typeof raw === 'object' ? raw : null
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null

  const allowedHex = briefing.allowedHex || new Set()
  const summary = groundText(parsed.summary, allowedHex)
  if (!summary) return null

  const report = {
    summary,
    keyFindings: groundList(parsed.keyFindings, allowedHex),
    evidenceExplanation: groundList(parsed.evidenceExplanation, allowedHex, 8),
    whyItMatters: groundList(parsed.whyItMatters, allowedHex),
    potentialExposure: groundList(parsed.potentialExposure, allowedHex),
    whatToCheck: groundList(parsed.whatToCheck, allowedHex),
    uncertainty: groundText(parsed.uncertainty, allowedHex) ||
      'This explanation is limited to verified engine findings and does not prove intent.',
  }

  if (!report.keyFindings.length && briefing.hasFindings) {
    report.keyFindings = briefing.signals.map((signal) => signal.title).slice(0, 6)
  }

  for (const field of ARRAY_FIELDS) {
    if (!Array.isArray(report[field])) return null
  }
  for (const field of STRING_FIELDS) {
    if (typeof report[field] !== 'string') return null
  }
  return report
}

export { extractJson }
