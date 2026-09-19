import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { listHistory } from '../api/client'

const KEY = 'wa.history'
const HistoryContext = createContext(null)

function readList() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

export function HistoryProvider({ children }) {
  const [items, setItems] = useState(readList)
  const [storage, setStorage] = useState('local')
  const [hydrated, setHydrated] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const payload = await listHistory()
      if (payload && Array.isArray(payload.items)) {
        setItems((prev) => (payload.items.length ? payload.items : prev))
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

  const record = useCallback((entry) => {
    setItems((prev) => {
      const next = [
        {
          ...entry,
          id: entry.id,
          investigatedAt: entry.investigatedAt || new Date().toISOString(),
        },
        ...prev.filter((item) => {
          if (entry.id && item.id) return item.id !== entry.id
          return item.address?.toLowerCase() !== entry.address?.toLowerCase()
        }),
      ]
      return next.slice(0, 40)
    })
  }, [])

  const value = useMemo(
    () => ({ items, record, refresh, storage, hydrated }),
    [items, record, refresh, storage, hydrated],
  )
  return <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>
}

export function useHistoryLog() {
  const ctx = useContext(HistoryContext)
  if (!ctx) throw new Error('useHistoryLog must be used within HistoryProvider')
  return ctx
}
