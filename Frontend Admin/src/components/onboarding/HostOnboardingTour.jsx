import { useEffect, useLayoutEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useHostOnboarding } from '../../context/HostOnboardingContext'

const TOOLTIP_WIDTH = 360
const SPOTLIGHT_PAD = 8

function ClickShield({ rect }) {
  if (!rect) return <div className="pointer-events-auto absolute inset-0" />
  const top = Math.max(0, rect.top - SPOTLIGHT_PAD)
  const left = Math.max(0, rect.left - SPOTLIGHT_PAD)
  const width = rect.width + SPOTLIGHT_PAD * 2
  const height = rect.height + SPOTLIGHT_PAD * 2
  return (
    <>
      <div className="pointer-events-auto absolute inset-x-0 top-0" style={{ height: top }} />
      <div className="pointer-events-auto absolute left-0" style={{ top, height, width: left }} />
      <div className="pointer-events-auto absolute" style={{ top, height, left: left + width, right: 0 }} />
      <div className="pointer-events-auto absolute inset-x-0 bottom-0" style={{ top: top + height }} />
    </>
  )
}

function tooltipPosition(rect, placement) {
  if (!rect) {
    return {
      top: Math.max(24, window.innerHeight / 2 - 90),
      left: Math.max(16, window.innerWidth / 2 - TOOLTIP_WIDTH / 2),
    }
  }

  let top = rect.bottom + 14
  let left = rect.left

  if (placement === 'right') {
    top = rect.top
    left = rect.right + 14
  } else if (placement === 'left') {
    top = rect.top
    left = rect.left - TOOLTIP_WIDTH - 14
  } else if (placement === 'top') {
    top = rect.top - 14
    left = rect.left
  }

  left = Math.min(Math.max(16, left), window.innerWidth - TOOLTIP_WIDTH - 16)
  top = Math.min(Math.max(16, top), window.innerHeight - 220)
  return { top, left }
}

export function HostOnboardingTour() {
  const { active, paused, step, stepIndex, totalSteps, isLast, next, back, skip } = useHostOnboarding()
  const location = useLocation()
  const [rect, setRect] = useState(null)

  useLayoutEffect(() => {
    if (!active || paused) return undefined

    let attempts = 0
    let frame = 0

    const update = () => {
      const el = document.querySelector(`[data-tour="${step.target}"]`)
      if (el) {
        el.scrollIntoView({ block: 'nearest', inline: 'nearest' })
        setRect(el.getBoundingClientRect())
        return
      }
      setRect(null)
      attempts += 1
      if (attempts < 40) {
        frame = window.setTimeout(update, 80)
      }
    }

    update()
    const poll = window.setInterval(update, 400)
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.clearTimeout(frame)
      window.clearInterval(poll)
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [active, paused, step.target, location.pathname, location.search])

  useEffect(() => {
    if (!active) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') skip()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [active, skip])

  if (!active || paused) return null

  const pos = tooltipPosition(rect, step.placement)

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[90]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="host-tour-title"
    >
      <ClickShield rect={rect} />
      {rect ? (
        <div
          className="pointer-events-none absolute rounded-2xl ring-2 ring-white ring-offset-2 ring-offset-navy-900/40"
          style={{
            top: rect.top - SPOTLIGHT_PAD,
            left: rect.left - SPOTLIGHT_PAD,
            width: rect.width + SPOTLIGHT_PAD * 2,
            height: rect.height + SPOTLIGHT_PAD * 2,
            boxShadow: '0 0 0 9999px rgba(5, 11, 20, 0.58)',
          }}
        />
      ) : (
        <div className="pointer-events-auto absolute inset-0 bg-navy-950/55" />
      )}

      <div
        className="pointer-events-auto absolute w-[min(360px,calc(100vw-32px))] rounded-2xl border border-white/15 bg-white p-5 shadow-2xl shadow-navy-950/30"
        style={{ top: pos.top, left: pos.left }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-navy-600">
          Hint {stepIndex + 1} of {totalSteps}
        </p>
        <h2 id="host-tour-title" className="mt-1 text-lg font-bold text-navy-950">
          {step.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.body}</p>
        {!rect ? (
          <p className="mt-2 text-xs text-slate-500">
            This control appears after you create a session. You can still continue the tour.
          </p>
        ) : null}

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={skip}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800"
          >
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            {stepIndex > 0 ? (
              <button
                type="button"
                onClick={back}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-navy-800 hover:bg-slate-50"
              >
                Back
              </button>
            ) : null}
            <button
              type="button"
              onClick={next}
              className="rounded-xl bg-linear-to-r from-navy-900 via-navy-700 to-navy-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-navy-900/20 hover:brightness-110"
            >
              {isLast ? 'Finish' : step.nextLabel || 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
