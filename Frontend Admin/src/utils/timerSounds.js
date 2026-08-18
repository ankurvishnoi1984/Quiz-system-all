/** Web Audio cues for live quizzes — no media files required. */

/**
 * Extra host/present cues (join, answers, reveal, slides, leaderboard).
 * Timer sounds stay on either way. Set to true when you want those back.
 */
export const HOST_EXTRA_SOUNDS_ENABLED = false

let audioCtx = null
const lastPlayedAt = Object.create(null)

function getAudioContext() {
  if (typeof window === 'undefined') return null
  const Ctx = window.AudioContext || window.webkitAudioContext
  if (!Ctx) return null
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new Ctx()
  }
  return audioCtx
}

export function unlockTimerAudio() {
  const ctx = getAudioContext()
  if (!ctx) return
  if (ctx.state === 'suspended') {
    void ctx.resume().catch(() => {})
  }
}

if (typeof window !== 'undefined') {
  const arm = () => unlockTimerAudio()
  window.addEventListener('pointerdown', arm, { capture: true })
  window.addEventListener('keydown', arm, { capture: true })
}

function playTone({
  frequency,
  duration,
  type = 'sine',
  volume = 0.1,
  slideTo,
  delay = 0,
}) {
  const ctx = getAudioContext()
  if (!ctx) return
  if (ctx.state === 'suspended') {
    void ctx.resume().catch(() => {})
  }

  const startAt = ctx.currentTime + delay
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(frequency, startAt)
  if (slideTo != null) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), startAt + duration)
  }

  gain.gain.setValueAtTime(0.0001, startAt)
  gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.018)
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)

  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(startAt)
  osc.stop(startAt + duration + 0.03)
}

function throttled(key, minMs, fn) {
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
  if (now - (lastPlayedAt[key] || 0) < minMs) return
  lastPlayedAt[key] = now
  fn()
}

/** Soft tick for 10–6 seconds remaining. */
export function playTimerTick() {
  playTone({ frequency: 760, duration: 0.07, type: 'square', volume: 0.05 })
}

/** Sharper beep for the last 5 seconds. Higher pitch as time runs out. */
export function playTimerUrgentBeep(secondsLeft) {
  const n = Math.max(1, Math.min(5, Number(secondsLeft) || 1))
  const frequency = 920 + (5 - n) * 90
  playTone({ frequency, duration: 0.13, type: 'square', volume: 0.1 })
}

/** Distinct buzz when the countdown hits zero. */
export function playTimerTimesUp() {
  playTone({ frequency: 420, duration: 0.28, type: 'sawtooth', volume: 0.12, slideTo: 180 })
  playTone({
    frequency: 280,
    duration: 0.42,
    type: 'sawtooth',
    volume: 0.11,
    slideTo: 110,
    delay: 0.2,
  })
}

export function playTimeExpired() {
  playTimerTimesUp()
}

export function playJoinedSession() {
  playTone({ frequency: 523, duration: 0.12, type: 'sine', volume: 0.08 })
  playTone({ frequency: 659, duration: 0.14, type: 'sine', volume: 0.08, delay: 0.1 })
  playTone({ frequency: 784, duration: 0.18, type: 'sine', volume: 0.09, delay: 0.2 })
}

export function playPickAnswer() {
  throttled('pick-answer', 70, () => {
    playTone({ frequency: 980, duration: 0.055, type: 'triangle', volume: 0.06 })
  })
}

export function playSubmitSuccess() {
  playTone({ frequency: 660, duration: 0.1, type: 'sine', volume: 0.08 })
  playTone({ frequency: 880, duration: 0.16, type: 'sine', volume: 0.09, delay: 0.09 })
}

export function playNewQuestion() {
  throttled('new-question', 400, () => {
    playTone({ frequency: 587, duration: 0.1, type: 'triangle', volume: 0.08 })
    playTone({ frequency: 784, duration: 0.12, type: 'triangle', volume: 0.08, delay: 0.1 })
    playTone({ frequency: 988, duration: 0.16, type: 'triangle', volume: 0.09, delay: 0.2 })
  })
}

export function playAnswerCorrect() {
  playTone({ frequency: 523, duration: 0.12, type: 'sine', volume: 0.09 })
  playTone({ frequency: 659, duration: 0.12, type: 'sine', volume: 0.09, delay: 0.1 })
  playTone({ frequency: 784, duration: 0.22, type: 'sine', volume: 0.1, delay: 0.2 })
}

export function playAnswerWrong() {
  playTone({ frequency: 320, duration: 0.18, type: 'sawtooth', volume: 0.08, slideTo: 180 })
  playTone({ frequency: 220, duration: 0.28, type: 'sawtooth', volume: 0.07, delay: 0.14, slideTo: 140 })
}

export function playAnswerReveal() {
  playTone({ frequency: 698, duration: 0.12, type: 'triangle', volume: 0.08 })
  playTone({ frequency: 932, duration: 0.2, type: 'triangle', volume: 0.09, delay: 0.1 })
}

export function playSessionEnded() {
  playTone({ frequency: 392, duration: 0.18, type: 'sine', volume: 0.09 })
  playTone({ frequency: 494, duration: 0.18, type: 'sine', volume: 0.09, delay: 0.14 })
  playTone({ frequency: 587, duration: 0.32, type: 'sine', volume: 0.1, delay: 0.28 })
}

export function playLeaderboardShown() {
  throttled('leaderboard-shown', 800, () => {
    playTone({ frequency: 784, duration: 0.1, type: 'sine', volume: 0.08 })
    playTone({ frequency: 988, duration: 0.1, type: 'sine', volume: 0.08, delay: 0.09 })
    playTone({ frequency: 1175, duration: 0.22, type: 'sine', volume: 0.09, delay: 0.18 })
  })
}

export function playLeaderboardUpdate() {
  throttled('leaderboard-update', 2500, () => {
    playTone({ frequency: 880, duration: 0.08, type: 'triangle', volume: 0.05 })
    playTone({ frequency: 1175, duration: 0.12, type: 'triangle', volume: 0.05, delay: 0.07 })
  })
}

export function playHostResponseReceived() {
  if (!HOST_EXTRA_SOUNDS_ENABLED) return
  throttled('host-response', 90, () => {
    playTone({ frequency: 1100, duration: 0.04, type: 'square', volume: 0.03 })
  })
}

export function playHostParticipantJoined() {
  if (!HOST_EXTRA_SOUNDS_ENABLED) return
  throttled('host-join', 160, () => {
    playTone({ frequency: 540, duration: 0.07, type: 'sine', volume: 0.05 })
    playTone({ frequency: 810, duration: 0.09, type: 'sine', volume: 0.045, delay: 0.05 })
  })
}

export function playSlideChanged() {
  if (!HOST_EXTRA_SOUNDS_ENABLED) return
  throttled('slide-change', 180, () => {
    playTone({ frequency: 420, duration: 0.12, type: 'sine', volume: 0.05, slideTo: 640 })
  })
}
