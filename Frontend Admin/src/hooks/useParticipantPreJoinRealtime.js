import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createRealtimeClient, RealtimeEvent } from '../services/realtimeClient'

/**
 * Listen for session status while on the join screen (before a participant token exists).
 * HTTP polling can be stale behind production CDNs; WebSocket is the reliable path.
 */
export function useParticipantPreJoinRealtime({ sessionCode, enabled }) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!enabled || !sessionCode) return undefined

    const client = createRealtimeClient(
      '',
      { session: sessionCode, role: 'participant' },
      'participant-waiting',
    )

    const applyJoinBlock = (data, old) => ({
      ...old,
      join_locked:
        data.join_locked !== undefined ? Boolean(data.join_locked) : old.join_locked,
      join_blocked:
        data.join_blocked !== undefined ? Boolean(data.join_blocked) : old.join_blocked,
      join_blocked_message:
        data.join_blocked_message !== undefined
          ? data.join_blocked_message
          : old.join_blocked_message,
      join_blocked_reason:
        data.join_blocked_reason !== undefined
          ? data.join_blocked_reason
          : old.join_blocked_reason,
    })

    const offSession = client.on(RealtimeEvent.SESSION_UPDATED, (data) => {
      if (!data?.status) return

      queryClient.setQueryData(['participant-session', sessionCode], (old) =>
        old
          ? {
              ...applyJoinBlock(data, old),
              status: data.status,
            }
          : old,
      )
      queryClient.invalidateQueries({ queryKey: ['participant-session', sessionCode] })
    })

    const offSettings = client.on(RealtimeEvent.SESSION_SETTINGS_UPDATED, (data) => {
      queryClient.setQueryData(['participant-session', sessionCode], (old) =>
        old ? applyJoinBlock(data, old) : old,
      )
      if (data.join_locked !== undefined || data.join_blocked !== undefined) {
        queryClient.invalidateQueries({ queryKey: ['participant-session', sessionCode] })
      }
    })

    client.connect()

    return () => {
      offSession()
      offSettings()
      client.disconnect()
    }
  }, [enabled, sessionCode, queryClient])
}
