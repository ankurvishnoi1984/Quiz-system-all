/** @typedef {{ participant_id: number|string, name: string, score: number, attempts?: number, responseTimeMs?: number|null }} LeaderboardEntry */

export const LEADERBOARD_LIMIT_OPTIONS = [10, 20, 30, 40, 50]
export const SESSION_LEADERBOARD_TOP_N = 10

export function participantDisplayName(row, participantId) {
  const p = row?.participant
  if (p?.nickname) return String(p.nickname).trim()
  if (p?.email) return String(p.email).trim()
  return `Participant ${participantId}`
}

/** Resolve response / avg response time in ms from mixed API / client shapes. */
export function resolveLeaderboardResponseTimeMs(row) {
  if (!row || typeof row !== 'object') return null
  const candidates = [
    row.responseTimeMs,
    row.response_time_ms,
    row.avgResponseTimeMs,
    row.avg_response_time_ms,
  ]
  for (const value of candidates) {
    if (value == null) continue
    const n = Number(value)
    if (Number.isFinite(n) && n >= 0) return n
  }
  if (row.avg_response_time_seconds != null) {
    const n = Number(row.avg_response_time_seconds)
    if (Number.isFinite(n) && n >= 0) return Math.round(n * 1000)
  }
  return null
}

/**
 * Rank by score (high → low), then faster response time, then name / id.
 */
export function sortLeaderboardEntries(entries) {
  return [...(entries || [])].sort((a, b) => {
    const scoreDiff = Number(b.score ?? 0) - Number(a.score ?? 0)
    if (scoreDiff !== 0) return scoreDiff

    const timeA = resolveLeaderboardResponseTimeMs(a)
    const timeB = resolveLeaderboardResponseTimeMs(b)
    if (timeA != null || timeB != null) {
      if (timeA == null) return 1
      if (timeB == null) return -1
      if (timeA !== timeB) return timeA - timeB
    }

    const nameA = String(a.name || a.nickname || '').trim()
    const nameB = String(b.name || b.nickname || '').trim()
    const nameCompare = nameA.localeCompare(nameB, undefined, { sensitivity: 'base' })
    if (nameCompare !== 0) return nameCompare

    return Number(a.participant_id) - Number(b.participant_id)
  })
}

/**
 * Session-wide scores from response rows (sum of points_earned per participant).
 * @param {Array} responses
 * @param {number} limit
 * @returns {LeaderboardEntry[]}
 */
export function buildSessionLeaderboardFromResponses(responses, limit = 10) {
  const scoreByParticipant = new Map()

  ;(responses || []).forEach((row) => {
    const key = row.participant_id
    const existing = scoreByParticipant.get(key) || {
      participant_id: key,
      name: participantDisplayName(row, key),
      score: 0,
      attempts: 0,
      responseTimes: [],
    }
    existing.score += Number(row.points_earned || 0)
    existing.attempts += 1
    const responseTimeMs = resolveLeaderboardResponseTimeMs(row)
    if (responseTimeMs != null) existing.responseTimes.push(responseTimeMs)
    scoreByParticipant.set(key, existing)
  })

  const entries = Array.from(scoreByParticipant.values()).map((entry) => {
    const { responseTimes, ...rest } = entry
    const avgMs =
      responseTimes.length > 0
        ? Math.round(responseTimes.reduce((sum, ms) => sum + ms, 0) / responseTimes.length)
        : null
    return {
      ...rest,
      responseTimeMs: avgMs,
      avg_response_time_ms: avgMs,
    }
  })

  return sortLeaderboardEntries(entries).slice(0, limit)
}

/**
 * Best score per participant for a single question (faster time wins ties).
 * @param {Array} responses
 * @param {number|string} questionId
 * @param {number} limit
 * @returns {LeaderboardEntry[]}
 */
export function buildQuestionLeaderboardForQuestion(responses, questionId, limit = 10) {
  const byParticipant = new Map()

  ;(responses || [])
    .filter((row) => Number(row.question_id) === Number(questionId))
    .forEach((row) => {
      const pid = row.participant_id
      const points = Number(row.points_earned || 0)
      const responseTimeMs = resolveLeaderboardResponseTimeMs(row)
      const existing = byParticipant.get(pid)
      if (
        !existing ||
        points > existing.score ||
        (points === existing.score &&
          responseTimeMs != null &&
          (existing.responseTimeMs == null || responseTimeMs < existing.responseTimeMs))
      ) {
        byParticipant.set(pid, {
          participant_id: pid,
          name: participantDisplayName(row, pid),
          score: points,
          responseTimeMs,
        })
      }
    })

  return sortLeaderboardEntries(Array.from(byParticipant.values())).slice(0, limit)
}

export function normalizeLeaderboardEntries(entries) {
  const normalized = (entries || []).map((row) => ({
    participant_id: row.participant_id,
    name: row.name || row.nickname || 'Anonymous',
    score: Number(row.score ?? 0),
    responseTimeMs: resolveLeaderboardResponseTimeMs(row),
  }))
  return sortLeaderboardEntries(normalized)
}
