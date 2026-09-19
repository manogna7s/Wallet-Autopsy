import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { addWatchlist, deleteWatchlist, listWatchlist } from '../api/client'

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
  const [storage, setStorage] = useState('local')
  const [hydrated, setHydrated] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const payload = await listWatchlist()
      if (payload && Array.isArray(payload.items)) {
        setItems(payload.items)
        setStorage(payload.storage || 'server')
      }
    } catch {
      setStorage('local')
    } finally {
      setHydrated(true)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (storage === 'local') localStorage.setItem(KEY, JSON.stringify(items))
  }, [items, storage])

  const isWatched = useCallback(
    (address) => items.some((item) => item.address?.toLowerCase() === String(address).toLowerCase()),
    [items],
  )

  const watch = useCallback(async (entry) => {
    try {
      const saved = await addWatchlist({
        address: entry.address,
        chain: entry.network || entry.chain || 'ethereum',
        label: entry.label || '',
      })
      setItems((prev) => {
        if (prev.some((item) => item.address.toLowerCase() === saved.address.toLowerCase())) return prev
        return [saved, ...prev]
      })
      setStorage((current) => (current === 'local' ? 'server' : current))
    } catch {
      setItems((prev) => {
        if (prev.some((item) => item.address.toLowerCase() === entry.address.toLowerCase())) return prev
        return [{ ...entry, id: entry.address, createdAt: new Date().toISOString() }, ...prev]
      })
      setStorage('local')
    }
  }, [])

  const unwatch = useCallback(async (address) => {
    const item = items.find((row) => row.address?.toLowerCase() === String(address).toLowerCase())
    if (item?.id) {
      try {
        await deleteWatchlist(item.id)
      } catch {
        /* keep local removal */
      }
    }
    setItems((prev) => prev.filter((row) => row.address?.toLowerCase() !== String(address).toLowerCase()))
  }, [items])

  const value = useMemo(
    () => ({ items, watch, unwatch, isWatched, storage, refresh, hydrated }),
    [items, watch, unwatch, isWatched, storage, refresh, hydrated],
  )
  return <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>
}

export function useWatchlist() {
  const ctx = useContext(WatchlistContext)
  if (!ctx) throw new Error('useWatchlist must be used within WatchlistProvider')
  return ctx
}
