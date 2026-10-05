import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { isHostLikeRole, resolveZoomMeetingContext } from '../../utils/zoomContext'
import { EmbedShell } from '../embed/EmbedControlsPage'
import ZoomHostPanel from './ZoomHostPanel'
import ZoomParticipantPanel from './ZoomParticipantPanel'

/**
 * Zoom App home URL entry. Resolves meeting context (SDK or mock) and routes
 * host vs participant experiences.
 */
export default function ZoomAppPage() {
  const [searchParams] = useSearchParams()
  const [context, setContext] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const forceRole = searchParams.get('forceRole')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const resolved = await resolveZoomMeetingContext(searchParams)
        if (cancelled) return
        if (!resolved) {
          setError(
            'Open this app from a Zoom meeting, or use mockMeetingUuid / mockRole query params for local testing.',
          )
          setContext(null)
        } else {
          const role =
            forceRole === 'host' || forceRole === 'participant'
              ? forceRole === 'host'
                ? 'host'
                : 'participant'
              : resolved.role
          setContext({ ...resolved, role })
        }
      } catch (err) {
        if (cancelled) return
        setError(err?.message || 'Failed to load Zoom context')
        setContext(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [searchParams, forceRole])

  if (loading) {
    return (
      <EmbedShell>
        <p className="rounded-xl border border-blue-200/70 bg-white p-4 text-sm text-slate-600">
          Starting Zoom Quiz app…
        </p>
      </EmbedShell>
    )
  }

  if (error || !context) {
    return (
      <EmbedShell>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-semibold">Zoom context unavailable</p>
          <p className="mt-1 text-xs leading-relaxed">{error}</p>
          <p className="mt-3 text-[11px] text-amber-800">
            Dev example:{' '}
            <code className="rounded bg-white/70 px-1">
              /zoom/app?mockMeetingUuid=dev-1&amp;mockRole=host
            </code>
          </p>
        </div>
      </EmbedShell>
    )
  }

  if (isHostLikeRole(context.role)) {
    return <ZoomHostPanel context={context} />
  }

  return <ZoomParticipantPanel context={context} />
}
