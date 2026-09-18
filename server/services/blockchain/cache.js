export function createTtlCache({ ttlMs, max = 200 } = {}) {
  const store = new Map()

  function get(key) {
    const row = store.get(key)
    if (!row) return null
    if (Date.now() > row.expiresAt) {
      store.delete(key)
      return null
    }
    return row.value
  }

  function set(key, value) {
    if (store.size >= max) {
      const first = store.keys().next().value
      if (first) store.delete(first)
    }
    store.set(key, { value, expiresAt: Date.now() + ttlMs })
  }

  return { get, set }
}
