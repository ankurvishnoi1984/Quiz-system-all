import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { lookupSessionByCodeApi } from '../../services/embedApi'
import {
  bindZoomMeetingSessionApi,
  getZoomMeetingSessionApi,
  unbindZoomMeetingSessionApi,
} from '../../services/zoomApi'
import {
  isCollaborateActiveFromEvent,
  openQuizForEveryone,
  subscribeCollaborateChange,
} from '../../utils/zoomContext'
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

function OpenForEveryoneCard({
  enabled,
  busy,
  collaborateActive,
  lastResult,
  onOpen,
  mockMode,
}) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-3 text-xs text-emerald-950">
      <p className="font-semibold text-sm text-navy-900">Open for everyone</p>
      <p className="mt-1 leading-relaxed text-emerald-900/80">
        Participants will not see the quiz until you tap this (like Slido). It starts Collaborate
        mode and invites everyone in the meeting to open the Quiz app.
      </p>
      {mockMode ? (
        <p className="mt-2 text-[11px] text-amber-800">
          Browser mock cannot invite Zoom participants. Open this app from a real Zoom meeting to
          use Open for everyone.
        </p>
      ) : null}
      {collaborateActive ? (
        <p className="mt-2 text-[11px] font-semibold text-emerald-800">
          Collaborate is active — participants can join the Quiz app.
        </p>
      ) : null}
      {lastResult?.collaborate || lastResult?.invite ? (
        <p className="mt-2 text-[11px] text-emerald-800">
          {lastResult.collaborate ? 'Collaborate started. ' : ''}
          {lastResult.invite ? 'Invitations sent.' : ''}
        </p>
      ) : null}
      <button
        type="button"
        disabled={!enabled || busy || mockMode}
        onClick={onOpen}
        className="mt-3 h-10 w-full rounded-lg bg-emerald-700 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
      >
        {busy ? 'Opening…' : collaborateActive ? 'Invite again' : 'Open for everyone'}
      </button>
    </div>
  )
}

function SuggestedSessionCard({ sessionCode, busy, onLink }) {
  if (!sessionCode) return null
  return (
    <div className="rounded-xl border border-sky-200 bg-white px-3 py-3 text-xs text-slate-700 shadow-sm">
      <p className="font-semibold text-sm text-navy-900">Suggested from Share</p>
      <p className="mt-1 leading-relaxed text-slate-600">
        Link session{' '}
        <span className="font-mono font-semibold tracking-widest">{sessionCode}</span> to this
        meeting in one tap.
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={onLink}
        className="mt-3 h-10 w-full rounded-lg bg-navy-800 text-sm font-semibold text-white transition hover:bg-navy-900 disabled:opacity-60"
      >
        {busy ? 'Linking…' : `Link ${sessionCode}`}
      </button>
    </div>
  )
}

export default function ZoomHostPanel({ context }) {
  const [searchParams] = useSearchParams()
  const user = useAuthStore((state) => state.user)
  const accessToken = useAuthStore((state) => state.accessToken)
  const [binding, setBinding] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [unbindBusy, setUnbindBusy] = useState(false)
  const [openBusy, setOpenBusy] = useState(false)
  const [suggestBusy, setSuggestBusy] = useState(false)
  const [collaborateActive, setCollaborateActive] = useState(false)
  const [openResult, setOpenResult] = useState(null)

  const suggestedCode = useMemo(() => {
    const raw =
      searchParams.get('sessionCode') ||
      searchParams.get('suggestSession') ||
      searchParams.get('code') ||
      ''
    return String(raw).trim().toUpperCase()
  }, [searchParams])

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

  useEffect(() => {
    if (context.source !== 'sdk') return undefined
    return subscribeCollaborateChange((event) => {
      setCollaborateActive(isCollaborateActiveFromEvent(event))
    })
  }, [context.source])

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

  const onCodeResolved = async (sessionId) => {
    await bindSession(sessionId)
  }

  const handleLinkSuggested = async () => {
    if (!suggestedCode || suggestBusy) return
    setSuggestBusy(true)
    setError('')
    try {
      const session = await lookupSessionByCodeApi(suggestedCode)
      if (!session?.session_id) throw new Error('Session code not found')
      await onCodeResolved(String(session.session_id))
    } catch (err) {
      setError(err?.message || 'Could not link suggested session')
    } finally {
      setSuggestBusy(false)
    }
  }

  const handleUnbind = async () => {
    setUnbindBusy(true)
    setError('')
    try {
      await unbindZoomMeetingSessionApi(accessToken, context.meetingUuid)
      setBinding(null)
      setOpenResult(null)
    } catch (err) {
      setError(err?.message || 'Could not unlink meeting')
    } finally {
      setUnbindBusy(false)
    }
  }

  const handleOpenForEveryone = async () => {
    setOpenBusy(true)
    setError('')
    setOpenResult(null)
    try {
      const result = await openQuizForEveryone()
      setOpenResult(result)
      if (result.collaborate) setCollaborateActive(true)
    } catch (err) {
      setError(err?.message || 'Could not open the quiz for participants')
    } finally {
      setOpenBusy(false)
    }
  }

  if (!user) {
    return (
      <EmbedShell>
        <div className="rounded-xl border border-blue-200/70 bg-white p-3 text-xs text-slate-600">
          Sign in to control the quiz for this Zoom meeting.
          {suggestedCode ? (
            <span className="mt-1 block text-[11px] text-slate-500">
              After sign-in you can link session{' '}
              <span className="font-mono font-semibold">{suggestedCode}</span>.
            </span>
          ) : null}
          {context.source === 'mock' ? (
            <span className="mt-1 block text-[11px] text-amber-700">
              Running in mock Zoom context ({context.meetingUuid}).
            </span>
          ) : null}
        </div>
        <InFrameSignIn bare />
      </EmbedShell>
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
  const mockMode = context.source === 'mock' || context.source === 'query'

  if (!sessionId) {
    return (
      <EmbedShell>
        <ZoomContextBanner context={context} binding={null} />
        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
            {error}
          </p>
        ) : null}
        <p className="rounded-xl border border-blue-200/70 bg-white p-3 text-xs text-slate-600">
          Link a quiz session to this meeting. Participants will not see the quiz until you tap{' '}
          <span className="font-semibold">Open for everyone</span> afterward.
        </p>
        <SuggestedSessionCard
          sessionCode={suggestedCode}
          busy={suggestBusy}
          onLink={handleLinkSuggested}
        />
        <SessionCodePrompt
          bare
          initialCode={suggestedCode}
          onResolved={async (resolvedId) => {
            try {
              await onCodeResolved(resolvedId)
            } catch {
              // error already set
            }
          }}
        />
        <button
          type="button"
          className="text-xs font-semibold text-slate-500 underline"
          onClick={refreshBinding}
        >
          Check again
        </button>
      </EmbedShell>
    )
  }

  return (
    <EmbedShell>
      <ZoomContextBanner
        context={context}
        binding={binding}
        onUnbind={handleUnbind}
        unbindBusy={unbindBusy}
      />
      {!collaborateActive && !openResult ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          Participants will not see the quiz until you tap{' '}
          <span className="font-semibold">Open for everyone</span>.
        </p>
      ) : null}
      <OpenForEveryoneCard
        enabled={Boolean(sessionId)}
        busy={openBusy}
        collaborateActive={collaborateActive}
        lastResult={openResult}
        onOpen={handleOpenForEveryone}
        mockMode={mockMode}
      />
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
          {error}
        </p>
      ) : null}
      <EmbedControls bare sessionId={String(sessionId)} />
    </EmbedShell>
  )
}
