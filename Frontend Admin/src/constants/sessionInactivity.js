/** Idle time before host/participant sees the session inactivity popup. */
export const SESSION_INACTIVITY_MS = 40 * 60 * 1000

/** How often an active user may refresh last_activity_at on the server. */
export const SESSION_ACTIVITY_PING_MS = 60 * 1000

export function resolveSessionActivityAt(session) {
  return session?.last_activity_at || null
}

export function isSessionInactive(timestamp, now = Date.now()) {
  if (!timestamp) return false
  const t = new Date(timestamp).getTime()
  if (!Number.isFinite(t)) return false
  return now - t >= SESSION_INACTIVITY_MS
}

export function isLiveOrPausedSession(session) {
  const status = String(session?.status || '').toLowerCase()
  return status === 'live' || status === 'paused'
}
