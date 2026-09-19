import { useEffect, useState } from 'react'

export function useStageObserver(fallback, available) {
  const [current, setCurrent] = useState(fallback)
  const key = available.join('|')

  useEffect(() => {
    setCurrent(fallback)
  }, [fallback])

  useEffect(() => {
    const ids = available.filter((id) => id !== 'search' && id !== 'scan')
    if (!ids.length) return undefined

    function read() {
      const marker = 140
      let next = fallback
      for (const id of ids) {
        const el = document.getElementById(`stage-${id}`)
        if (!el) continue
        if (el.getBoundingClientRect().top - marker <= 0) next = id
      }
      const hash = window.location.hash.replace('#stage-', '')
      if (ids.includes(hash)) {
        const hashed = document.getElementById(`stage-${hash}`)
        if (hashed && Math.abs(hashed.getBoundingClientRect().top - marker) < 80) {
          next = hash
        }
      }
      setCurrent(next)
    }

    const elements = ids.map((id) => document.getElementById(`stage-${id}`)).filter(Boolean)
    const observer = new IntersectionObserver(read, {
      rootMargin: '-120px 0px -40% 0px',
      threshold: [0, 0.1, 0.25, 0.5],
    })
    elements.forEach((el) => observer.observe(el))
    window.addEventListener('scroll', read, { passive: true })
    window.addEventListener('hashchange', read)
    read()

    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', read)
      window.removeEventListener('hashchange', read)
    }
  }, [key, fallback, available])

  return current
}
