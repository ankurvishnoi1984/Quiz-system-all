const trimTrailingSlash = (url) => (url || '').replace(/\/+$/, '')

/**
 * Public origin for participant join links (QR, copy link).
 * Set VITE_PUBLIC_APP_URL in production builds when the app is not served from the API host.
 */
export function getPublicAppOrigin() {
  const configured =
    import.meta.env.VITE_PUBLIC_APP_URL || import.meta.env.VITE_APP_URL || ''
  if (configured) return trimTrailingSlash(configured)
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return ''
}

export function buildSessionJoinUrl(sessionCodeOrId, identity = null) {
  const code =
    sessionCodeOrId != null ? String(sessionCodeOrId).trim() : ''
  if (!code) return ''
  const origin = getPublicAppOrigin()
  const path = `/join/${encodeURIComponent(code)}`
  const base = origin ? `${origin}${path}` : path
  return appendJoinIdentityQuery(base, identity)
}

/** Slim participant embed URL for iframes (Phase 2). */
export function buildParticipantEmbedUrl(sessionCodeOrId, identity = null) {
  const code =
    sessionCodeOrId != null ? String(sessionCodeOrId).trim() : ''
  if (!code) return ''
  const origin = getPublicAppOrigin()
  const path = `/embed/participant/${encodeURIComponent(code)}`
  const base = origin ? `${origin}${path}` : path
  return appendJoinIdentityQuery(base, identity)
}

function appendJoinIdentityQuery(baseUrl, identity) {
  if (!identity || typeof identity !== 'object') return baseUrl
  const params = new URLSearchParams()
  const name = String(identity.name || identity.nickname || '').trim()
  const email = String(identity.email || '').trim()
  const mobile = String(identity.mobile || '').trim()
  const joinToken = String(
    identity.joinToken || identity.join_token || identity.join_identity_token || '',
  ).trim()
  if (name) params.set('name', name)
  if (email) params.set('email', email)
  if (mobile) params.set('mobile', mobile)
  if (joinToken) params.set('join_token', joinToken)
  const qs = params.toString()
  return qs ? `${baseUrl}?${qs}` : baseUrl
}

/** Base join page — participants enter the session code on this URL. */
export function buildGenericJoinUrl() {
  const origin = getPublicAppOrigin()
  if (!origin) return '/join'
  return `${origin}/join`
}

/** True when URL path carries a session code (`/join/:code` or `/embed/participant/:code`). */
export function hasSessionCodeInJoinPath(pathname, sessionCodeParam) {
  if (sessionCodeParam != null && String(sessionCodeParam).trim() !== '') {
    return true
  }
  const parts = String(pathname || '')
    .split('/')
    .filter(Boolean)
  if (parts[0] === 'join' && parts.length >= 2 && parts[1].trim() !== '') {
    return true
  }
  if (
    parts[0] === 'embed' &&
    parts[1] === 'participant' &&
    parts.length >= 3 &&
    parts[2].trim() !== ''
  ) {
    return true
  }
  return false
}

export function isParticipantEmbedPath(pathname) {
  const parts = String(pathname || '')
    .split('/')
    .filter(Boolean)
  return parts[0] === 'embed' && parts[1] === 'participant'
}

export function normalizeSessionCode(code) {
  return String(code || '')
    .trim()
    .toUpperCase()
}

function isLocalhostHost(hostname) {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]'
  )
}

export function isLocalhostUrl(url) {
  if (!url) return false
  try {
    return isLocalhostHost(new URL(url).hostname)
  } catch {
    return /localhost|127\.0\.0\.1/i.test(String(url))
  }
}

/**
 * Prefer the configured/current public join URL; ignore API localhost URLs in production.
 */
export function resolveSessionJoinUrl(apiJoinUrl, sessionCodeOrId) {
  const localJoinUrl = buildSessionJoinUrl(sessionCodeOrId)
  if (!apiJoinUrl) return localJoinUrl

  const hasConfiguredPublicUrl = Boolean(
    import.meta.env.VITE_PUBLIC_APP_URL || import.meta.env.VITE_APP_URL,
  )

  if (hasConfiguredPublicUrl) return localJoinUrl

  if (import.meta.env.PROD && isLocalhostUrl(apiJoinUrl)) {
    return localJoinUrl
  }

  if (isLocalhostUrl(apiJoinUrl) && !isLocalhostUrl(localJoinUrl)) {
    return localJoinUrl
  }

  return apiJoinUrl
}
