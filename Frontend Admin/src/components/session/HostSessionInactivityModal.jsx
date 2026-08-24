import { useCallback, useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSessionInactivity } from '../../hooks/useSessionInactivity'
import {
  isLiveOrPausedSession,
  resolveSessionActivityAt,
} from '../../constants/sessionInactivity'
import { pingSessionActivityApi, transitionSessionApi } from '../../services/liveApi'
import { SessionInactivityModal } from './SessionInactivityModal'

export function HostSessionInactivityModal({
  enabled,
  session,
  accessToken,
  sessionQueryKey,
  onOpenChange,
}) {
  const queryClient = useQueryClient()
  const [stayPending, setStayPending] = useState(false)
  const [endPending, setEndPending] = useState(false)

  const sessionId = session?.session_id || session?.id
  const lastActivityAt = resolveSessionActivityAt(session)
  const canRun = Boolean(enabled && accessToken && sessionId && isLiveOrPausedSession(session))

  const onPing = useCallback(async () => {
    const lastActivityAt = await pingSessionActivityApi(accessToken, sessionId)
    if (!lastActivityAt || !sessionQueryKey) return
    queryClient.setQueryData(sessionQueryKey, (old) =>
      old ? { ...old, last_activity_at: lastActivityAt } : old,
    )
  }, [accessToken, queryClient, sessionId, sessionQueryKey])

  const { inactivityOpen, stay } = useSessionInactivity({
    enabled: canRun,
    lastActivityAt,
    onPing,
  })

  useEffect(() => {
    onOpenChange?.(inactivityOpen)
    return () => onOpenChange?.(false)
  }, [inactivityOpen, onOpenChange])

  const handleStay = useCallback(async () => {
    setStayPending(true)
    try {
      await stay()
    } finally {
      setStayPending(false)
    }
  }, [stay])

  const handleEnd = useCallback(async () => {
    setEndPending(true)
    try {
      await transitionSessionApi(accessToken, sessionId, 'end')
      queryClient.invalidateQueries({ queryKey: ['live-session'] })
      queryClient.invalidateQueries({ queryKey: ['live-dept-sessions'] })
      queryClient.invalidateQueries({ queryKey: ['all-sessions'] })
    } catch {
      // Keep the prompt open if the session could not be ended.
    } finally {
      setEndPending(false)
    }
  }, [accessToken, queryClient, sessionId])

  return (
    <SessionInactivityModal
      open={inactivityOpen}
      sessionTitle={session?.title}
      role="host"
      stayPending={stayPending}
      endPending={endPending}
      onStay={handleStay}
      onEnd={handleEnd}
    />
  )
}
