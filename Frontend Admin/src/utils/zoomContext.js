import { isZoomMockContextEnabled } from '../utils/integrations'

/**
 * @typedef {'unauthenticated'|'authenticated'|'authorized'|null} ZoomUserStatus
 *
 * @typedef {object} ZoomMeetingContext
 * @property {string} meetingUuid
 * @property {string|null} meetingId
 * @property {'host'|'coHost'|'participant'|'unknown'} role
 * @property {string|null} zoomUserId
 * @property {string|null} displayName
 * @property {'sdk'|'mock'|'query'} source
 * @property {ZoomUserStatus} status Zoom Apps user status from getUserContext
 * @property {boolean} isGuest True when Zoom Guest Mode (not fully authorized)
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
  'onMyUserContextChange',
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

function normalizeStatus(raw) {
  const value = String(raw || '')
    .trim()
    .toLowerCase()
  if (value === 'unauthenticated' || value === 'authenticated' || value === 'authorized') {
    return value
  }
  return null
}

/**
 * Guest Mode: Zoom signed-out users are unauthenticated; signed-in users who have
 * not added the app are authenticated. Only authorized users completed in-client OAuth.
 */
export function isZoomGuestStatus(status) {
  return status === 'unauthenticated' || status === 'authenticated'
}

function withGuestFields(context, { status = null, forceGuest = false } = {}) {
  const normalizedStatus = normalizeStatus(status)
  const isGuest = forceGuest || isZoomGuestStatus(normalizedStatus)
  let role = context.role

  // Unsigned Zoom users (true guests) never get the host console.
  if (normalizedStatus === 'unauthenticated' || (forceGuest && !isHostLikeRole(role))) {
    role = 'participant'
  } else if (isGuest && role === 'unknown') {
    role = 'participant'
  }

  return {
    ...context,
    role,
    status: normalizedStatus,
    isGuest,
  }
}

function contextFromSearchParams(searchParams) {
  const meetingUuid =
    searchParams.get('mockMeetingUuid') ||
    searchParams.get('meetingUuid') ||
    searchParams.get('meeting_uuid')
  if (!meetingUuid) return null

  const forceGuest =
    searchParams.get('mockGuest') === '1' ||
    searchParams.get('mockGuest') === 'true' ||
    normalizeStatus(searchParams.get('mockStatus')) === 'unauthenticated'

  const status =
    normalizeStatus(searchParams.get('mockStatus')) ||
    (forceGuest ? 'unauthenticated' : null)

  return withGuestFields(
    {
      meetingUuid: String(meetingUuid).trim(),
      meetingId: searchParams.get('meetingId') || searchParams.get('meeting_id') || null,
      role: normalizeRole(searchParams.get('mockRole') || searchParams.get('role') || 'participant'),
      zoomUserId: searchParams.get('mockZoomUserId') || searchParams.get('zoomUserId') || null,
      displayName: searchParams.get('mockDisplayName') || searchParams.get('displayName') || null,
      source: searchParams.get('mockMeetingUuid') ? 'mock' : 'query',
    },
    { status, forceGuest },
  )
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

async function resolveMeetingUuid(zoomSdk, meeting) {
  const fromMeeting = meeting?.meetingUUID || meeting?.meetingUuid || null
  if (fromMeeting) return String(fromMeeting)

  if (typeof zoomSdk.getMeetingUUID === 'function') {
    try {
      const result = await zoomSdk.getMeetingUUID()
      const uuid =
        result?.meetingUUID ||
        result?.meetingUuid ||
        (typeof result === 'string' ? result : null)
      if (uuid) return String(uuid)
    } catch {
      // Guests / restricted contexts may lack this API.
    }
  }

  return null
}

async function tryLoadZoomSdkContext() {
  try {
    const zoomSdk = await getZoomSdk()
    if (!zoomSdk) return null

    const [meeting, user] = await Promise.all([
      zoomSdk.getMeetingContext().catch(() => null),
      zoomSdk.getUserContext().catch(() => null),
    ])

    const meetingUuid = await resolveMeetingUuid(zoomSdk, meeting)
    if (!meetingUuid) return null

    const status = normalizeStatus(user?.status)
    const role = normalizeRole(user?.role || meeting?.role)

    return withGuestFields(
      {
        meetingUuid,
        meetingId: meeting?.meetingID || meeting?.meetingId || null,
        role,
        zoomUserId: user?.participantUUID || user?.userId || user?.participantId || null,
        displayName: user?.screenName || user?.displayName || null,
        source: 'sdk',
      },
      { status },
    )
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
    return withGuestFields(
      {
        meetingUuid: 'dev-meeting-local',
        meetingId: null,
        role: 'host',
        zoomUserId: 'dev-host-1',
        displayName: 'Dev Host',
        source: 'mock',
      },
      { status: 'authorized' },
    )
  }

  return null
}

export function isHostLikeRole(role) {
  return role === 'host' || role === 'coHost'
}

/**
 * Stable-ish fingerprint for join APIs when Zoom user id is missing (common for guests).
 * @param {ZoomMeetingContext} context
 */
export function buildZoomDeviceFingerprint(context) {
  if (context?.zoomUserId) return `zoom:${context.zoomUserId}`
  if (context?.isGuest && context?.meetingUuid) {
    const key = `zoom-guest-fp:${context.meetingUuid}`
    try {
      const existing = sessionStorage.getItem(key)
      if (existing) return existing
      const created = `zoom-guest:${context.meetingUuid}:${Math.random().toString(36).slice(2, 10)}`
      sessionStorage.setItem(key, created)
      return created
    } catch {
      return `zoom-guest:${context.meetingUuid}:ephemeral`
    }
  }
  return undefined
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

/**
 * Subscribe to Zoom user context changes (guest ↔ authenticated ↔ authorized).
 * @param {(event: object) => void} handler
 * @returns {() => void} unsubscribe
 */
export function subscribeMyUserContextChange(handler) {
  let cancelled = false
  let zoomSdk = null

  const listener = (event) => {
    if (!cancelled) handler(event)
  }

  ;(async () => {
    zoomSdk = await getZoomSdk()
    if (cancelled || !zoomSdk?.addEventListener) return
    zoomSdk.addEventListener('onMyUserContextChange', listener)
  })()

  return () => {
    cancelled = true
    if (zoomSdk?.removeEventListener) {
      zoomSdk.removeEventListener('onMyUserContextChange', listener)
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

/**
 * Merge a getUserContext / onMyUserContextChange payload into an existing context.
 * @param {ZoomMeetingContext} context
 * @param {object} userEvent
 */
export function applyUserContextChange(context, userEvent) {
  if (!context) return context
  const status = normalizeStatus(userEvent?.status) || context.status
  const role = normalizeRole(userEvent?.role || context.role)
  return withGuestFields(
    {
      ...context,
      role,
      zoomUserId:
        userEvent?.participantUUID ||
        userEvent?.userId ||
        userEvent?.participantId ||
        context.zoomUserId,
      displayName: userEvent?.screenName || userEvent?.displayName || context.displayName,
    },
    { status },
  )
}
