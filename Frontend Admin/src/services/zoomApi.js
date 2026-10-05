import { hostAuthRequest } from './hostAuthRequest'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1'

async function parseJson(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

async function publicRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  const payload = await parseJson(response)
  if (!response.ok) {
    const err = new Error(payload?.message || 'Request failed')
    err.status = response.status
    err.code = payload?.code || null
    throw err
  }
  return payload?.data
}

export async function getZoomStatusApi() {
  return publicRequest('/integrations/zoom/status')
}

export async function getMyZoomStatusApi(accessToken) {
  return hostAuthRequest('/integrations/zoom/status/me', accessToken)
}

export async function startZoomOAuthApi(accessToken) {
  return hostAuthRequest('/integrations/zoom/oauth/start', accessToken, { method: 'POST' })
}

export async function disconnectZoomApi(accessToken) {
  return hostAuthRequest('/integrations/zoom/oauth/disconnect', accessToken, { method: 'POST' })
}

export async function getZoomMeetingSessionApi(meetingUuid) {
  const qs = new URLSearchParams({ meeting_uuid: meetingUuid })
  return publicRequest(`/integrations/zoom/meeting-session?${qs.toString()}`)
}

export async function bindZoomMeetingSessionApi(accessToken, { meetingUuid, meetingId, sessionId }) {
  return hostAuthRequest('/integrations/zoom/meeting-session', accessToken, {
    method: 'PUT',
    body: JSON.stringify({
      meeting_uuid: meetingUuid,
      meeting_id: meetingId || null,
      session_id: sessionId,
    }),
  })
}

export async function unbindZoomMeetingSessionApi(accessToken, meetingUuid) {
  return hostAuthRequest(
    `/integrations/zoom/meeting-session?meeting_uuid=${encodeURIComponent(meetingUuid)}`,
    accessToken,
    { method: 'DELETE' },
  )
}

export async function joinZoomMeetingSessionApi(body) {
  return publicRequest('/integrations/zoom/meeting-session/join', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
