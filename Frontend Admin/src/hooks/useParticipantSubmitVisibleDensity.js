import { useLayoutEffect, useState } from 'react'
import {
  PARTICIPANT_DENSITY_LEVELS,
  getVisibleViewportBottom,
} from '../pages/participant-session/utils/participantQuestionDensity'

const EDGE_PAD_PX = 12

/**
 * Picks the lightest density where the actions/submit row is still fully on-screen.
 * Re-runs on resize, visualViewport changes, and content key changes (question/media).
 */
export function useParticipantSubmitVisibleDensity({
  panelRef,
  actionsRef,
  contentKey,
  hasMedia = false,
}) {
  const [densityId, setDensityId] = useState(() => (hasMedia ? 1 : 0))

  useLayoutEffect(() => {
    setDensityId(hasMedia ? 1 : 0)
  }, [contentKey, hasMedia])

  useLayoutEffect(() => {
    const panel = panelRef.current
    const actions = actionsRef.current
    if (!panel || !actions) return undefined

    let raf = 0
    let cancelled = false

    const measureAndTighten = () => {
      if (cancelled) return
      const visibleBottom = getVisibleViewportBottom()
      const actionsBottom = actions.getBoundingClientRect().bottom
      if (actionsBottom <= visibleBottom - EDGE_PAD_PX) return

      setDensityId((prev) => {
        if (prev >= PARTICIPANT_DENSITY_LEVELS.length - 1) return prev
        return prev + 1
      })
    }

    const schedule = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        // Second frame lets FitText finish its own layout pass.
        requestAnimationFrame(measureAndTighten)
      })
    }

    schedule()

    const ro = new ResizeObserver(schedule)
    ro.observe(panel)
    ro.observe(actions)

    const onViewport = () => schedule()
    window.addEventListener('resize', onViewport)
    window.visualViewport?.addEventListener('resize', onViewport)
    window.visualViewport?.addEventListener('scroll', onViewport)

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('resize', onViewport)
      window.visualViewport?.removeEventListener('resize', onViewport)
      window.visualViewport?.removeEventListener('scroll', onViewport)
    }
  }, [panelRef, actionsRef, contentKey, densityId, hasMedia])

  return densityId
}
