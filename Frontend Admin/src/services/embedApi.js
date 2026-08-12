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

export function buildEmbedDisplayUrl({ origin, sessionId, token }) {
  const base = (origin || window.location.origin).replace(/\/+$/, '')
  return `${base}/embed/display?session=${encodeURIComponent(sessionId)}&token=${encodeURIComponent(token)}`
}

export function buildEmbedControlsUrl({ origin, sessionId }) {
  const base = (origin || window.location.origin).replace(/\/+$/, '')
  return `${base}/embed/controls?session=${encodeURIComponent(sessionId)}`
}

export function buildEmbedIframeSnippet(url, { width = 960, height = 540 } = {}) {
  return `<iframe src="${url}" width="${width}" height="${height}" frameborder="0" allowfullscreen title="Live quiz results"></iframe>`
}
