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

/** Capabilities must also be allow-listed on the Marketplace Zoom App SDK feature list. */
export const ZOOM_SDK_CAPABILITIES = [
  'getMeetingContext',
  'getUserContext',
  'getRunningContext',
  'openUrl',
  'getMeetingUUID',
  'getSupportedJsApis',
  'startCollaborate',
  'endCollaborate',
  'joinCollaborate',
  'leaveCollaborate',
  'onCollaborateChange',
  'sendAppInvitation',
  'sendAppInvitationToAllParticipants',
  'showAppInvitationDialog',
]

let configuredSdkPromise = null

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

/**
 * Lazily load and config the Zoom Apps SDK once per page.
 * @returns {Promise<object|null>}
 */
export async function getZoomSdk() {
  if (configuredSdkPromise) return configuredSdkPromise

  configuredSdkPromise = (async () => {
    try {
      const mod = await import('@zoom/appssdk')
      const zoomSdk = mod?.default || mod?.zoomSdk || mod
      if (!zoomSdk?.config) return null

      await zoomSdk.config({
        capabilities: ZOOM_SDK_CAPABILITIES,
      })
      return zoomSdk
    } catch {
      configuredSdkPromise = null
      return null
    }
  })()

  return configuredSdkPromise
}

async function tryLoadZoomSdkContext() {
  try {
    const zoomSdk = await getZoomSdk()
    if (!zoomSdk) return null

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

/**
 * Slido-like: start Collaborate, then invite everyone so participants open the app.
 * Falls back to invitation dialog if collaborate/invite-all are unavailable.
 * @returns {Promise<{ collaborate: boolean, invite: boolean }>}
 */
export async function openQuizForEveryone() {
  const zoomSdk = await getZoomSdk()
  if (!zoomSdk) {
    const err = new Error('Open this app from a Zoom meeting to invite participants.')
    err.code = 'ZOOM_SDK_UNAVAILABLE'
    throw err
  }

  let collaborate = false
  let invite = false
  const errors = []

  if (typeof zoomSdk.startCollaborate === 'function') {
    try {
      await zoomSdk.startCollaborate({ shareScreen: true })
      collaborate = true
    } catch (err) {
      errors.push(err?.message || 'Could not start Collaborate mode')
    }
  }

  if (typeof zoomSdk.sendAppInvitationToAllParticipants === 'function') {
    try {
      await zoomSdk.sendAppInvitationToAllParticipants()
      invite = true
    } catch (err) {
      errors.push(err?.message || 'Could not invite all participants')
    }
  }

  if (!invite && typeof zoomSdk.showAppInvitationDialog === 'function') {
    try {
      await zoomSdk.showAppInvitationDialog({
        dialogHeading: 'Join the quiz',
        messageText: 'Open the Quiz app to take part in this meeting.',
        dialogButtonText: 'Invite',
        primaryButtonText: 'Open',
      })
      invite = true
    } catch (err) {
      errors.push(err?.message || 'Could not open the invite dialog')
    }
  }

  if (!collaborate && !invite) {
    const err = new Error(
      errors.filter(Boolean).join(' ') ||
        'Could not open the quiz for participants. Enable Collaborate Mode and invitation APIs on the Zoom app.',
    )
    err.code = 'ZOOM_OPEN_EVERYONE_FAILED'
    throw err
  }

  return { collaborate, invite }
}

/**
 * Subscribe to Collaborate mode changes. No-op outside Zoom client.
 * @param {(event: object) => void} handler
 * @returns {() => void} unsubscribe
 */
export function subscribeCollaborateChange(handler) {
  let cancelled = false
  let zoomSdk = null

  const listener = (event) => {
    if (!cancelled) handler(event)
  }

  ;(async () => {
    zoomSdk = await getZoomSdk()
    if (cancelled || !zoomSdk?.addEventListener) return
    zoomSdk.addEventListener('onCollaborateChange', listener)
  })()

  return () => {
    cancelled = true
    if (zoomSdk?.removeEventListener) {
      zoomSdk.removeEventListener('onCollaborateChange', listener)
    }
  }
}

export function isCollaborateActiveFromEvent(event) {
  const action = String(event?.action || event?.collaborateAction || '').toLowerCase()
  if (['start', 'started', 'join', 'joined'].includes(action)) return true
  if (['end', 'ended', 'leave', 'left'].includes(action)) return false
  if (typeof event?.collaborate === 'boolean') return event.collaborate
  return Boolean(event)
}
