import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  applyUserContextChange,
  isHostLikeRole,
  resolveZoomMeetingContext,
  subscribeMyUserContextChange,
} from '../../utils/zoomContext'
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
            'Open this app from a Zoom meeting. For browser-only testing, use a Share → Zoom local mock link (?mockMeetingUuid=…).',
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

  const isSdkContext = context?.source === 'sdk'

  // Guest ↔ authenticated ↔ authorized can change while the app stays open.
  useEffect(() => {
    if (!isSdkContext) return undefined
    return subscribeMyUserContextChange((event) => {
      setContext((prev) => {
        if (!prev) return prev
        const next = applyUserContextChange(prev, event)
        if (forceRole === 'host' || forceRole === 'participant') {
          return { ...next, role: forceRole === 'host' ? 'host' : 'participant' }
        }
        // Unsigned Zoom guests stay on the participant path.
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
            Local mock example:{' '}
            <code className="rounded bg-white/70 px-1">
              /zoom/app?mockMeetingUuid=dev-1&amp;mockRole=host&amp;sessionCode=ABC123
            </code>
          </p>
        </div>
      </EmbedShell>
    )
  }

  // Meeting hosts/co-hosts who are signed into Zoom use the host console.
  // Unsigned Zoom guests always use the participant join path (no quiz host login).
  if (isHostLikeRole(context.role) && context.status !== 'unauthenticated') {
    return <ZoomHostPanel context={context} />
  }

  return <ZoomParticipantPanel context={context} />
}
