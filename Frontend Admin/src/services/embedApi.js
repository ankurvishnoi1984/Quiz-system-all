import { hostAuthRequest } from './hostAuthRequest'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1'

/**
 * Long-lived embed link for a session. `action` is one of:
 *  - `get`    reuse the current link (or mint the first one)
 *  - `rotate` revoke the old link and mint a replacement
 *  - `revoke` kill every link for this session
 */
export async function getSessionEmbedLinkApi(accessToken, sessionId, action = 'get') {
  return hostAuthRequest(`/sessions/${sessionId}/embed-link`, accessToken, {
    method: 'POST',
    body: JSON.stringify({ action }),
  })
}

export async function lookupSessionByCodeApi(sessionCode) {
  const response = await fetch(
    `${API_BASE_URL}/sessions/join/${encodeURIComponent(sessionCode)}`,
  )
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.message || 'Session code not found')
  }
  return payload?.data?.session || null
}

/** Resolve a signed join_token into name/email/mobile (public). */
export async function resolveJoinIdentityTokenApi(sessionCode, joinToken) {
  const response = await fetch(
    `${API_BASE_URL}/sessions/join/${encodeURIComponent(sessionCode)}/identity-token/resolve`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ join_identity_token: joinToken }),
    },
  )
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.message || 'Join token is invalid or expired')
  }
  return payload?.data || null
}

/** Host: mint a short-lived signed participant join link. */
export async function mintJoinIdentityTokenApi(accessToken, sessionId, body) {
  return hostAuthRequest(`/sessions/${sessionId}/join-identity-token`, accessToken, {
    method: 'POST',
    body: JSON.stringify(body || {}),
  })
}

export function buildEmbedDisplayUrl({ origin, sessionId, token }) {
  const base = (origin || window.location.origin).replace(/\/+$/, '')
  return `${base}/embed/display?session=${encodeURIComponent(sessionId)}&token=${encodeURIComponent(token)}`
}

export function buildEmbedControlsUrl({ origin, sessionId }) {
  const base = (origin || window.location.origin).replace(/\/+$/, '')
  return `${base}/embed/controls?session=${encodeURIComponent(sessionId)}`
}

export function buildEmbedIframeSnippet(url, { width = 960, height = 540, title = 'Live quiz results' } = {}) {
  return `<iframe src="${url}" width="${width}" height="${height}" frameborder="0" allowfullscreen title="${title}"></iframe>`
}

/** Iframe snippet for the participant join page (portal / LMS embed). */
export function buildParticipantJoinIframeSnippet(joinUrl, { width = 420, height = 720 } = {}) {
  return buildEmbedIframeSnippet(joinUrl, {
    width,
    height,
    title: 'Join quiz session',
  })
}
