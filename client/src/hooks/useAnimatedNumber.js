import { useEffect, useRef, useState } from 'react'

export function useAnimatedNumber(value, duration = 700) {
  const target = Number(value) || 0
  const [shown, setShown] = useState(0)
  const shownRef = useRef(0)
  const frame = useRef(null)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const from = shownRef.current
    const to = target
    const snap = () => {
      shownRef.current = to
      setShown(to)
    }

    if (reduce || document.hidden || from === to) {
      snap()
      return undefined
    }

    const start = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - (1 - t) ** 3
      const next = from + (to - from) * eased
      shownRef.current = t < 1 ? next : to
      setShown(shownRef.current)
      if (t < 1) frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
    const failsafe = window.setTimeout(snap, duration + 80)
    const onVis = () => {
      if (document.hidden) snap()
    }
    document.addEventListener('visibilitychange', onVis)

    return () => {
      if (frame.current) cancelAnimationFrame(frame.current)
      window.clearTimeout(failsafe)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [target, duration])

  return shown
}
