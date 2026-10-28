import { useEffect, useState } from 'react'
import { useInView } from '../../hooks/useInView'

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3
}

function AnimatedCounter({
  to,
  duration = 1400,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
}) {
  const { ref, inView } = useInView({ threshold: 0.1, rootMargin: '0px' })
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!inView) return undefined

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReduced) {
      setValue(to)
      return undefined
    }

    let frame = 0
    const start = performance.now()

    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration)
      const next = to * easeOutCubic(progress)
      setValue(next)
      if (progress < 1) {
        frame = requestAnimationFrame(tick)
      }
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [inView, to, duration])

  const formatted =
    decimals > 0 ? value.toFixed(decimals) : Math.round(value).toLocaleString('en-IN')

  return (
    <span ref={ref} className={className}>
      {`${prefix}${formatted}${suffix}`}
    </span>
  )
}

export default AnimatedCounter
