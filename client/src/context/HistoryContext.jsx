import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

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

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(items))
  }, [items])

  const record = useCallback((entry) => {
    setItems((prev) => {
      const next = [
        { ...entry, investigatedAt: entry.investigatedAt || new Date().toISOString() },
        ...prev.filter((item) => item.address.toLowerCase() !== entry.address.toLowerCase()),
      ]
      return next.slice(0, 40)
    })
  }, [])

  const value = useMemo(() => ({ items, record }), [items, record])
  return <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>
}

export function useHistoryLog() {
  const ctx = useContext(HistoryContext)
  if (!ctx) throw new Error('useHistoryLog must be used within HistoryProvider')
  return ctx
}
