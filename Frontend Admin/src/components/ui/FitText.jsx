import { useLayoutEffect, useRef, useState } from 'react'

const FIT_STEPS = 12

/**
 * Shrinks font size so children fit within maxLines of the available width.
 * Applies line-clamp only when already at minPx and still overflowing.
 */
export function FitText({
  as: Tag = 'p',
  children,
  className = '',
  minPx = 11,
  maxPx = 24,
  maxLines = 4,
  style,
  ...rest
}) {
  const ref = useRef(null)
  const [fontSize, setFontSize] = useState(maxPx)
  const [atMinOverflow, setAtMinOverflow] = useState(false)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return undefined

    let raf = 0
    const measureFits = (size) => {
      el.style.fontSize = `${size}px`
      el.style.display = 'block'
      el.style.overflow = 'visible'
      el.style.webkitLineClamp = 'unset'
      el.style.webkitBoxOrient = 'unset'
      // Force layout before measuring.
      void el.offsetHeight
      const computed = getComputedStyle(el)
      const lineHeight =
        parseFloat(computed.lineHeight) || size * 1.35
      const maxHeight = lineHeight * maxLines
      return el.scrollHeight <= maxHeight + 1
    }

    const fit = () => {
      if (el.clientWidth <= 0) return

      let lo = minPx
      let hi = maxPx
      let best = minPx

      if (measureFits(maxPx)) {
        best = maxPx
      } else {
        for (let i = 0; i < FIT_STEPS; i += 1) {
          const mid = (lo + hi) / 2
          if (measureFits(mid)) {
            best = mid
            lo = mid
          } else {
            hi = mid
          }
        }
      }

      const rounded = Math.round(best * 10) / 10
      el.style.fontSize = `${rounded}px`
      const overflowAtMin = rounded <= minPx + 0.05 && !measureFits(rounded)
      setFontSize(rounded)
      setAtMinOverflow(overflowAtMin)
    }

    const schedule = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(fit)
    }

    schedule()
    const ro = new ResizeObserver(schedule)
    ro.observe(el)
    if (el.parentElement) ro.observe(el.parentElement)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [children, minPx, maxPx, maxLines])

  return (
    <Tag
      ref={ref}
      className={className}
      style={{
        width: '100%',
        minWidth: 0,
        ...style,
        fontSize,
        ...(atMinOverflow
          ? {
              display: '-webkit-box',
              WebkitLineClamp: maxLines,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }
          : {
              display: 'block',
            }),
      }}
      {...rest}
    >
      {children}
    </Tag>
  )
}
