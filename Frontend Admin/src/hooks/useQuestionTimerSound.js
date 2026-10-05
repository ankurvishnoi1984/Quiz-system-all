import { useEffect, useRef } from 'react'
import {
  TIMER_ENDING_WINDOW_SECONDS,
  playQuestionTimerCue,
  stopCustomTimerAudio,
} from '../utils/timerSoundPresets'
import { unlockTimerAudio } from '../utils/timerSounds'

const WARNING_SECONDS = TIMER_ENDING_WINDOW_SECONDS
const URGENT_SECONDS = 5

/**
 * Plays countdown ticks in the last 10s, urgent beeps in the last 5s,
 * and a times-up sound when the timer reaches 0.
 * Skips the first observed value so late joiners / remounts do not blast on load.
 */
export function useQuestionTimerSound(
  timer,
  {
    enabled = true,
    timerSoundKey,
    timerSoundUrl,
    timerEndingSoundKey,
    timerEndingSoundUrl,
  } = {},
) {
  const lastPlayedRef = useRef(null)
  const endingStartedRef = useRef(false)
  const soundRef = useRef({
    timerSoundKey,
    timerSoundUrl,
    timerEndingSoundKey,
    timerEndingSoundUrl,
  })
  soundRef.current = {
    timerSoundKey,
    timerSoundUrl,
    timerEndingSoundKey,
    timerEndingSoundUrl,
  }

  useEffect(() => {
    if (!enabled) return undefined

    const unlock = () => unlockTimerAudio()
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
      stopCustomTimerAudio('ending')
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) {
      lastPlayedRef.current = null
      endingStartedRef.current = false
      return
    }

    const seconds = Math.max(0, Math.ceil(Number(timer) || 0))
    if (lastPlayedRef.current === seconds) return

    if (lastPlayedRef.current == null) {
      lastPlayedRef.current = seconds
      endingStartedRef.current = seconds > 0 && seconds <= WARNING_SECONDS
      return
    }

    const previous = lastPlayedRef.current
    lastPlayedRef.current = seconds
    const sound = soundRef.current

    if (seconds === 0 && previous > 0) {
      endingStartedRef.current = false
      playQuestionTimerCue('timesUp', sound)
      return
    }

    if (
      seconds > 0 &&
      seconds <= WARNING_SECONDS &&
      previous > WARNING_SECONDS &&
      !endingStartedRef.current
    ) {
      endingStartedRef.current = true
      playQuestionTimerCue('endingStart', { ...sound, secondsLeft: seconds })
    }

    if (seconds > WARNING_SECONDS) {
      endingStartedRef.current = false
    }

    if (seconds > 0 && seconds <= URGENT_SECONDS) {
      playQuestionTimerCue('urgent', { ...sound, secondsLeft: seconds })
      return
    }

    if (seconds > URGENT_SECONDS && seconds <= WARNING_SECONDS) {
      playQuestionTimerCue('tick', sound)
    }
  }, [timer, enabled])
}
