import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  applyUserContextChange,
  isBrowserDemoContext,
  isHostLikeRole,
  resetZoomSdkForRetry,
  resolveZoomMeetingContext,
  subscribeMyUserContextChange,
  ZOOM_RESOLVE_WATCHDOG_MS,
} from '../../utils/zoomContext'
import { EmbedShell } from '../embed/EmbedControlsPage'
import ZoomHostPanel from './ZoomHostPanel'
import ZoomParticipantPanel from './ZoomParticipantPanel'

function messageForResolveError(err) {
  if (err?.code === 'ZOOM_OUT_OF_MEETING') {
    return (
      err.message ||
      'Open the Quiz app from inside a Zoom meeting (Apps during the call), not only from the main Apps tab.'
    )
  }
  if (err?.code === 'ZOOM_SDK_TIMEOUT') {
    return (
      err.message ||
      'Zoom took too long to start the app. Close it and reopen from inside a meeting, or update the Zoom client.'
    )
  }
  return err?.message || 'Failed to load Zoom context'
}

function BrowserDemoBanner() {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
      <p className="font-semibold">Browser demo</p>
      <p className="mt-0.5 leading-relaxed text-amber-900/80">
        Not inside Zoom. You can sign in and link a session here for local testing. For the real
        Slido-like flow, start a meeting → bottom toolbar <span className="font-semibold">Apps</span>{' '}
        (or More → Apps) → open this app.
      </p>
    </div>
  )
}

/**
 * Zoom App home URL entry. Resolves meeting context (SDK or mock) and routes
 * host vs participant experiences.
 */
export default function ZoomAppPage() {
  const [searchParams] = useSearchParams()
  const [context, setContext] = useState(null)
  const [error, setError] = useState('')
  const [errorCode, setErrorCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [retryToken, setRetryToken] = useState(0)
  const [elapsedSec, setElapsedSec] = useState(0)
  const forceRole = searchParams.get('forceRole')

  useEffect(() => {
    let cancelled = false
    let settled = false

    const finishError = (code, message) => {
      if (cancelled || settled) return
      settled = true
      setErrorCode(code)
      setError(message)
      setContext(null)
      setLoading(false)
    }

    const finishOk = (nextContext) => {
      if (cancelled || settled) return
      settled = true
      setContext(nextContext)
      setError('')
      setErrorCode('')
      setLoading(false)
    }

    setLoading(true)
    setError('')
    setErrorCode('')
    setContext(null)
    setElapsedSec(0)

    // Only fires if resolve never settles (should be rare now — browser demo returns fast).
    const watchdog = setTimeout(() => {
      if (cancelled || settled) return
      finishError(
        'ZOOM_SDK_TIMEOUT',
        'Zoom took too long to start the app. Start a meeting, then open this app from the in-meeting Apps button (or More → Apps). Or use a Share → Zoom local mock link in the browser.',
      )
      resetZoomSdkForRetry()
    }, ZOOM_RESOLVE_WATCHDOG_MS)

    const tick = setInterval(() => {
      if (!cancelled && !settled) setElapsedSec((value) => value + 1)
    }, 1000)

    ;(async () => {
      try {
        const resolved = await resolveZoomMeetingContext(searchParams)
        if (cancelled || settled) return
        if (!resolved) {
          finishError(
            'ZOOM_NO_CONTEXT',
            'Open the Quiz app from inside a Zoom meeting (Apps during the call), not only from the main Apps tab. For browser-only testing, use a Share → Zoom local mock link.',
          )
          return
        }
        const role =
          forceRole === 'host' || forceRole === 'participant'
            ? forceRole === 'host'
              ? 'host'
              : 'participant'
            : resolved.role
        finishOk({ ...resolved, role })
      } catch (err) {
        if (cancelled || settled) return
        finishError(err?.code || 'ZOOM_RESOLVE_FAILED', messageForResolveError(err))
      } finally {
        clearTimeout(watchdog)
        clearInterval(tick)
      }
    })()

    return () => {
      cancelled = true
      clearTimeout(watchdog)
      clearInterval(tick)
    }
  }, [searchParams, forceRole, retryToken])

  const handleRetry = () => {
    resetZoomSdkForRetry()
    setRetryToken((value) => value + 1)
  }

  const isSdkContext = context?.source === 'sdk'
  const showBrowserDemoBanner = isBrowserDemoContext(context)

  useEffect(() => {
    if (!isSdkContext) return undefined
    return subscribeMyUserContextChange((event) => {
      setContext((prev) => {
        if (!prev) return prev
        const next = applyUserContextChange(prev, event)
        if (forceRole === 'host' || forceRole === 'participant') {
          return { ...next, role: forceRole === 'host' ? 'host' : 'participant' }
        }
        if (next.status === 'unauthenticated') {
          return { ...next, role: 'participant' }
        }
        return next
      })
    })
  }, [isSdkContext, forceRole])

  if (loading) {
    return (
      <EmbedShell>
        <p className="rounded-xl border border-blue-200/70 bg-white p-4 text-sm text-slate-600">
          Starting Zoom Quiz app…
        </p>
        <p className="text-[11px] text-slate-500">
          Waiting {elapsedSec}s — browser demo starts automatically if Zoom SDK is unavailable.
        </p>
      </EmbedShell>
    )
  }

  if (error || !context) {
    const outOfMeeting =
      errorCode === 'ZOOM_OUT_OF_MEETING' || errorCode === 'ZOOM_NO_CONTEXT'
    return (
      <EmbedShell>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-semibold">
            {outOfMeeting ? 'Open from a Zoom meeting' : 'Zoom context unavailable'}
          </p>
          <p className="mt-1 text-xs leading-relaxed">{error}</p>
          <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs leading-relaxed text-amber-900/80">
            <li>Click New Meeting (or join a meeting you host).</li>
            <li>
              On the <span className="font-semibold">bottom meeting toolbar</span>, click{' '}
              <span className="font-semibold">Apps</span>. If missing, click{' '}
              <span className="font-semibold">More (…)</span> → Apps.
            </li>
            <li>
              Open <span className="font-semibold">General app 379</span> / Quiz from My Apps.
            </li>
          </ol>
          <button
            type="button"
            onClick={handleRetry}
            className="mt-3 h-10 w-full rounded-lg bg-navy-800 text-sm font-semibold text-white transition hover:bg-navy-900"
          >
            Try again
          </button>
          <p className="mt-3 text-[11px] text-amber-800">
            Or open in the browser:{' '}
            <code className="rounded bg-white/70 px-1">
              /zoom/app?mockMeetingUuid=dev-1&amp;mockRole=host&amp;sessionCode=ABC123
            </code>
          </p>
        </div>
      </EmbedShell>
    )
  }

  const panel = isHostLikeRole(context.role) && context.status !== 'unauthenticated' ? (
    <ZoomHostPanel context={context} />
  ) : (
    <ZoomParticipantPanel context={context} />
  )

  if (!showBrowserDemoBanner) return panel

  // Banner only — do not wrap another min-h-dvh EmbedShell above the host/participant panel.
  return (
    <div className="bg-slate-50">
      <div className="mx-auto max-w-md space-y-3 px-3 pt-3">
        <BrowserDemoBanner />
      </div>
      {panel}
    </div>
  )
}
