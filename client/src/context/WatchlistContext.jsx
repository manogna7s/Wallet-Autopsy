import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const KEY = 'wa.watchlist'
const WatchlistContext = createContext(null)

function readList() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

export function WatchlistProvider({ children }) {
  const [items, setItems] = useState(readList)

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(items))
  }, [items])

  const isWatched = useCallback(
    (address) => items.some((item) => item.address.toLowerCase() === String(address).toLowerCase()),
    [items],
  )

  const watch = useCallback((entry) => {
    setItems((prev) => {
      if (prev.some((item) => item.address.toLowerCase() === entry.address.toLowerCase())) return prev
      return [{ ...entry, savedAt: new Date().toISOString() }, ...prev]
    })
  }, [])

  const unwatch = useCallback((address) => {
    setItems((prev) => prev.filter((item) => item.address.toLowerCase() !== String(address).toLowerCase()))
  }, [])

  const value = useMemo(() => ({ items, watch, unwatch, isWatched }), [items, watch, unwatch, isWatched])
  return <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>
}

export function useWatchlist() {
  const ctx = useContext(WatchlistContext)
  if (!ctx) throw new Error('useWatchlist must be used within WatchlistProvider')
  return ctx
}
