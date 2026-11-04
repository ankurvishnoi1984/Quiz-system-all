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
 * @property {string|null} [runningContext]
 * @property {boolean} [browserDemo] True when opened outside Zoom and SDK was unavailable
 */

/** Core APIs needed to boot the app. Must be allow-listed on Marketplace. */
export const ZOOM_SDK_CORE_CAPABILITIES = [
  'getRunningContext',
  'getMeetingContext',
  'getUserContext',
  'getMeetingUUID',
  'getSupportedJsApis',
  'openUrl',
  'onMyUserContextChange',
]

/**
 * Collaborate APIs for Open for everyone.
 * Do NOT include sendAppInvitation / sendAppInvitationToAllParticipants here —
 * some Marketplace apps cannot add those; we call them only if present on zoomSdk.
 */
export const ZOOM_SDK_COLLABORATE_CAPABILITIES = [
  'startCollaborate',
  'endCollaborate',
  'joinCollaborate',
  'leaveCollaborate',
  'onCollaborateChange',
  'showAppInvitationDialog',
]

/** Optional invite APIs — used only when Zoom exposes them after config. */
export const ZOOM_SDK_OPTIONAL_INVITE_APIS = [
  'sendAppInvitation',
  'sendAppInvitationToAllParticipants',
]

/** Full list (docs / Marketplace checklist). */
export const ZOOM_SDK_CAPABILITIES = [
  ...ZOOM_SDK_CORE_CAPABILITIES,
  ...ZOOM_SDK_COLLABORATE_CAPABILITIES,
  ...ZOOM_SDK_OPTIONAL_INVITE_APIS,
]

/** Short boot timeout — browsers hang on config(); fail over to demo quickly. */
const BOOT_SDK_TIMEOUT_MS = 2000
/** Longer timeout for in-meeting Collaborate / invite calls. */
const SDK_TIMEOUT_MS = 5000
const IN_MEETING_CONTEXTS = new Set(['inMeeting', 'inWebinar'])

let configuredSdkPromise = null
let configuredSdk = null
let collaborateConfigured = false
let lastRunningContext = null

function withTimeout(promise, ms, message, code) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(message)
      err.code = code
      reject(err)
    }, ms)
  })
  return Promise.race([Promise.resolve(promise), timeout]).finally(() => {
    clearTimeout(timer)
  })
}

function zoomError(message, code) {
  const err = new Error(message)
  err.code = code
  return err
}

function resetSdkCache() {
  configuredSdkPromise = null
  configuredSdk = null
  collaborateConfigured = false
  lastRunningContext = null
}

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

export function isHostLikeRole(role) {
  return role === 'host' || role === 'coHost'
}

function withGuestFields(context, { status = null, forceGuest = false } = {}) {
  const normalizedStatus = normalizeStatus(status)
  const isGuest = forceGuest || isZoomGuestStatus(normalizedStatus)
  let role = context.role

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
      runningContext: null,
    },
    { status, forceGuest },
  )
}

async function loadZoomSdkModule() {
  const mod = await import('@zoom/appssdk')
  return mod?.default || mod?.zoomSdk || mod
}

function isInMeetingRunningContext(runningContext) {
  return IN_MEETING_CONTEXTS.has(String(runningContext || ''))
}

function assertInMeetingOrThrow(runningContext) {
  if (runningContext && !isInMeetingRunningContext(runningContext)) {
    throw zoomError(
      'Open the Quiz app from inside a Zoom meeting (Apps during the call), not only from the main Apps tab.',
      'ZOOM_OUT_OF_MEETING',
    )
  }
}

/**
 * Configure Zoom Apps SDK with core capabilities.
 * Entire bootstrap (import + config) is wrapped in a timeout so a hung CEF import cannot block forever.
 * @param {{ includeCollaborate?: boolean }} [options]
 * @returns {Promise<object|null>}
 */
export async function getZoomSdk(options = {}) {
  const includeCollaborate = Boolean(options.includeCollaborate)

  if (configuredSdk && (!includeCollaborate || collaborateConfigured)) {
    return configuredSdk
  }

  if (configuredSdkPromise && !includeCollaborate) {
    return configuredSdkPromise
  }

  const bootTimeoutMs = includeCollaborate ? SDK_TIMEOUT_MS : BOOT_SDK_TIMEOUT_MS

  const run = withTimeout(
    (async () => {
      const zoomSdk = configuredSdk || (await loadZoomSdkModule())
      if (!zoomSdk?.config) return null

      const capabilities = includeCollaborate
        ? [...ZOOM_SDK_CORE_CAPABILITIES, ...ZOOM_SDK_COLLABORATE_CAPABILITIES]
        : [...ZOOM_SDK_CORE_CAPABILITIES]

      const configResponse = await zoomSdk.config({ capabilities })

      lastRunningContext = configResponse?.runningContext || lastRunningContext

      // Fail fast when opened from main Apps tab (not in a meeting).
      assertInMeetingOrThrow(lastRunningContext)

      if (!lastRunningContext && typeof zoomSdk.getRunningContext === 'function') {
        try {
          const running = await withTimeout(
            zoomSdk.getRunningContext(),
            1500,
            'Timed out reading Zoom running context.',
            'ZOOM_SDK_TIMEOUT',
          )
          lastRunningContext =
            typeof running === 'string' ? running : running?.runningContext || lastRunningContext
          assertInMeetingOrThrow(lastRunningContext)
        } catch (err) {
          if (err?.code === 'ZOOM_OUT_OF_MEETING' || err?.code === 'ZOOM_SDK_TIMEOUT') throw err
        }
      }

      configuredSdk = zoomSdk
      if (includeCollaborate) collaborateConfigured = true
      return zoomSdk
    })(),
    bootTimeoutMs,
    'Zoom Apps SDK took too long to start. Close and reopen the app from inside a meeting, or update the Zoom client.',
    'ZOOM_SDK_TIMEOUT',
  ).catch((err) => {
    resetSdkCache()
    throw err
  })

  if (!includeCollaborate) {
    configuredSdkPromise = run
    return configuredSdkPromise
  }

  return run
}

async function ensureCollaborateCapabilities() {
  return getZoomSdk({ includeCollaborate: true })
}

async function resolveMeetingUuid(zoomSdk, meeting) {
  const fromMeeting = meeting?.meetingUUID || meeting?.meetingUuid || null
  if (fromMeeting) return String(fromMeeting)

  if (typeof zoomSdk.getMeetingUUID === 'function') {
    try {
      const result = await withTimeout(
        zoomSdk.getMeetingUUID(),
        SDK_TIMEOUT_MS,
        'Timed out reading Zoom meeting id.',
        'ZOOM_SDK_TIMEOUT',
      )
      const uuid =
        result?.meetingUUID ||
        result?.meetingUuid ||
        (typeof result === 'string' ? result : null)
      if (uuid) return String(uuid)
    } catch (err) {
      if (err?.code === 'ZOOM_SDK_TIMEOUT') throw err
    }
  }

  return null
}

async function tryLoadZoomSdkContext() {
  const zoomSdk = await getZoomSdk()
  if (!zoomSdk) return null

  assertInMeetingOrThrow(lastRunningContext)

  if (!lastRunningContext && typeof zoomSdk.getRunningContext === 'function') {
    try {
      const running = await withTimeout(
        zoomSdk.getRunningContext(),
        2000,
        'Timed out reading Zoom running context.',
        'ZOOM_SDK_TIMEOUT',
      )
      const ctx = typeof running === 'string' ? running : running?.runningContext
      if (ctx) {
        lastRunningContext = ctx
        assertInMeetingOrThrow(ctx)
      }
    } catch (err) {
      if (err?.code === 'ZOOM_OUT_OF_MEETING' || err?.code === 'ZOOM_SDK_TIMEOUT') throw err
    }
  }

  const [meeting, user] = await Promise.all([
    withTimeout(
      zoomSdk.getMeetingContext().catch(() => null),
      SDK_TIMEOUT_MS,
      'Timed out reading Zoom meeting context. Start or join a meeting, then reopen the Quiz app.',
      'ZOOM_SDK_TIMEOUT',
    ),
    withTimeout(
      zoomSdk.getUserContext().catch(() => null),
      SDK_TIMEOUT_MS,
      'Timed out reading Zoom user context.',
      'ZOOM_SDK_TIMEOUT',
    ),
  ])

  const meetingUuid = await resolveMeetingUuid(zoomSdk, meeting)
  if (!meetingUuid) {
    throw zoomError(
      'Open the Quiz app from inside a Zoom meeting (Apps during the call), not only from the main Apps tab.',
      'ZOOM_OUT_OF_MEETING',
    )
  }

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
      runningContext: lastRunningContext,
    },
    { status },
  )
}

/**
 * Browser / web-demo host context when Zoom SDK is unavailable.
 * @returns {ZoomMeetingContext}
 */
export function createBrowserDemoContext() {
  return withGuestFields(
    {
      meetingUuid: 'dev-meeting-local',
      meetingId: null,
      role: 'host',
      zoomUserId: 'dev-host-1',
      displayName: 'Dev Host',
      source: 'mock',
      runningContext: null,
      browserDemo: true,
    },
    { status: 'authorized' },
  )
}

/** True when /zoom/app fell back to demo because we are not inside Zoom. */
export function isBrowserDemoContext(context) {
  return Boolean(context?.browserDemo)
}

/**
 * Resolve Zoom meeting context from Apps SDK, then query/mock/browser-demo fallbacks.
 * @param {URLSearchParams} searchParams
 * @returns {Promise<ZoomMeetingContext|null>}
 */
export async function resolveZoomMeetingContext(searchParams) {
  const fromQuery = contextFromSearchParams(searchParams)
  // Explicit mockMeetingUuid (Share local mock) — never wait on SDK.
  if (fromQuery?.source === 'mock' || (fromQuery && !isZoomMockContextEnabled())) {
    return fromQuery
  }

  try {
    const fromSdk = await tryLoadZoomSdkContext()
    if (fromSdk) return fromSdk
  } catch (err) {
    // Real Zoom main client with known runningContext — keep the out-of-meeting message.
    if (err?.code === 'ZOOM_OUT_OF_MEETING') {
      throw err
    }
    // Browser / unsupported client: SDK throw or timeout → web demo instead of fatal error.
    if (fromQuery) return fromQuery
    return createBrowserDemoContext()
  }

  if (fromQuery) return fromQuery

  // SDK returned null without throwing (no meeting uuid, etc.)
  if (isZoomMockContextEnabled()) {
    return createBrowserDemoContext()
  }

  // Production with mock flag off: still offer browser demo when SDK did not configure.
  return createBrowserDemoContext()
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
 * Slido-like: Collaborate first, then Zoom invite dialog.
 * sendAppInvitation* only if the client exposes them (optional Marketplace APIs).
 * @returns {Promise<{ collaborate: boolean, invite: boolean }>}
 */
export async function openQuizForEveryone() {
  let zoomSdk
  try {
    zoomSdk = await ensureCollaborateCapabilities()
  } catch (err) {
    if (err?.code === 'ZOOM_SDK_TIMEOUT' || err?.code === 'ZOOM_OUT_OF_MEETING') throw err
    zoomSdk = null
  }

  if (!zoomSdk) {
    throw zoomError(
      'Open this app from a Zoom meeting to invite participants.',
      'ZOOM_SDK_UNAVAILABLE',
    )
  }

  let collaborate = false
  let invite = false
  const errors = []

  if (typeof zoomSdk.startCollaborate === 'function') {
    try {
      await withTimeout(
        zoomSdk.startCollaborate({ shareScreen: true }),
        SDK_TIMEOUT_MS,
        'Timed out starting Collaborate mode.',
        'ZOOM_SDK_TIMEOUT',
      )
      collaborate = true
    } catch (err) {
      errors.push(err?.message || 'Could not start Collaborate mode')
    }
  }

  // Prefer Zoom's built-in invite dialog (available in more Marketplace apps).
  if (typeof zoomSdk.showAppInvitationDialog === 'function') {
    try {
      await withTimeout(
        zoomSdk.showAppInvitationDialog({
          dialogHeading: 'Join the quiz',
          messageText: 'Open the Quiz app to take part in this meeting.',
          dialogButtonText: 'Invite',
          primaryButtonText: 'Open',
        }),
        SDK_TIMEOUT_MS,
        'Timed out opening the invite dialog.',
        'ZOOM_SDK_TIMEOUT',
      )
      invite = true
    } catch (err) {
      errors.push(err?.message || 'Could not open the invite dialog')
    }
  }

  if (!invite && typeof zoomSdk.sendAppInvitationToAllParticipants === 'function') {
    try {
      await withTimeout(
        zoomSdk.sendAppInvitationToAllParticipants(),
        SDK_TIMEOUT_MS,
        'Timed out inviting participants.',
        'ZOOM_SDK_TIMEOUT',
      )
      invite = true
    } catch (err) {
      errors.push(err?.message || 'Could not invite all participants')
    }
  }

  if (!collaborate && !invite) {
    throw zoomError(
      errors.filter(Boolean).join(' ') ||
        'Could not open the quiz for participants. Enable Collaborate Mode and showAppInvitationDialog on the Zoom app.',
      'ZOOM_OPEN_EVERYONE_FAILED',
    )
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
    try {
      zoomSdk = await ensureCollaborateCapabilities()
    } catch {
      return
    }
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
    try {
      zoomSdk = await getZoomSdk()
    } catch {
      return
    }
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

/** Clear cached SDK so Try again can re-run config. */
export function resetZoomSdkForRetry() {
  resetSdkCache()
}

export function getLastZoomRunningContext() {
  return lastRunningContext
}

/** Absolute UI deadline so Starting… cannot stick even if Zoom CEF ignores promise races. */
export const ZOOM_RESOLVE_WATCHDOG_MS = 6500
