import axios from 'axios'
import { env } from '../../config/env.js'
import { HttpError, sanitizeProviderMessage } from '../../utils/http.js'
import { RESPONSE_SCHEMA, SYSTEM_PROMPT } from './prompt.js'

function classifyGeminiError(error) {
  const status = error.response?.status
  const message = sanitizeProviderMessage(
    error.response?.data?.error?.message || error.message || 'Gemini request failed',
  )
  const timedOut =
    error.code === 'ECONNABORTED' ||
    error.code === 'ETIMEDOUT' ||
    error.code === 'GEMINI_TIMEOUT' ||
    /timeout/i.test(message)

  if (timedOut) {
    const wrapped = new HttpError(504, 'Gemini timed out while writing the investigation.', 'GEMINI_TIMEOUT')
    wrapped.code = 'GEMINI_TIMEOUT'
    return wrapped
  }
  if (status === 429) {
    return new HttpError(429, 'Gemini rate limit reached. Using the engine template instead.', 'GEMINI_RATE_LIMIT')
  }
  if (status === 401 || status === 403) {
    return new HttpError(502, 'Gemini rejected the request. Check the server API key.', 'GEMINI_AUTH')
  }
  if (status && status >= 500) {
    return new HttpError(502, 'Gemini is unavailable.', 'GEMINI_UNAVAILABLE')
  }
  return new HttpError(502, message, 'GEMINI_ERROR')
}

export async function generateContent({ user, timeoutMs } = {}) {
  const key = env.geminiKey
  if (!key) {
    throw new HttpError(503, 'Gemini is not configured on the server.', 'GEMINI_NOT_CONFIGURED')
  }

  const model = env.geminiModel
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`
  let response
  try {
    response = await axios.post(
      url,
      {
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
      },
      {
        timeout: timeoutMs || env.geminiTimeoutMs,
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': key,
        },
        validateStatus: () => true,
      },
    )
  } catch (error) {
    throw classifyGeminiError(error)
  }

  if (response.status >= 400) {
    throw classifyGeminiError({ response, message: response.data?.error?.message })
  }

  const text = response.data?.candidates?.[0]?.content?.parts?.map((part) => part.text).filter(Boolean).join('\n')
  if (!text) {
    throw new HttpError(502, 'Gemini returned an empty investigation.', 'GEMINI_EMPTY')
  }
  return text
}
