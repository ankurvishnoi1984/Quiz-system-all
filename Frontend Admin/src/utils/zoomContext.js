import { isZoomMockContextEnabled } from '../utils/integrations'

/**
 * @typedef {object} ZoomMeetingContext
 * @property {string} meetingUuid
 * @property {string|null} meetingId
 * @property {'host'|'coHost'|'participant'|'unknown'} role
 * @property {string|null} zoomUserId
 * @property {string|null} displayName
 * @property {'sdk'|'mock'|'query'} source
 */

function normalizeRole(raw) {
  const value = String(raw || '')
    .trim()
    .toLowerCase()
  if (value === 'host' || value === 'meeting_host') return 'host'
  if (value === 'cohost' || value === 'co_host' || value === 'co-host') return 'coHost'
  if (value === 'participant' || value === 'attendee') return 'participant'
  return 'unknown'
}

function contextFromSearchParams(searchParams) {
  const meetingUuid =
    searchParams.get('mockMeetingUuid') ||
    searchParams.get('meetingUuid') ||
    searchParams.get('meeting_uuid')
  if (!meetingUuid) return null

  return {
    meetingUuid: String(meetingUuid).trim(),
    meetingId: searchParams.get('meetingId') || searchParams.get('meeting_id') || null,
    role: normalizeRole(searchParams.get('mockRole') || searchParams.get('role') || 'participant'),
    zoomUserId: searchParams.get('mockZoomUserId') || searchParams.get('zoomUserId') || null,
    displayName: searchParams.get('mockDisplayName') || searchParams.get('displayName') || null,
    source: searchParams.get('mockMeetingUuid') ? 'mock' : 'query',
  }
}

async function tryLoadZoomSdkContext() {
  try {
    const mod = await import('@zoom/appssdk')
    const zoomSdk = mod?.default || mod?.zoomSdk || mod
    if (!zoomSdk?.config) return null

    await zoomSdk.config({
      capabilities: [
        'getMeetingContext',
        'getUserContext',
        'getRunningContext',
        'openUrl',
      ],
    })

    const [meeting, user] = await Promise.all([
      zoomSdk.getMeetingContext().catch(() => null),
      zoomSdk.getUserContext().catch(() => null),
    ])

    const meetingUuid = meeting?.meetingUUID || meeting?.meetingUuid || null
    if (!meetingUuid) return null

    const role = normalizeRole(user?.role || meeting?.role)
    return {
      meetingUuid: String(meetingUuid),
      meetingId: meeting?.meetingID || meeting?.meetingId || null,
      role,
      zoomUserId: user?.participantUUID || user?.userId || user?.participantId || null,
      displayName: user?.screenName || user?.displayName || null,
      source: 'sdk',
    }
  } catch {
    return null
  }
}

/**
 * Resolve Zoom meeting context from Apps SDK, then query/mock fallbacks.
 * @param {URLSearchParams} searchParams
 * @returns {Promise<ZoomMeetingContext|null>}
 */
export async function resolveZoomMeetingContext(searchParams) {
  const fromQuery = contextFromSearchParams(searchParams)
  if (fromQuery?.source === 'mock' || (fromQuery && !isZoomMockContextEnabled())) {
    return fromQuery
  }

  const fromSdk = await tryLoadZoomSdkContext()
  if (fromSdk) return fromSdk

  if (fromQuery) return fromQuery

  if (isZoomMockContextEnabled()) {
    return {
      meetingUuid: 'dev-meeting-local',
      meetingId: null,
      role: 'host',
      zoomUserId: 'dev-host-1',
      displayName: 'Dev Host',
      source: 'mock',
    }
  }

  return null
}

export function isHostLikeRole(role) {
  return role === 'host' || role === 'coHost'
}
