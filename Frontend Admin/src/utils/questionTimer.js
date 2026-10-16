/** @param {string | number | Date | null | undefined} value */
export function parseActivationTime(value) {
  if (value == null || value === '') return null
  const ms = new Date(value).getTime()
  // Reject invalid / sentinel dates (e.g. bad VARCHAR values parsing as 1970).
  if (!Number.isFinite(ms) || ms < Date.UTC(2020, 0, 1)) return null
  return ms
}

/**
 * Host activation deadline for a timed question (epoch ms).
 * @param {{ timeLimit?: number, time_limit_seconds?: number, liveActivatedAt?: unknown, live_activated_at?: unknown }} question
 */
export function getQuestionDeadlineMs(question) {
  const limit = Number(question?.timeLimit ?? question?.time_limit_seconds ?? 0)
  const activated = parseActivationTime(
    question?.liveActivatedAt ?? question?.live_activated_at,
  )
  if (limit <= 0 || activated == null) return null
  return activated + limit * 1000
}

/** Whole seconds remaining until deadline (floor — avoids showing limit+1). */
export function getRemainingQuestionSeconds(deadlineMs, nowMs = Date.now()) {
  if (deadlineMs == null) return 0
  return Math.max(0, Math.floor((deadlineMs - nowMs) / 1000))
}

export function isTimedLiveQuestionExpired(question, now = Date.now()) {
  const limit = Number(question?.timeLimit ?? question?.time_limit_seconds ?? 0)
  if (limit <= 0) return false

  const deadline = getQuestionDeadlineMs(question)
  // No reliable host activation time yet — keep visible until we have one.
  if (deadline == null) return false
  return now >= deadline
}

/** Live questions visible to participants (including expired timed; answers lock via timer). */
export function filterActiveQuestionsForLateJoinPolicy(questions) {
  return (questions || []).filter(
    (q) => q.isLive === true || q.is_live === true || q.is_live === 1,
  )
}

/**
 * Shared quiz-total deadline from host session launch (epoch ms).
 * @param {{ started_at?: unknown, quiz_total_time_minutes?: unknown }} session
 */
export function getQuizTotalEndsAt(session) {
  const minutes = Number(session?.quiz_total_time_minutes)
  if (!Number.isFinite(minutes) || minutes <= 0) return null
  const started = parseActivationTime(session?.started_at)
  if (started == null) return null
  return started + minutes * 60 * 1000
}

/** Whole seconds remaining on the shared quiz-total clock. */
export function getQuizTotalRemainingSeconds(session, nowMs = Date.now()) {
  const endsAt = getQuizTotalEndsAt(session)
  if (endsAt == null) {
    const minutes = Number(session?.quiz_total_time_minutes)
    if (!Number.isFinite(minutes) || minutes <= 0) return 0
    return Math.max(0, Math.floor(minutes * 60))
  }
  return getRemainingQuestionSeconds(endsAt, nowMs)
}

/**
 * Countdown end timestamp for the participant UI.
 * Strict late join: shared host deadline (remaining time only).
 * Reattempt always gets a fresh window (host resets live_activated_at).
 */
export function getCountdownEndsAtForQuestion({ question, strictLateJoin }) {
  const limit = Number(question?.timeLimit ?? question?.time_limit_seconds ?? 0)
  if (limit <= 0) return null

  const isReattempt =
    question?.openForReattempt === true ||
    question?.open_for_reattempt === true ||
    question?.open_for_reattempt === 1

  if (!strictLateJoin || isReattempt) {
    if (isReattempt && strictLateJoin) {
      const deadline = getQuestionDeadlineMs(question)
      if (deadline != null && deadline > Date.now()) return deadline
    }
    return Date.now() + limit * 1000
  }

  // Wait for host live_activated_at — do not invent a local window that desyncs Present/Live.
  return getQuestionDeadlineMs(question)
}

/**
 * Wall-clock slots for synced lockstep (Sync on + both timers).
 * Q1 starts at session.started_at; each next slot starts when the previous ends.
 * Survey / untimed questions get a 0-length slot (immediately expired).
 *
 * @param {Array} questions ordered participant-visible questions
 * @param {unknown} startedAt session.started_at
 * @returns {Array<{ index: number, questionId: unknown, startMs: number, endMs: number, limitSeconds: number }>}
 */
export function buildSyncedQuestionSchedule(questions = [], startedAt) {
  const startMs = parseActivationTime(startedAt)
  if (startMs == null) return []
  let cursor = startMs
  const slots = []
  for (let i = 0; i < (questions || []).length; i += 1) {
    const q = questions[i]
    const isSurvey = q?.type === 'Survey' || q?.isSurvey === true
    const limit = isSurvey
      ? 0
      : Math.max(0, Math.floor(Number(q?.timeLimit ?? q?.time_limit_seconds ?? 0) || 0))
    const slotStart = cursor
    const slotEnd = cursor + limit * 1000
    slots.push({
      index: i,
      questionId: q?.id ?? q?.question_id ?? null,
      startMs: slotStart,
      endMs: slotEnd,
      limitSeconds: limit,
    })
    cursor = slotEnd
  }
  return slots
}

/** Index of the live lockstep slot for `nowMs` (clamped to last after schedule ends). */
export function getSyncedQuestionIndex(schedule = [], nowMs = Date.now()) {
  if (!schedule.length) return 0
  if (nowMs < schedule[0].startMs) return 0
  for (let i = 0; i < schedule.length; i += 1) {
    if (nowMs < schedule[i].endMs) return i
  }
  return schedule.length - 1
}

export function getSyncedSlotRemainingSeconds(slot, nowMs = Date.now()) {
  if (!slot) return 0
  return getRemainingQuestionSeconds(slot.endMs, nowMs)
}
