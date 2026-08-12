import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getPresentViewSessionApi } from '../../services/presentViewApi'
import { formatScheduledSessionForDisplay } from '../../utils/sessionSchedule'
import PresentModePage from '../present-mode/PresentModePage'
import { PresentShell, PresentSlideHeader } from '../present-mode/PresentShell'

/**
 * Read-only display sized for an iframe inside PowerPoint, Teams, Zoom, or Google Slides.
 * Same slides as Present mode, minus the footer, join bar, and fullscreen chrome —
 * the host app already owns that surrounding UI.
 */
function EmbedMessage({ title, body, tone = 'muted' }) {
  return (
    <div className="grid h-dvh place-items-center bg-linear-to-br from-slate-50 via-blue-50 to-indigo-100/70 p-4 text-center">
      <div>
        <p
          className={`text-base font-semibold ${
            tone === 'error' ? 'text-red-700' : 'text-navy-900'
          }`}
        >
          {title}
        </p>
        {body ? <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p> : null}
      </div>
    </div>
  )
}

function EmbedWaitingScreen({ session }) {
  const scheduledLabel = formatScheduledSessionForDisplay(
    session?.scheduled_date,
    session?.scheduled_time,
  )

  return (
    <PresentShell embed>
      <div className="flex min-h-0 flex-1 flex-col">
        <PresentSlideHeader
          sessionTitle={session?.title || 'Live session'}
          participantCount={0}
          isSessionLive={false}
          readOnly
        />
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
            Waiting for host
          </p>
          <h2 className="mt-3 text-[clamp(1.25rem,4vw,2rem)] font-bold leading-tight text-navy-900">
            Session not started yet
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-600">
            This panel updates automatically the moment the host goes live.
          </p>
          {scheduledLabel ? (
            <p className="mt-4 text-sm font-semibold text-navy-700">Scheduled for {scheduledLabel}</p>
          ) : null}
        </div>
      </div>
    </PresentShell>
  )
}

export default function EmbedDisplayPage() {
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session') || ''
  const embedToken = searchParams.get('token') || ''

  const sessionQuery = useQuery({
    queryKey: ['embed-display-session', sessionId, embedToken],
    queryFn: () => getPresentViewSessionApi(embedToken, sessionId),
    enabled: Boolean(embedToken && sessionId),
    retry: 1,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return !status || status === 'draft' ? 2000 : false
    },
  })

  if (!sessionId || !embedToken) {
    return (
      <EmbedMessage
        title="Embed not configured"
        body="Open the session share panel, copy the embed link, and paste it back into this add-in."
      />
    )
  }

  if (sessionQuery.isLoading) {
    return <EmbedMessage title="Loading live results…" />
  }

  if (sessionQuery.isError || !sessionQuery.data) {
    return (
      <EmbedMessage
        tone="error"
        title="This embed link is no longer valid"
        body="The link may have been revoked. Generate a new embed link from the session share panel."
      />
    )
  }

  if (sessionQuery.data.status === 'draft') {
    return <EmbedWaitingScreen session={sessionQuery.data} />
  }

  return (
    <PresentModePage readOnly embed viewerToken={embedToken} sessionIdOverride={sessionId} />
  )
}
