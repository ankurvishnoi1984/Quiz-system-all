import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { joinZoomMeetingSessionApi, getZoomMeetingSessionApi } from '../../services/zoomApi'
import { useParticipantStore } from '../../store/participantStore'
import { buildZoomDeviceFingerprint } from '../../utils/zoomContext'
import { EmbedShell } from '../embed/EmbedControlsPage'
import ParticipantSessionPage from '../participant-session/ParticipantSessionPage'

const UNBOUND_POLL_MS = 4000
const LAUNCH_RETRY_MS = 3000

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
  const phaseRef = useRef(phase)
  const nicknameRef = useRef(nickname)
  const emailRef = useRef(email)
  const mobileRef = useRef(mobile)
  const bindingRef = useRef(binding)
  const participantTokenRef = useRef(participantToken)
  const joinedSessionCodeRef = useRef(joinedSessionCode)

  phaseRef.current = phase
  nicknameRef.current = nickname
  emailRef.current = email
  mobileRef.current = mobile
  bindingRef.current = binding
  participantTokenRef.current = participantToken
  joinedSessionCodeRef.current = joinedSessionCode

  useEffect(() => {
    if (context.displayName && !nicknameRef.current) {
      setNickname(context.displayName)
    }
  }, [context.displayName])

  const joinType = binding?.session?.join_type || 'anonymous'

  const needsContactFields = useMemo(
    () => ['name_email', 'name_mobile', 'name_email_mobile'].includes(joinType),
    [joinType],
  )

  const needsName = joinType === 'name' || needsContactFields

  const doJoin = useCallback(
    async (activeBinding, fields = {}) => {
      if (joiningRef.current) return
      joiningRef.current = true
      // Keep the form mounted while submitting so Zoom/mobile keyboards are not dismissed
      // by flipping through the loading screen on every parent re-render.
      const previousPhase = phaseRef.current
      if (previousPhase !== 'need_fields' && previousPhase !== 'need_name') {
        setPhase('loading')
      }
      setError('')
      try {
        const data = await joinZoomMeetingSessionApi({
          meeting_uuid: context.meetingUuid,
          zoom_user_id: context.zoomUserId || undefined,
          display_name: context.displayName || undefined,
          nickname:
            fields.nickname ||
            nicknameRef.current ||
            context.displayName ||
            undefined,
          email: fields.email || emailRef.current || undefined,
          mobile: fields.mobile || mobileRef.current || undefined,
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
    [context, needsContactFields, needsName, setParticipant],
  )

  const tryResolveBinding = useCallback(
    async ({ quiet = false } = {}) => {
      if (joiningRef.current) return
      const currentPhase = phaseRef.current
      // Never tear down the join form while the participant is typing.
      const onJoinForm = currentPhase === 'need_fields' || currentPhase === 'need_name'
      if (!quiet && !onJoinForm) {
        setPhase('loading')
        setError('')
      }
      try {
        const data = await getZoomMeetingSessionApi(context.meetingUuid)
        const nextBinding = data?.binding || null
        setBinding(nextBinding)
        if (!nextBinding?.session?.session_code) {
          if (!onJoinForm) setPhase('unbound')
          return
        }

        const boundCode = String(nextBinding.session.session_code || '').trim().toUpperCase()
        const sessionJoinType = nextBinding.session?.join_type || 'anonymous'
        const sessionNeedsContact = ['name_email', 'name_mobile', 'name_email_mobile'].includes(
          sessionJoinType,
        )
        const sessionNeedsName = sessionJoinType === 'name' || sessionNeedsContact

        // Already joined this meeting's session — stay in Zoom shell with live quiz UI.
        if (
          participantTokenRef.current &&
          joinedSessionCodeRef.current &&
          String(joinedSessionCodeRef.current).trim().toUpperCase() === boundCode
        ) {
          setJoinResult({ sessionCode: boundCode })
          setPhase('ready')
          return
        }

        // Stay on the form while the participant enters name/email — do not auto-rejoin
        // or flash loading on every parent refresh.
        if (onJoinForm) {
          return
        }

        if (sessionNeedsContact || sessionNeedsName) {
          // Anonymous can auto-join; named/contact joins need the form unless display name is enough.
          if (sessionJoinType === 'name' && (nicknameRef.current || context.displayName)) {
            await doJoin(nextBinding, {
              nickname: nicknameRef.current || context.displayName,
            })
            return
          }
          if (sessionJoinType === 'anonymous') {
            await doJoin(nextBinding)
            return
          }
          setPhase('need_fields')
          return
        }

        await doJoin(nextBinding)
      } catch (err) {
        if (err?.code === 'ZOOM_MEETING_UNBOUND') {
          if (!onJoinForm) setPhase('unbound')
          return
        }
        if (!quiet && !onJoinForm) {
          setError(err?.message || 'Could not load this Zoom meeting')
          setPhase('error')
        }
      }
    },
    [context.displayName, context.meetingUuid, doJoin],
  )

  // Resolve once per meeting — do NOT depend on form field state (that remounted the form
  // on every keystroke and dismissed the mobile keyboard).
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (cancelled) return
      await tryResolveBinding({ quiet: false })
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- meeting identity only
  }, [context.meetingUuid, context.zoomUserId])

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
      void doJoin(bindingRef.current, {
        nickname: nicknameRef.current,
        email: emailRef.current,
        mobile: mobileRef.current,
      })
    }, LAUNCH_RETRY_MS)
    return () => clearInterval(timer)
  }, [phase, binding, doJoin])

  if (phase === 'ready' && joinResult?.sessionCode) {
    return (
      <div className="min-h-dvh bg-slate-50">
        <ParticipantSessionPage embed sessionCode={joinResult.sessionCode} />
      </div>
    )
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

  if (phase === 'waiting_launch') {
    return (
      <EmbedShell>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-semibold">Waiting for the host to launch</p>
          <p className="mt-1 text-xs leading-relaxed text-amber-900/80">
            The quiz is linked to this meeting. When the host taps{' '}
            <span className="font-semibold">Launch</span>, this screen updates automatically — no
            refresh needed.
          </p>
          {error ? <p className="mt-2 text-[11px] text-amber-800/80">{error}</p> : null}
        </div>
      </EmbedShell>
    )
  }

  if (phase === 'unbound') {
    return (
      <EmbedShell>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-semibold">Waiting for the host</p>
          <p className="mt-1 text-xs leading-relaxed text-amber-900/80">
            The host needs to link a quiz session and tap{' '}
            <span className="font-semibold">Open for everyone</span> so you can join. This screen
            refreshes automatically.
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
            autoComplete="name"
            enterKeyHint="next"
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
            autoComplete="email"
            inputMode="email"
            enterKeyHint="next"
            className="h-10 w-full rounded-lg border border-blue-200 px-3 text-sm outline-none focus:border-sky-400"
          />
        ) : null}

        {joinType === 'name_mobile' || joinType === 'name_email_mobile' ? (
          <input
            required
            value={mobile}
            onChange={(event) => setMobile(event.target.value)}
            placeholder="Mobile"
            autoComplete="tel"
            inputMode="tel"
            enterKeyHint="done"
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
