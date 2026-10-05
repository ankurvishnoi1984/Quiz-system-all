import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { joinZoomMeetingSessionApi, getZoomMeetingSessionApi } from '../../services/zoomApi'
import { useParticipantStore } from '../../store/participantStore'
import { EmbedShell } from '../embed/EmbedControlsPage'

/**
 * Resolves the quiz session bound to this Zoom meeting, joins when possible,
 * then hands off to the existing /join/:code participant experience.
 */
export default function ZoomParticipantPanel({ context }) {
  const setParticipant = useParticipantStore((state) => state.setParticipant)
  const [phase, setPhase] = useState('loading') // loading | need_name | need_fields | ready | error | unbound
  const [error, setError] = useState('')
  const [binding, setBinding] = useState(null)
  const [nickname, setNickname] = useState(context.displayName || '')
  const [email, setEmail] = useState('')
  const [mobile, setMobile] = useState('')
  const [joinResult, setJoinResult] = useState(null)

  const joinType = binding?.session?.join_type || 'anonymous'

  const needsContactFields = useMemo(
    () =>
      ['name_email', 'name_mobile', 'name_email_mobile'].includes(joinType),
    [joinType],
  )

  const needsName = joinType === 'name' || needsContactFields

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setPhase('loading')
      setError('')
      try {
        const data = await getZoomMeetingSessionApi(context.meetingUuid)
        if (cancelled) return
        if (!data?.binding?.session) {
          setBinding(null)
          setPhase('unbound')
          return
        }
        setBinding(data.binding)

        const sessionJoinType = data.binding.session.join_type
        if (sessionJoinType === 'anonymous') {
          await doJoin(data.binding, { nickname: context.displayName || undefined })
          return
        }
        if (sessionJoinType === 'name' && context.displayName) {
          await doJoin(data.binding, { nickname: context.displayName })
          return
        }
        if (sessionJoinType === 'name') {
          setPhase('need_name')
          return
        }
        setPhase('need_fields')
      } catch (err) {
        if (cancelled) return
        setError(err?.message || 'Could not load meeting quiz')
        setPhase('error')
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- join once per meeting
  }, [context.meetingUuid])

  async function doJoin(activeBinding, fields = {}) {
    setPhase('loading')
    setError('')
    try {
      const data = await joinZoomMeetingSessionApi({
        meeting_uuid: context.meetingUuid,
        zoom_user_id: context.zoomUserId,
        display_name: context.displayName,
        nickname: fields.nickname || nickname || context.displayName,
        email: fields.email || email || undefined,
        mobile: fields.mobile || mobile || undefined,
        device_fingerprint: context.zoomUserId ? `zoom:${context.zoomUserId}` : undefined,
      })

      const participant = data?.participant
      const token = data?.token
      const sessionCode = data?.zoom_binding?.session?.session_code || activeBinding?.session?.session_code

      if (token && participant && sessionCode) {
        setParticipant({
          token,
          refreshToken: data?.refresh_token || null,
          participant: {
            name: participant.nickname || context.displayName || 'Guest',
            email: participant.email,
            mobile: participant.mobile,
            anonymous: participant.is_anonymous,
            participant_id: participant.participant_id,
          },
          sessionCode,
        })
      }

      setJoinResult({ sessionCode, data })
      setPhase('ready')
    } catch (err) {
      setError(err?.message || 'Could not join the session')
      if (err?.code === 'ZOOM_MEETING_UNBOUND') {
        setPhase('unbound')
      } else {
        setPhase(needsContactFields || needsName ? 'need_fields' : 'error')
      }
    }
  }

  if (phase === 'ready' && joinResult?.sessionCode) {
    return <Navigate to={`/join/${joinResult.sessionCode}`} replace />
  }

  if (phase === 'loading') {
    return (
      <EmbedShell>
        <p className="rounded-xl border border-blue-200/70 bg-white p-4 text-sm text-slate-600">
          Joining the quiz for this Zoom meeting…
        </p>
      </EmbedShell>
    )
  }

  if (phase === 'unbound') {
    return (
      <EmbedShell>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-semibold">Waiting for the host</p>
          <p className="mt-1 text-xs leading-relaxed text-amber-900/80">
            The host has not linked a quiz session to this meeting yet. Ask them to open the Quiz
            app and pick a session.
          </p>
          {context.source === 'mock' ? (
            <p className="mt-2 text-[11px] text-amber-800">Mock meeting: {context.meetingUuid}</p>
          ) : null}
        </div>
      </EmbedShell>
    )
  }

  if (phase === 'error') {
    return (
      <EmbedShell>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-semibold">Could not join</p>
          <p className="mt-1 text-xs">{error}</p>
        </div>
      </EmbedShell>
    )
  }

  return (
    <EmbedShell>
      <form
        className="space-y-3 rounded-xl border border-blue-200/70 bg-white p-4 shadow-sm"
        onSubmit={(event) => {
          event.preventDefault()
          doJoin(binding, { nickname, email, mobile })
        }}
      >
        <div>
          <h1 className="text-base font-bold text-navy-900">Join quiz</h1>
          <p className="mt-1 text-xs text-slate-600">
            {binding?.session?.title || 'Live session'} · code{' '}
            <span className="font-mono font-semibold">{binding?.session?.session_code}</span>
          </p>
        </div>

        {needsName || joinType === 'name' ? (
          <input
            required
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            placeholder="Your name"
            className="h-10 w-full rounded-lg border border-blue-200 px-3 text-sm outline-none focus:border-sky-400"
          />
        ) : null}

        {joinType === 'name_email' || joinType === 'name_email_mobile' ? (
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            className="h-10 w-full rounded-lg border border-blue-200 px-3 text-sm outline-none focus:border-sky-400"
          />
        ) : null}

        {joinType === 'name_mobile' || joinType === 'name_email_mobile' ? (
          <input
            required
            value={mobile}
            onChange={(event) => setMobile(event.target.value)}
            placeholder="Mobile"
            className="h-10 w-full rounded-lg border border-blue-200 px-3 text-sm outline-none focus:border-sky-400"
          />
        ) : null}

        {error ? <p className="text-xs font-semibold text-red-700">{error}</p> : null}

        <button
          type="submit"
          className="h-10 w-full rounded-lg bg-navy-800 text-sm font-semibold text-white transition hover:bg-navy-900"
        >
          Join session
        </button>
      </form>
    </EmbedShell>
  )
}
