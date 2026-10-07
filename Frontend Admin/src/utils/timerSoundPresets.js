import { resolveQuestionMediaUrl } from './questionMedia'
import {
  playTimerTickPreset,
  playTimerTimesUp,
  playTimerTimesUpPreset,
  playTimerUrgentPreset,
  unlockTimerAudio,
} from './timerSounds'

export const DEFAULT_TIMER_SOUND_KEY = 'classic'
/** Default seconds remaining when ending-window countdown audio starts. */
export const TIMER_ENDING_WINDOW_SECONDS = 10
export const DEFAULT_TIMER_SOUND_START_SECONDS = TIMER_ENDING_WINDOW_SECONDS

/**
 * Seconds remaining when ending audio starts.
 * Untimed → null. Timed → clamp to [1, timeLimit]; default min(10, timeLimit).
 */
export function normalizeTimerSoundStartSeconds(rawStart, timeLimitSeconds) {
  const limit = Number(timeLimitSeconds)
  if (!Number.isFinite(limit) || limit <= 0) return null

  const maxStart = Math.floor(limit)
  const fallback = Math.min(DEFAULT_TIMER_SOUND_START_SECONDS, maxStart)

  if (rawStart === undefined || rawStart === null || rawStart === '') {
    return fallback
  }

  const n = Number(rawStart)
  if (!Number.isFinite(n)) return fallback
  return Math.min(maxStart, Math.max(1, Math.round(n)))
}

/** Five built-in styles + custom upload. Classic is the default. */
export const TIMER_SOUND_PRESETS = [
  {
    key: 'classic',
    label: 'Classic',
    description: 'Default quiz beeps (recommended)',
  },
  {
    key: 'soft',
    label: 'Soft',
    description: 'Gentle tones for quieter rooms',
  },
  {
    key: 'sharp',
    label: 'Sharp',
    description: 'Bright beeps that cut through noise',
  },
  {
    key: 'digital',
    label: 'Digital',
    description: 'Short electronic blips',
  },
  {
    key: 'pulse',
    label: 'Pulse',
    description: 'Low heartbeat-style cues',
  },
]

export const TIMER_SOUND_KEYS = [
  ...TIMER_SOUND_PRESETS.map((p) => p.key),
  'custom',
]

export function normalizeTimerSoundKey(value) {
  const key = String(value || '')
    .trim()
    .toLowerCase()
  return TIMER_SOUND_KEYS.includes(key) ? key : DEFAULT_TIMER_SOUND_KEY
}

export function normalizeTimerSoundUrl(value) {
  if (value == null || value === '') return null
  const url = String(value).trim()
  return url || null
}

function normalizeOneSlot(keyInput, urlInput) {
  const key = normalizeTimerSoundKey(keyInput)
  const url = normalizeTimerSoundUrl(urlInput)
  if (key === 'custom' && !url) {
    return { key: DEFAULT_TIMER_SOUND_KEY, url: null }
  }
  return { key, url: key === 'custom' ? url : null }
}

/** Times-up + ending-window countdown settings. */
export function normalizeTimerSoundSettings(input = {}) {
  const timesUp = normalizeOneSlot(
    input.timerSoundKey ?? input.timer_sound_key ?? DEFAULT_TIMER_SOUND_KEY,
    input.timerSoundUrl ?? input.timer_sound_url,
  )
  const ending = normalizeOneSlot(
    input.timerEndingSoundKey ??
      input.timer_ending_sound_key ??
      timesUp.key,
    input.timerEndingSoundUrl ?? input.timer_ending_sound_url,
  )

  const timeLimit =
    input.timeLimitSeconds ?? input.time_limit_seconds ?? input.timeLimit ?? null
  const startRaw =
    input.timerSoundStartSeconds ?? input.timer_sound_start_seconds

  return {
    timerSoundKey: timesUp.key,
    timerSoundUrl: timesUp.url,
    timerEndingSoundKey: ending.key,
    timerEndingSoundUrl: ending.url,
    timerSoundStartSeconds: normalizeTimerSoundStartSeconds(startRaw, timeLimit),
  }
}

const customPlayers = {
  ending: null,
  timesUp: null,
}

function getCustomAudioElement(slot) {
  if (typeof window === 'undefined') return null
  if (!customPlayers[slot]) {
    customPlayers[slot] = new Audio()
    customPlayers[slot].preload = 'auto'
  }
  return customPlayers[slot]
}

function playCustomAudio(slot, url, { volume = 0.85, loop = false } = {}) {
  const resolved = resolveQuestionMediaUrl(url)
  if (!resolved) return false
  unlockTimerAudio()
  const el = getCustomAudioElement(slot)
  if (!el) return false
  try {
    el.pause()
    el.loop = Boolean(loop)
    el.currentTime = 0
    if (el.src !== resolved) el.src = resolved
    el.volume = Math.max(0, Math.min(1, volume))
    void el.play().catch(() => {})
    return true
  } catch {
    return false
  }
}

export function stopCustomTimerAudio(slot) {
  const el = customPlayers[slot]
  if (!el) return
  try {
    el.pause()
    el.currentTime = 0
    el.loop = false
  } catch {
    // ignore
  }
}

/**
 * Preview for a tab: ending clock sample or times-up sample.
 * @param {'ending'|'timesUp'} kind
 */
export function previewTimerSound(kind, settingsInput = {}) {
  const settings = normalizeTimerSoundSettings(settingsInput)
  unlockTimerAudio()

  if (kind === 'ending') {
    if (settings.timerEndingSoundKey === 'custom') {
      if (!playCustomAudio('ending', settings.timerEndingSoundUrl, { volume: 0.75 })) {
        playTimerUrgentPreset(DEFAULT_TIMER_SOUND_KEY, 3)
      }
      return
    }
    playTimerTickPreset(settings.timerEndingSoundKey)
    setTimeout(() => playTimerUrgentPreset(settings.timerEndingSoundKey, 3), 220)
    return
  }

  if (settings.timerSoundKey === 'custom') {
    if (!playCustomAudio('timesUp', settings.timerSoundUrl)) {
      playTimerTimesUpPreset(DEFAULT_TIMER_SOUND_KEY)
    }
    return
  }
  playTimerTimesUpPreset(settings.timerSoundKey)
}

/**
 * Play countdown cue for the selected profiles.
 * @param {'tick'|'urgent'|'timesUp'|'endingStart'} kind
 */
export function playQuestionTimerCue(kind, soundInput = {}) {
  const settings = normalizeTimerSoundSettings(soundInput)
  const secondsLeft = soundInput.secondsLeft

  if (kind === 'endingStart') {
    // Custom last-10s track: start once when entering the ending window.
    if (settings.timerEndingSoundKey === 'custom') {
      playCustomAudio('ending', settings.timerEndingSoundUrl, { volume: 0.7 })
      return
    }
    playTimerUrgentPreset(settings.timerEndingSoundKey, TIMER_ENDING_WINDOW_SECONDS)
    return
  }

  if (kind === 'timesUp') {
    stopCustomTimerAudio('ending')
    if (settings.timerSoundKey === 'custom') {
      if (!playCustomAudio('timesUp', settings.timerSoundUrl)) {
        playTimerTimesUp()
      }
      return
    }
    playTimerTimesUpPreset(settings.timerSoundKey)
    return
  }

  // Last 10 seconds ticks / urgent beeps
  if (settings.timerEndingSoundKey === 'custom') {
    // Custom ending track already started at endingStart — do not layer default beeps.
    return
  }

  if (kind === 'urgent') {
    playTimerUrgentPreset(settings.timerEndingSoundKey, secondsLeft)
    return
  }
  playTimerTickPreset(settings.timerEndingSoundKey)
}
