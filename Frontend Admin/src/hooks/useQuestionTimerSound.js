import { useEffect, useRef } from 'react'
import {
  playTimerTick,
  playTimerTimesUp,
  playTimerUrgentBeep,
  unlockTimerAudio,
} from '../utils/timerSounds'

const WARNING_SECONDS = 10
const URGENT_SECONDS = 5

/**
 * Plays countdown ticks in the last 10s, urgent beeps in the last 5s,
 * and a times-up sound when the timer reaches 0.
 * Skips the first observed value so late joiners / remounts do not blast on load.
 */
export function useQuestionTimerSound(timer, { enabled = true } = {}) {
  const lastPlayedRef = useRef(null)

  useEffect(() => {
    if (!enabled) return undefined

    const unlock = () => unlockTimerAudio()
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) {
      lastPlayedRef.current = null
      return
    }

    const seconds = Math.max(0, Math.ceil(Number(timer) || 0))
    if (lastPlayedRef.current === seconds) return

    if (lastPlayedRef.current == null) {
      lastPlayedRef.current = seconds
      return
    }

    const previous = lastPlayedRef.current
    lastPlayedRef.current = seconds

    if (seconds === 0 && previous > 0) {
      playTimerTimesUp()
      return
    }

    if (seconds > 0 && seconds <= URGENT_SECONDS) {
      playTimerUrgentBeep(seconds)
      return
    }

    if (seconds > URGENT_SECONDS && seconds <= WARNING_SECONDS) {
      playTimerTick()
    }
  }, [timer, enabled])
}
