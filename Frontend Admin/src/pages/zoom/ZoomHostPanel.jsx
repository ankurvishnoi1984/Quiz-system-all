import { useCallback, useEffect, useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import {
  bindZoomMeetingSessionApi,
  getZoomMeetingSessionApi,
  unbindZoomMeetingSessionApi,
} from '../../services/zoomApi'
import {
  EmbedControls,
  EmbedShell,
  InFrameSignIn,
  SessionCodePrompt,
} from '../embed/EmbedControlsPage'

function ZoomContextBanner({ context, binding, onUnbind, unbindBusy }) {
  return (
    <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">
      <p className="font-semibold">Zoom meeting linked</p>
      <p className="mt-0.5 break-all text-[11px] text-sky-800/80">
        {context.meetingUuid}
        {context.source === 'mock' ? ' · mock mode' : ''}
      </p>
      {binding?.session ? (
        <p className="mt-1 text-[11px]">
          Session <span className="font-mono font-semibold">{binding.session.session_code}</span>
          {' · '}
          {binding.session.title}
        </p>
      ) : null}
      {onUnbind ? (
        <button
          type="button"
          disabled={unbindBusy}
          onClick={onUnbind}
          className="mt-2 text-[11px] font-semibold text-rose-700 underline disabled:opacity-50"
        >
          {unbindBusy ? 'Unlinking…' : 'Unlink this meeting'}
        </button>
      ) : null}
    </div>
  )
}

export default function ZoomHostPanel({ context }) {
  const user = useAuthStore((state) => state.user)
  const accessToken = useAuthStore((state) => state.accessToken)
  const [binding, setBinding] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [unbindBusy, setUnbindBusy] = useState(false)

  const refreshBinding = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getZoomMeetingSessionApi(context.meetingUuid)
      setBinding(data?.binding || null)
    } catch (err) {
      setError(err?.message || 'Could not load Zoom meeting binding')
      setBinding(null)
    } finally {
      setLoading(false)
    }
  }, [context.meetingUuid])

  useEffect(() => {
    refreshBinding()
  }, [refreshBinding])

  const bindSession = async (sessionId) => {
    setError('')
    try {
      const data = await bindZoomMeetingSessionApi(accessToken, {
        meetingUuid: context.meetingUuid,
        meetingId: context.meetingId,
        sessionId: Number(sessionId),
      })
      setBinding(data?.binding || null)
    } catch (err) {
      setError(err?.message || 'Could not link session to this meeting')
      throw err
    }
  }

  const onSessionResolved = async (sessionId) => {
    await bindSession(sessionId)
  }

  const onCodeResolved = async (sessionId) => {
    await onSessionResolved(sessionId)
  }

  const handleUnbind = async () => {
    setUnbindBusy(true)
    setError('')
    try {
      await unbindZoomMeetingSessionApi(accessToken, context.meetingUuid)
      setBinding(null)
    } catch (err) {
      setError(err?.message || 'Could not unlink meeting')
    } finally {
      setUnbindBusy(false)
    }
  }

  if (!user) {
    return (
      <div className="space-y-3">
        <EmbedShell>
          <div className="rounded-xl border border-blue-200/70 bg-white p-3 text-xs text-slate-600">
            Sign in to control the quiz for this Zoom meeting.
            {context.source === 'mock' ? (
              <span className="mt-1 block text-[11px] text-amber-700">
                Running in mock Zoom context ({context.meetingUuid}).
              </span>
            ) : null}
          </div>
        </EmbedShell>
        <InFrameSignIn />
      </div>
    )
  }

  if (loading) {
    return (
      <EmbedShell>
        <p className="rounded-xl border border-blue-200/70 bg-white p-4 text-sm text-slate-600">
          Checking Zoom meeting…
        </p>
      </EmbedShell>
    )
  }

  const sessionId = binding?.session_id || binding?.session?.session_id

  if (!sessionId) {
    return (
      <div className="space-y-3">
        <EmbedShell>
          <ZoomContextBanner context={context} binding={null} />
          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              {error}
            </p>
          ) : null}
          <p className="rounded-xl border border-blue-200/70 bg-white p-3 text-xs text-slate-600">
            Pick a quiz session to run in this meeting. Participants who open the Quiz app will join
            it automatically.
          </p>
        </EmbedShell>
        <SessionCodePrompt
          onResolved={async (resolvedId) => {
            try {
              await onCodeResolved(resolvedId)
            } catch {
              // error already set
            }
          }}
        />
        <EmbedShell>
          <button
            type="button"
            className="text-xs font-semibold text-slate-500 underline"
            onClick={refreshBinding}
          >
            Check again
          </button>
        </EmbedShell>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <EmbedShell>
        <ZoomContextBanner
          context={context}
          binding={binding}
          onUnbind={handleUnbind}
          unbindBusy={unbindBusy}
        />
        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
            {error}
          </p>
        ) : null}
      </EmbedShell>
      <EmbedControls sessionId={String(sessionId)} />
    </div>
  )
}
