import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { joinZoomMeetingSessionApi, getZoomMeetingSessionApi } from '../../services/zoomApi'
import { useParticipantStore } from '../../store/participantStore'
import { buildZoomDeviceFingerprint } from '../../utils/zoomContext'
import { EmbedShell } from '../embed/EmbedControlsPage'
import ParticipantSessionPage from '../participant-session/ParticipantSessionPage'

const UNBOUND_POLL_MS = 4000
const LAUNCH_RETRY_MS = 3000

function GuestModeBanner({ context }) {
  if (!context?.isGuest) return null
  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-950">
      <p className="font-semibold">You’re in as Guest</p>
      <p className="mt-0.5 leading-relaxed text-violet-900/80">
        You can take the quiz without signing in to Zoom. Ask the host to link a session and tap{' '}
        <span className="font-semibold">Open for everyone</span> if this screen stays on waiting.
      </p>
    </div>
  )
}

function isWaitingForHostLaunchError(err) {
  const message = String(err?.message || '').toLowerCase()
  return (
    message.includes('not accepting participants') ||
    message.includes('not started') ||
    message.includes('session is not live') ||
    message.includes('not available for rejoin')
  )
}

/**
 * Resolves the quiz session bound to this Zoom meeting, joins when possible,
 * then keeps the participant quiz inside /zoom/app (no navigate to /join).
 * That preserves Zoom Apps URL + live WebSocket updates when the host launches.
 */
export default function ZoomParticipantPanel({ context }) {
  const setParticipant = useParticipantStore((state) => state.setParticipant)
  const participantToken = useParticipantStore((state) => state.participantToken)
  const joinedSessionCode = useParticipantStore((state) => state.joinedSessionCode)
  const [phase, setPhase] = useState('loading') // loading | need_name | need_fields | ready | error | unbound | waiting_launch
  const [error, setError] = useState('')
  const [binding, setBinding] = useState(null)
  const [nickname, setNickname] = useState(context.displayName || '')
  const [email, setEmail] = useState('')
  const [mobile, setMobile] = useState('')
  const [joinResult, setJoinResult] = useState(null)
  const joiningRef = useRef(false)

  useEffect(() => {
    if (context.displayName && !nickname) {
      setNickname(context.displayName)
    }
  }, [context.displayName, nickname])

  const joinType = binding?.session?.join_type || 'anonymous'

  const needsContactFields = useMemo(
    () =>
      ['name_email', 'name_mobile', 'name_email_mobile'].includes(joinType),
    [joinType],
  )

  const needsName = joinType === 'name' || needsContactFields

  const doJoin = useCallback(
    async (activeBinding, fields = {}) => {
      if (joiningRef.current) return
      joiningRef.current = true
      setPhase('loading')
      setError('')
      try {
        const data = await joinZoomMeetingSessionApi({
          meeting_uuid: context.meetingUuid,
          zoom_user_id: context.zoomUserId || undefined,
          display_name: context.displayName || undefined,
          nickname: fields.nickname || nickname || context.displayName || undefined,
          email: fields.email || email || undefined,
          mobile: fields.mobile || mobile || undefined,
          device_fingerprint: buildZoomDeviceFingerprint(context),
        })

        const participant = data?.participant
        const token = data?.token
        const sessionCode =
          data?.zoom_binding?.session?.session_code || activeBinding?.session?.session_code

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
        } else if (isWaitingForHostLaunchError(err)) {
          // Host linked the meeting but has not Launch'd yet — keep retrying.
          setPhase('waiting_launch')
        } else {
          setPhase(needsContactFields || needsName ? 'need_fields' : 'error')
        }
      } finally {
        joiningRef.current = false
      }
    },
    [
      context,
      email,
      mobile,
      needsContactFields,
      needsName,
      nickname,
      setParticipant,
    ],
  )

  const tryResolveBinding = useCallback(
    async ({ quiet = false } = {}) => {
      if (joiningRef.current) return
      if (!quiet) {
        setPhase('loading')
        setError('')
      }
      try {
        const data = await getZoomMeetingSessionApi(context.meetingUuid)
        const nextBinding = data?.binding || null
        setBinding(nextBinding)
        if (!nextBinding?.session?.session_code) {
          setPhase('unbound')
          return
        }

        const boundCode = String(nextBinding.session.session_code || '').trim().toUpperCase()
        // Already joined this meeting's session — stay in Zoom shell with live quiz UI.
        if (
          participantToken &&
          joinedSessionCode &&
          String(joinedSessionCode).trim().toUpperCase() === boundCode
        ) {
          setJoinResult({ sessionCode: boundCode })
          setPhase('ready')
          return
        }

        if (needsContactFields || needsName) {
          // Anonymous can auto-join; named/contact joins need the form unless display name is enough.
          if (joinType === 'name' && (nickname || context.displayName)) {
            await doJoin(nextBinding, { nickname: nickname || context.displayName })
            return
          }
          if (joinType === 'anonymous') {
            await doJoin(nextBinding)
            return
          }
          setPhase('need_fields')
          return
        }

        await doJoin(nextBinding)
      } catch (err) {
        if (err?.code === 'ZOOM_MEETING_UNBOUND') {
          setPhase('unbound')
          return
        }
        if (!quiet) {
          setError(err?.message || 'Could not load this Zoom meeting')
          setPhase('error')
        }
      }
    },
    [
      context.displayName,
      context.meetingUuid,
      doJoin,
      joinType,
      joinedSessionCode,
      needsContactFields,
      needsName,
      nickname,
      participantToken,
    ],
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (cancelled) return
      await tryResolveBinding({ quiet: false })
    })()
    return () => {
      cancelled = true
    }
  }, [tryResolveBinding])

  // Late joiners: poll while waiting for the host to link + invite.
  useEffect(() => {
    if (phase !== 'unbound') return undefined
    const timer = setInterval(() => {
      void tryResolveBinding({ quiet: true })
    }, UNBOUND_POLL_MS)
    return () => clearInterval(timer)
  }, [phase, tryResolveBinding])

  // Host linked but has not Launch'd yet — retry join until the session is live.
  useEffect(() => {
    if (phase !== 'waiting_launch' || !binding) return undefined
    const timer = setInterval(() => {
      void doJoin(binding, { nickname, email, mobile })
    }, LAUNCH_RETRY_MS)
    return () => clearInterval(timer)
  }, [phase, binding, doJoin, nickname, email, mobile])

  if (phase === 'ready' && joinResult?.sessionCode) {
    return (
      <div className="min-h-dvh bg-slate-50">
        <div className="mx-auto max-w-md space-y-2 px-3 pt-3">
          <GuestModeBanner context={context} />
        </div>
        <ParticipantSessionPage embed sessionCode={joinResult.sessionCode} />
      </div>
    )
  }

  if (phase === 'loading') {
    return (
      <EmbedShell>
        <GuestModeBanner context={context} />
        <p className="rounded-xl border border-blue-200/70 bg-white p-4 text-sm text-slate-600">
          Joining the quiz for this Zoom meeting…
        </p>
      </EmbedShell>
    )
  }

  if (phase === 'waiting_launch') {
    return (
      <EmbedShell>
        <GuestModeBanner context={context} />
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-semibold">Waiting for the host to launch</p>
          <p className="mt-1 text-xs leading-relaxed text-amber-900/80">
            The quiz is linked to this meeting. When the host taps <span className="font-semibold">Launch</span>,
            this screen updates automatically — no refresh needed.
          </p>
          {error ? <p className="mt-2 text-[11px] text-amber-800/80">{error}</p> : null}
        </div>
      </EmbedShell>
    )
  }

  if (phase === 'unbound') {
    return (
      <EmbedShell>
        <GuestModeBanner context={context} />
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-semibold">Waiting for the host</p>
          <p className="mt-1 text-xs leading-relaxed text-amber-900/80">
            The host needs to link a quiz session and tap <span className="font-semibold">Open for
            everyone</span> so you can join. This screen refreshes automatically.
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
        <GuestModeBanner context={context} />
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-semibold">Could not join</p>
          <p className="mt-1 text-xs">{error}</p>
          <button
            type="button"
            onClick={() => tryResolveBinding({ quiet: false })}
            className="mt-3 h-10 w-full rounded-lg bg-navy-800 text-sm font-semibold text-white transition hover:bg-navy-900"
          >
            Try again
          </button>
        </div>
      </EmbedShell>
    )
  }

  return (
    <EmbedShell>
      <GuestModeBanner context={context} />
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
