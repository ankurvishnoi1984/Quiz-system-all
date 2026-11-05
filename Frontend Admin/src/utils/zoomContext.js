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

/**
 * Minimal APIs for first config() — fewer Marketplace mismatches / hangs.
 * Must be allow-listed on Marketplace.
 */
export const ZOOM_SDK_BOOT_CAPABILITIES = [
  'getRunningContext',
  'getMeetingContext',
  'getUserContext',
  'getMeetingUUID',
]

/** Extra core APIs added after a successful minimal boot (best-effort). */
export const ZOOM_SDK_EXTENDED_CORE_CAPABILITIES = [
  'getSupportedJsApis',
  'openUrl',
  'onMyUserContextChange',
]

/** Full core set (docs / Marketplace checklist). */
export const ZOOM_SDK_CORE_CAPABILITIES = [
  ...ZOOM_SDK_BOOT_CAPABILITIES,
  ...ZOOM_SDK_EXTENDED_CORE_CAPABILITIES,
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

/** Short boot timeout — normal browsers hang on config(); fail over to demo quickly. */
const BOOT_SDK_TIMEOUT_BROWSER_MS = 2000
/** Zoom CEF often needs longer for config() inside a meeting. */
const BOOT_SDK_TIMEOUT_ZOOM_MS = 15000
/** WebView2 path: settle + handshake + one retry must fit inside this. */
const BOOT_SDK_TIMEOUT_WEBVIEW_MS = 25000
/** First handshake attempt budget (getRunningContext only). */
const HANDSHAKE_CONFIG_TIMEOUT_MS = 8000
const WEBVIEW_SETTLE_MS = 400
const HANDSHAKE_RETRY_DELAY_MS = 1000
/** Longer timeout for in-meeting Collaborate / invite calls. */
const SDK_TIMEOUT_MS = 10000
/** Smallest config() that proves the native bridge answers. */
export const ZOOM_SDK_HANDSHAKE_CAPABILITIES = ['getRunningContext']
const IN_MEETING_CONTEXTS = new Set(['inMeeting', 'inWebinar'])

let configuredSdkPromise = null
let configuredSdk = null
let collaborateConfigured = false
let extendedCoreConfigured = false
/** True only after a config() call has actually resolved (native side ready). */
let sdkConfigCompleted = false
/** True after ZOOM_SDK_BOOT_CAPABILITIES (or collaborate set) has been configured. */
let bootConfigured = false
let lastRunningContext = null
let lastSdkConfigDetail = null
let webviewMessageCount = 0
let webviewMessageProbeAttached = false

/**
 * Zoom Apps SDK wraps the instance in a Proxy that invents ANY missing method,
 * including `.then`. Returning that Proxy from async / Promise.resolve makes JS
 * treat it as a thenable → console warning "Method then is not available…" and
 * callZoomApi('then') → "must call zoomSdk.config before using other API methods".
 * Hide fabricated `.then` so Promise adoption never fires.
 * @param {object} sdk
 */
function withoutFabricatedThenable(sdk) {
  if (!sdk || typeof sdk !== 'object') return sdk
  return new Proxy(sdk, {
    get(target, prop, receiver) {
      if (prop === 'then') return undefined
      return Reflect.get(target, prop, receiver)
    },
  })
}

function unwrapZoomSdkExport(mod) {
  const root = mod?.default || mod?.zoomSdk || mod
  if (root && typeof root.config === 'function') return root
  if (root?.default && typeof root.default.config === 'function') return root.default
  return root
}

/** True when value looks like the Zoom SDK Proxy (thenable trap), not a real Promise. */
function isZoomSdkInstance(value) {
  return Boolean(
    value &&
      typeof value === 'object' &&
      typeof value.config === 'function' &&
      !(value instanceof Promise),
  )
}

/** Adopt only real Promises — never Zoom's fabricated `.then`. */
function asSafePromise(value) {
  if (value instanceof Promise) return value
  if (isZoomSdkInstance(value)) {
    return new Promise((resolve) => {
      resolve(withoutFabricatedThenable(value))
    })
  }
  return Promise.resolve(value)
}

function withTimeout(promise, ms, message, code) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(message)
      err.code = code
      reject(err)
    }, ms)
  })
  return Promise.race([asSafePromise(promise), timeout]).finally(() => {
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
  extendedCoreConfigured = false
  sdkConfigCompleted = false
  bootConfigured = false
  lastRunningContext = null
  lastSdkConfigDetail = null
  webviewMessageCount = 0
}

function isConfigResponseUsable(response) {
  if (response == null || typeof response !== 'object') return false
  return (
    'runningContext' in response ||
    'clientVersion' in response ||
    'unsupportedApis' in response ||
    Object.keys(response).length > 0
  )
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Count any chrome.webview messages during boot (0 ⇒ Zoom never talked back). */
function attachWebviewMessageProbe() {
  if (typeof window === 'undefined' || !window.chrome?.webview) return
  if (webviewMessageProbeAttached) return
  webviewMessageProbeAttached = true
  try {
    window.chrome.webview.addEventListener('message', () => {
      webviewMessageCount += 1
    })
  } catch {
    // ignore — probe is best-effort
  }
}

/** Prefer Zoom’s own rejection text over a generic timeout message. */
function describeSdkError(err) {
  if (!err) return ''
  if (typeof err === 'string') return err.trim()
  const unsupported = Array.isArray(err.unsupportedApis)
    ? `unsupported APIs: ${err.unsupportedApis.join(', ')}`
    : ''
  const parts = [err.message, err.reason, err.errorMessage, err.type, unsupported]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
  // De-dupe identical fragments
  return [...new Set(parts)].join(' — ')
}

async function callZoomConfig(zoomSdk, capabilities) {
  try {
    const pending = zoomSdk.config({
      capabilities,
      // SDK-level timeout (ms) — default 10s; raise so CEF can answer before our outer race.
      timeout: isLikelyZoomClient() ? 15000 : 8000,
    })
    // Native Zoom host sometimes lacks Promise.then — await would resolve as undefined and
    // later API calls throw "must call zoomSdk.config before using other API methods".
    if (pending == null || typeof pending.then !== 'function') {
      throw zoomError(
        'Zoom Apps SDK config() did not return a Promise. Update Zoom Workplace to the latest version, ensure Marketplace domains are Allowed, then remove and re-add the app.',
        'ZOOM_SDK_FAILED',
      )
    }
    const response = await pending
    if (!isConfigResponseUsable(response)) {
      throw zoomError(
        webviewMessageCount === 0
          ? 'Zoom config() returned no payload (webviewMessages=0). Marketplace domains highq… and demoquizapi… must be Allowed; update Zoom Workplace if the console warns about Method then.'
          : 'Zoom config() returned no usable payload. Reopen the app from in-meeting Apps after Marketplace domains are Allowed.',
        'ZOOM_SDK_FAILED',
      )
    }
    sdkConfigCompleted = true
    lastSdkConfigDetail = null
    return response
  } catch (err) {
    if (err?.code === 'ZOOM_OUT_OF_MEETING' || err?.code === 'ZOOM_SDK_TIMEOUT' || err?.code === 'ZOOM_SDK_FAILED') {
      lastSdkConfigDetail = describeSdkError(err) || lastSdkConfigDetail
      throw err
    }
    const detail = describeSdkError(err)
    lastSdkConfigDetail = detail
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[zoom] config() failed', { capabilities, detail, err })
    }
    throw zoomError(
      detail ||
        'Zoom Apps SDK config failed. Confirm Marketplace domain allow-list and Zoom App SDK APIs for this host.',
      'ZOOM_SDK_FAILED',
    )
  }
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
  return withoutFabricatedThenable(unwrapZoomSdkExport(mod))
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
 * Heuristic: are we inside Zoom Workplace / Zoom Apps CEF (not Brave/Chrome)?
 * Used to avoid treating in-meeting SDK timeouts as "browser demo".
 */
export function isLikelyZoomClient() {
  if (typeof navigator === 'undefined') return false
  // Windows Zoom Apps use WebView2 — strongest signal when present.
  if (typeof window !== 'undefined' && window.chrome?.webview) return true
  if (typeof window !== 'undefined' && window.webkit?.messageHandlers?.jsOCHelper) return true
  const ua = String(navigator.userAgent || '')
  if (/ZoomApps|ZoomWebKit|ZoomPresence|\bZoom\b/i.test(ua)) return true
  try {
    // Cross-origin parent is common when embedded in Zoom.
    if (window.self !== window.top) {
      // Still could be other embeds; combine with Zoom-ish UA tokens above when possible.
      if (/AppleWebKit/i.test(ua) && !/Chrome\/\d+/i.test(ua) && !/Edg\/\d+|Firefox\/\d+/i.test(ua)) {
        return true
      }
    }
  } catch {
    // Accessing window.top can throw when cross-origin — typical of Zoom embed.
    return true
  }
  return false
}

/** Zoom Apps SDK is not supported on Linux Zoom Workplace. */
export function isLinuxZoomClient() {
  if (typeof navigator === 'undefined') return false
  const ua = String(navigator.userAgent || '')
  if (!/Linux|X11/i.test(ua)) return false
  return isLikelyZoomClient() || /\bZoom\b/i.test(ua)
}

/** @returns {'windows'|'mac'|'linux'|'other'} */
export function getZoomClientOs() {
  if (typeof navigator === 'undefined') return 'other'
  const ua = String(navigator.userAgent || '')
  if (/Windows/i.test(ua)) return 'windows'
  if (/Mac OS X|Macintosh/i.test(ua)) return 'mac'
  if (/Linux|X11/i.test(ua)) return 'linux'
  return 'other'
}

/** @returns {'webview'|'webkit'|'none'} */
export function getZoomBridgeKind() {
  if (typeof window === 'undefined') return 'none'
  if (window.chrome?.webview) return 'webview'
  if (window.webkit?.messageHandlers?.jsOCHelper) return 'webkit'
  return 'none'
}

/**
 * User-facing copy when SDK boot times out / fails inside Zoom.
 * @param {{ code?: string }|null} [err]
 */
export function messageForSdkBootFailure(err) {
  if (isLinuxZoomClient()) {
    return 'Zoom Apps SDK is not supported on Linux Zoom Workplace. Open this meeting on Windows or macOS to use the Quiz Zoom app.'
  }
  if (getZoomBridgeKind() === 'webview' || getZoomBridgeKind() === 'webkit') {
    return (
      'Zoom native bridge is present but did not answer config(). If webviewMessages=0, Marketplace domains highq… and demoquizapi… must be Allowed (not requires review). Enable webview DevTools, check for 403s, finish Local Test, then remove and re-add the app.'
    )
  }
  if (err?.code === 'ZOOM_SDK_TIMEOUT') {
    return (
      err.message ||
      'Zoom Apps SDK took too long to start. Close and reopen from inside a meeting, or update the Zoom client.'
    )
  }
  return (
    err?.message ||
    'Zoom Apps SDK did not connect. Confirm Marketplace domain allow-list and Zoom App SDK APIs, then Try again.'
  )
}

/** True when config() failed because we are in a normal browser, not Zoom. */
export function isBrowserUnsupportedSdkError(err) {
  const message = String(err?.message || err || '').toLowerCase()
  return (
    message.includes('not supported by this browser') ||
    message.includes('not running inside the zoom') ||
    message.includes('zoom apps sdk is not supported') ||
    message.includes('unsupported environment')
  )
}

function bootTimeoutMsForEnvironment(includeCollaborate) {
  if (includeCollaborate) return Math.max(SDK_TIMEOUT_MS, BOOT_SDK_TIMEOUT_WEBVIEW_MS)
  if (getZoomBridgeKind() === 'webview') return BOOT_SDK_TIMEOUT_WEBVIEW_MS
  return isLikelyZoomClient() ? BOOT_SDK_TIMEOUT_ZOOM_MS : BOOT_SDK_TIMEOUT_BROWSER_MS
}

/**
 * Smallest config() handshake. On WebView2: settle, try once, retry once after delay.
 * @param {object} zoomSdk
 */
async function handshakeZoomConfig(zoomSdk) {
  attachWebviewMessageProbe()
  if (getZoomBridgeKind() === 'webview') {
    await sleep(WEBVIEW_SETTLE_MS)
  }

  const attempt = () =>
    withTimeout(
      callZoomConfig(zoomSdk, [...ZOOM_SDK_HANDSHAKE_CAPABILITIES]),
      HANDSHAKE_CONFIG_TIMEOUT_MS,
      messageForSdkBootFailure({ code: 'ZOOM_SDK_TIMEOUT' }),
      'ZOOM_SDK_TIMEOUT',
    )

  try {
    return await attempt()
  } catch (err) {
    if (err?.code === 'ZOOM_OUT_OF_MEETING') throw err
    if (getZoomBridgeKind() !== 'webview' && !isLikelyZoomClient()) throw err
    await sleep(HANDSHAKE_RETRY_DELAY_MS)
    return attempt()
  }
}

async function applyRunningContextFromConfig(_zoomSdk, configResponse) {
  // Use config() payload only — never call getRunningContext here. Calling other APIs
  // before a successful native config() throws: "must call zoomSdk.config before…".
  lastRunningContext = configResponse?.runningContext || lastRunningContext
  assertInMeetingOrThrow(lastRunningContext)
}

/**
 * After minimal boot, best-effort expand with openUrl / onMyUserContextChange / etc.
 * Never fails the overall boot if Zoom rejects the extra APIs.
 */
async function tryExpandExtendedCore(zoomSdk) {
  if (extendedCoreConfigured || !zoomSdk?.config) return
  try {
    const configResponse = await withTimeout(
      callZoomConfig(zoomSdk, [
        ...ZOOM_SDK_BOOT_CAPABILITIES,
        ...ZOOM_SDK_EXTENDED_CORE_CAPABILITIES,
      ]),
      isLikelyZoomClient() ? 6000 : 2000,
      'Timed out expanding Zoom Apps SDK capabilities.',
      'ZOOM_SDK_TIMEOUT',
    )
    lastRunningContext = configResponse?.runningContext || lastRunningContext
    extendedCoreConfigured = true
  } catch (err) {
    if (err?.code === 'ZOOM_OUT_OF_MEETING') throw err
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[zoom] extended core config skipped', describeSdkError(err) || err)
    }
  }
}

/**
 * Configure Zoom Apps SDK — minimal capabilities first, then optional expand / Collaborate.
 * Entire bootstrap (import + config) is wrapped in a timeout so a hung CEF import cannot block forever.
 * @param {{ includeCollaborate?: boolean }} [options]
 * @returns {Promise<object|null>}
 */
export async function getZoomSdk(options = {}) {
  const includeCollaborate = Boolean(options.includeCollaborate)

  // Only reuse after boot config finished — otherwise parallel callers hit APIs too early
  // (StrictMode / second getZoomSdk) and Zoom throws "must call zoomSdk.config before…".
  // Return via asSafePromise so a cached SDK Proxy is never Promise-adopted as a thenable.
  if (configuredSdk && bootConfigured && (!includeCollaborate || collaborateConfigured)) {
    return asSafePromise(configuredSdk)
  }

  if (configuredSdkPromise && !includeCollaborate) {
    return configuredSdkPromise
  }

  const bootTimeoutMs = bootTimeoutMsForEnvironment(includeCollaborate)

  const timed = withTimeout(
    (async () => {
      const zoomSdk = configuredSdk || (await loadZoomSdkModule())
      if (!zoomSdk?.config) return null

      if (!sdkConfigCompleted) {
        // Smallest handshake first (getRunningContext only), with WebView settle + one retry.
        const handshakeResponse = await handshakeZoomConfig(zoomSdk)
        await applyRunningContextFromConfig(zoomSdk, handshakeResponse)
        configuredSdk = zoomSdk
      }

      if (includeCollaborate && !collaborateConfigured) {
        const configResponse = await callZoomConfig(zoomSdk, [
          ...ZOOM_SDK_BOOT_CAPABILITIES,
          ...ZOOM_SDK_EXTENDED_CORE_CAPABILITIES,
          ...ZOOM_SDK_COLLABORATE_CAPABILITIES,
        ])
        await applyRunningContextFromConfig(zoomSdk, configResponse)
        collaborateConfigured = true
        extendedCoreConfigured = true
        bootConfigured = true
      }

      // Box under a plain object — never fulfill a Promise with the SDK Proxy itself.
      return { zoomSdk }
    })(),
    bootTimeoutMs,
    messageForSdkBootFailure({ code: 'ZOOM_SDK_TIMEOUT' }),
    'ZOOM_SDK_TIMEOUT',
  ).catch((err) => {
    // Prefer a prior config rejection detail over a bare timeout when available.
    const detail = lastSdkConfigDetail
    if (err?.code === 'ZOOM_SDK_TIMEOUT') {
      resetSdkCache()
      const base = messageForSdkBootFailure(err)
      throw zoomError(detail ? `${base} (${detail})` : base, 'ZOOM_SDK_TIMEOUT')
    }
    resetSdkCache()
    throw err
  })

  // Expand boot + optional APIs after handshake — do not spend the handshake budget.
  const run = timed.then(async (boxed) => {
    const zoomSdk = boxed?.zoomSdk ?? boxed
    if (zoomSdk && !collaborateConfigured && !bootConfigured) {
      try {
        const bootResponse = await callZoomConfig(zoomSdk, [...ZOOM_SDK_BOOT_CAPABILITIES])
        await applyRunningContextFromConfig(zoomSdk, bootResponse)
        bootConfigured = true
        configuredSdk = zoomSdk
      } catch (err) {
        if (err?.code === 'ZOOM_OUT_OF_MEETING') throw err
        // Handshake alone is not enough for getMeetingContext / getUserContext.
        resetSdkCache()
        throw err
      }
      await tryExpandExtendedCore(zoomSdk)
    }
    // Keep returning a plain box from Promise chains; unwrap via asSafePromise
    // so the SDK Proxy is never adopted as a thenable.
    return { zoomSdk }
  }).then((boxed) => asSafePromise(boxed?.zoomSdk ?? null))

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

  if (!sdkConfigCompleted || !bootConfigured) {
    throw zoomError(
      messageForSdkBootFailure({ code: 'ZOOM_SDK_FAILED' }),
      'ZOOM_SDK_FAILED',
    )
  }

  assertInMeetingOrThrow(lastRunningContext)

  const [meeting, user] = await Promise.all([
    withTimeout(
      zoomSdk.getMeetingContext().catch((err) => {
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('[zoom] getMeetingContext failed', describeSdkError(err) || err)
        }
        return null
      }),
      SDK_TIMEOUT_MS,
      'Timed out reading Zoom meeting context. Start or join a meeting, then reopen the Quiz app.',
      'ZOOM_SDK_TIMEOUT',
    ),
    withTimeout(
      zoomSdk.getUserContext().catch((err) => {
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('[zoom] getUserContext failed', describeSdkError(err) || err)
        }
        return null
      }),
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

const BROWSER_DEMO_MEETING_KEY = 'zoom-browser-demo-meeting-uuid'

/**
 * Per-browser mock meeting UUID so browser demos do not all collide on
 * `dev-meeting-local` (that shared id caused 403 spam when another user's session was bound).
 */
export function getBrowserDemoMeetingUuid({ rotate = false } = {}) {
  if (typeof sessionStorage === 'undefined') {
    return `dev-meeting-local-${Math.random().toString(36).slice(2, 10)}`
  }
  try {
    if (!rotate) {
      const existing = String(sessionStorage.getItem(BROWSER_DEMO_MEETING_KEY) || '').trim()
      // Migrate off the legacy shared id that every browser demo used.
      if (existing && existing !== 'dev-meeting-local') return existing.slice(0, 128)
    }
    const created = `dev-meeting-local-${Math.random().toString(36).slice(2, 10)}`
    sessionStorage.setItem(BROWSER_DEMO_MEETING_KEY, created)
    return created
  } catch {
    return `dev-meeting-local-${Math.random().toString(36).slice(2, 10)}`
  }
}

/** Start a fresh browser-demo meeting UUID (avoids inherited foreign session bindings). */
export function rotateBrowserDemoMeetingUuid() {
  return getBrowserDemoMeetingUuid({ rotate: true })
}

/**
 * Browser / web-demo host context when Zoom SDK is unavailable.
 * @returns {ZoomMeetingContext}
 */
export function createBrowserDemoContext() {
  return withGuestFields(
    {
      meetingUuid: getBrowserDemoMeetingUuid(),
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
 * Never fall back to browser demo when we appear to be inside the Zoom client —
 * that disables Open for everyone and binds the wrong meeting UUID.
 * @param {URLSearchParams} searchParams
 * @returns {Promise<ZoomMeetingContext|null>}
 */
export async function resolveZoomMeetingContext(searchParams) {
  const fromQuery = contextFromSearchParams(searchParams)
  // Explicit mockMeetingUuid (Share local mock) — never wait on SDK.
  if (fromQuery?.source === 'mock' || (fromQuery && !isZoomMockContextEnabled())) {
    return fromQuery
  }

  // Linux Zoom Workplace can open the panel but never completes Apps SDK — never fake a meeting.
  if (isLinuxZoomClient()) {
    throw zoomError(messageForSdkBootFailure({ code: 'ZOOM_SDK_FAILED' }), 'ZOOM_SDK_FAILED')
  }

  try {
    const fromSdk = await tryLoadZoomSdkContext()
    if (fromSdk) return fromSdk
  } catch (err) {
    // Real Zoom main client with known runningContext — keep the out-of-meeting message.
    if (err?.code === 'ZOOM_OUT_OF_MEETING') {
      throw err
    }

    if (isLinuxZoomClient()) {
      throw zoomError(messageForSdkBootFailure(err), err?.code || 'ZOOM_SDK_FAILED')
    }

    const inZoom = isLikelyZoomClient()
    const browserOnly = isBrowserUnsupportedSdkError(err) || (!inZoom && err?.code === 'ZOOM_SDK_TIMEOUT')

    // Inside Zoom: do NOT pretend we are in browser demo (that disables Open for everyone).
    if (inZoom && !isBrowserUnsupportedSdkError(err)) {
      if (err?.code === 'ZOOM_SDK_TIMEOUT') throw err
      const detail = describeSdkError(err)
      throw zoomError(
        detail ||
          'Zoom Apps SDK failed inside Zoom. Confirm Marketplace domain allow-list includes this host and core Zoom App SDK APIs are enabled, then Try again.',
        err?.code || 'ZOOM_SDK_FAILED',
      )
    }

    // Normal browser / unsupported: web demo.
    if (browserOnly || !inZoom) {
      if (fromQuery) return fromQuery
      return createBrowserDemoContext()
    }

    throw err
  }

  if (fromQuery) return fromQuery

  // SDK returned null without throwing.
  // Inside Zoom that usually means meeting APIs failed — surface retry, do not mock.
  if (isLinuxZoomClient()) {
    throw zoomError(messageForSdkBootFailure({ code: 'ZOOM_SDK_FAILED' }), 'ZOOM_SDK_FAILED')
  }
  if (isLikelyZoomClient()) {
    throw zoomError(
      'Could not read the Zoom meeting context. Close the app and reopen it from the in-meeting Apps panel. Check Marketplace domain allow-list if this keeps happening.',
      'ZOOM_SDK_FAILED',
    )
  }

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

/**
 * Runtime flags for Zoom CEF native bridge — shown when config() times out.
 * Helps distinguish “bridge missing” vs “bridge present but no reply” (allow-list / domain review).
 */
export function getZoomSdkBridgeDiagnostic() {
  let inIframe = false
  try {
    inIframe = typeof window !== 'undefined' && window.self !== window.top
  } catch {
    inIframe = true
  }
  const ua = typeof navigator !== 'undefined' ? String(navigator.userAgent || '') : ''
  const bridge = getZoomBridgeKind()
  return {
    origin: typeof location !== 'undefined' ? String(location.origin || '') : '',
    os: getZoomClientOs(),
    bridge,
    chromeWebview: bridge === 'webview',
    webkitJsOcHelper: bridge === 'webkit',
    webviewMessages: webviewMessageCount,
    inIframe,
    likelyZoom: isLikelyZoomClient(),
    linuxUnsupported: isLinuxZoomClient(),
    uaSnippet: ua.slice(0, 120),
    lastConfigDetail: lastSdkConfigDetail,
  }
}

export function getLastZoomRunningContext() {
  return lastRunningContext
}

/** Absolute UI deadline so Starting… cannot stick even if Zoom CEF ignores promise races. */
/** Must exceed Zoom CEF boot + meeting/user context reads so resolve can finish first. */
export const ZOOM_RESOLVE_WATCHDOG_MS = 28000
