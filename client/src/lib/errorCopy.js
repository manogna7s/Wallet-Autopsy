const BY_CODE = {
  PROVIDER_RATE_LIMIT: {
    title: 'Provider rate limit reached.',
    body: 'Try again shortly.',
  },
  PROVIDER_TIMEOUT: {
    title: 'Unable to retrieve blockchain activity.',
    body: 'The data provider timed out while fetching this address.',
  },
  PROVIDER_UNAVAILABLE: {
    title: 'Unable to retrieve blockchain activity.',
    body: 'The data provider is unavailable.',
  },
  PROVIDER_AUTH: {
    title: 'Unable to retrieve blockchain activity.',
    body: 'The data provider rejected the request.',
  },
  PROVIDER_ERROR: {
    title: 'Unable to retrieve blockchain activity.',
    body: 'The data provider could not complete this lookup.',
  },
  ALCHEMY_NOT_CONFIGURED: {
    title: 'Unable to retrieve blockchain activity.',
    body: 'The blockchain provider is not configured on the server.',
  },
  INVALID_ADDRESS: {
    title: 'Enter a valid 42-character EVM address (0x…).',
    body: 'This lookup only accepts a complete Ethereum address.',
  },
  UNSUPPORTED_NETWORK: {
    title: 'Unsupported network.',
    body: 'Ethereum Mainnet is available in this MVP.',
  },
  HISTORY_NOT_FOUND: {
    title: 'Saved investigation not found.',
    body: 'This session no longer has that report. Run the address again.',
  },
}

export function investigationErrorCopy(error) {
  if (!error) {
    return {
      title: 'Unable to retrieve blockchain activity.',
      body: 'The investigation could not be completed.',
    }
  }
  if (BY_CODE[error.code]) return BY_CODE[error.code]
  if (error.status === 429) return BY_CODE.PROVIDER_RATE_LIMIT
  if (error.status === 400 && /valid 42-character/i.test(error.message || '')) {
    return BY_CODE.INVALID_ADDRESS
  }
  if (error.status >= 500) {
    return {
      title: 'Unable to retrieve blockchain activity.',
      body: 'The investigation API failed while processing this address.',
    }
  }
  if (error.status === 0) {
    return {
      title: 'Unable to retrieve blockchain activity.',
      body: 'Cannot reach the investigation API.',
    }
  }
  return {
    title: 'Unable to retrieve blockchain activity.',
    body: error.message || 'The investigation could not be completed.',
  }
}

export const AI_UNAVAILABLE =
  'AI explanation unavailable. Deterministic findings are still available.'

export const EMPTY_ACTIVITY = {
  title: 'No sufficient activity found for this address.',
  body: 'No transfers or approvals in the fetched window. The Wallet Autopsy Risk Model scored this 0.',
}
