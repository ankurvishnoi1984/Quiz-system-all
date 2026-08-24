import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSessionInactivity } from '../../hooks/useSessionInactivity'
import {
  isLiveOrPausedSession,
  resolveSessionActivityAt,
} from '../../constants/sessionInactivity'
import { pingParticipantActivityApi } from '../../services/participantApi'
import { SessionInactivityModal } from './SessionInactivityModal'

export function ParticipantSessionInactivityModal({
  enabled,
  session,
  participantToken,
  sessionQueryKey,
  onLeave,
}) {
  const queryClient = useQueryClient()
  const [stayPending, setStayPending] = useState(false)
  const [endPending, setEndPending] = useState(false)

  const lastActivityAt = resolveSessionActivityAt(session)
  const canRun = Boolean(
    enabled && participantToken && isLiveOrPausedSession(session),
  )

  const onPing = useCallback(async () => {
    const stamped = await pingParticipantActivityApi(participantToken)
    if (!stamped || !sessionQueryKey) return
    queryClient.setQueryData(sessionQueryKey, (old) =>
      old ? { ...old, last_activity_at: stamped } : old,
    )
  }, [participantToken, queryClient, sessionQueryKey])

  const { inactivityOpen, stay } = useSessionInactivity({
    enabled: canRun,
    lastActivityAt,
    onPing,
  })

  const handleStay = useCallback(async () => {
    setStayPending(true)
    try {
      await stay()
    } finally {
      setStayPending(false)
    }
  }, [stay])

  const handleLeave = useCallback(async () => {
    setEndPending(true)
    try {
      await onLeave?.()
    } finally {
      setEndPending(false)
    }
  }, [onLeave])

  return (
    <SessionInactivityModal
      open={inactivityOpen}
      sessionTitle={session?.title}
      role="participant"
      stayPending={stayPending}
      endPending={endPending}
      onStay={handleStay}
      onEnd={handleLeave}
    />
  )
}
