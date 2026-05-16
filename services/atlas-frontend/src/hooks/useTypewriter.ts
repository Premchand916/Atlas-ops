import { useEffect, useState } from 'react'

interface Options {
  speed?: number
  startDelay?: number
}

export function useTypewriter(text: string, { speed = 38, startDelay = 0 }: Options = {}) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    setDisplayed('')
    setDone(false)

    let i = 0
    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout>

    const tick = () => {
      if (cancelled) return
      if (i >= text.length) {
        setDone(true)
        return
      }
      i += 1
      setDisplayed(text.slice(0, i))
      timeoutId = setTimeout(tick, speed)
    }

    timeoutId = setTimeout(tick, startDelay)

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [text, speed, startDelay])

  return { displayed, done }
}
