import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useSessions } from '../../context/SessionsContext'
import { useAuthStore } from '../../store/authStore'
import {
  isLiveOrPausedSession,
  isSessionInactive,
  resolveSessionActivityAt,
} from '../../constants/sessionInactivity'
import { pingSessionActivityApi, transitionSessionApi } from '../../services/liveApi'
import { HostIdleSessionsModal } from './HostIdleSessionsModal'

function currentLiveSessionId(pathname, search) {
  if (pathname !== '/live' && pathname !== '/present') return null
  return new URLSearchParams(search).get('session')
}

function sessionKey(session) {
  return String(session?.session_id || session?.id || '')
}

export function HostIdleSessionsGuard() {
  const { sessions, isLoading } = useSessions()
  const location = useLocation()
  const accessToken = useAuthStore((state) => state.accessToken)
  const userRole = useAuthStore((state) => state.user?.role)
  const queryClient = useQueryClient()
  const [outcomes, setOutcomes] = useState({})
  const [snapshots, setSnapshots] = useState({})
  const [notice, setNotice] = useState(null)
  const [closed, setClosed] = useState(false)
  const [pendingId, setPendingId] = useState(null)
  const [pendingAction, setPendingAction] = useState(null)
  const [orderIds, setOrderIds] = useState([])

  const viewingSessionId = currentLiveSessionId(location.pathname, location.search)

  const idleSessions = useMemo(() => {
    if (userRole === 'super_admin') return []
    if (isLoading || !accessToken) return []
    return sessions.filter((session) => {
      const id = sessionKey(session)
      if (!id) return false
      if (viewingSessionId && id === String(viewingSessionId)) return false
      if (!isLiveOrPausedSession(session)) return false
      return isSessionInactive(resolveSessionActivityAt(session))
    })
  }, [accessToken, isLoading, sessions, userRole, viewingSessionId])

  useEffect(() => {
    if (idleSessions.length === 0) return
    setOrderIds((prev) => {
      const next = [...prev]
      idleSessions.forEach((session) => {
        const id = sessionKey(session)
        if (id && !next.includes(id)) next.push(id)
      })
      return next
    })
    setSnapshots((current) => {
      const merged = { ...current }
      idleSessions.forEach((session) => {
        const id = sessionKey(session)
        if (id && !merged[id]) merged[id] = session
      })
      return merged
    })
  }, [idleSessions])

  const listedSessions = useMemo(() => {
    const byId = new Map()
    idleSessions.forEach((session) => {
      const id = sessionKey(session)
      if (id) byId.set(id, session)
    })
    Object.entries(snapshots).forEach(([id, session]) => {
      if (!byId.has(id)) byId.set(id, session)
    })

    const ordered = []
    const used = new Set()
    orderIds.forEach((id) => {
      const session = byId.get(id)
      if (!session) return
      used.add(id)
      ordered.push(session)
    })
    byId.forEach((session, id) => {
      if (!used.has(id)) ordered.push(session)
    })
    return ordered
  }, [idleSessions, orderIds, snapshots])

  const open = Boolean(!closed && listedSessions.length > 0)

  const refreshSessionLists = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['all-sessions'] })
    queryClient.invalidateQueries({ queryKey: ['live-dept-sessions'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-sessions'] })
    queryClient.invalidateQueries({ queryKey: ['live-session'] })
  }, [queryClient])

  const rememberSession = useCallback((sessionId, session) => {
    if (!session) return
    setSnapshots((prev) => ({ ...prev, [String(sessionId)]: session }))
  }, [])

  const handleStay = useCallback(
    async (sessionId) => {
      const session = listedSessions.find((item) => sessionKey(item) === String(sessionId))
      rememberSession(sessionId, session)
      setPendingId(String(sessionId))
      setPendingAction('stay')
      try {
        await pingSessionActivityApi(accessToken, sessionId)
        refreshSessionLists()
        setOutcomes((prev) => ({ ...prev, [String(sessionId)]: 'continued' }))
        setNotice({ type: 'continued', title: session?.title || 'Session' })
      } catch {
        // Keep the row actionable if the ping fails.
      } finally {
        setPendingId(null)
        setPendingAction(null)
      }
    },
    [accessToken, listedSessions, refreshSessionLists, rememberSession],
  )

  const handleEnd = useCallback(
    async (sessionId) => {
      const session = listedSessions.find((item) => sessionKey(item) === String(sessionId))
      rememberSession(sessionId, session)
      setPendingId(String(sessionId))
      setPendingAction('end')
      try {
        await transitionSessionApi(accessToken, sessionId, 'end')
        refreshSessionLists()
        setOutcomes((prev) => ({ ...prev, [String(sessionId)]: 'ended' }))
        setNotice({ type: 'ended', title: session?.title || 'Session' })
      } catch {
        // Keep the row actionable if the session could not be ended.
      } finally {
        setPendingId(null)
        setPendingAction(null)
      }
    },
    [accessToken, listedSessions, refreshSessionLists, rememberSession],
  )

  const handleClose = useCallback(() => {
    setClosed(true)
    setNotice(null)
  }, [])

  if (userRole === 'super_admin') return null

  return (
    <HostIdleSessionsModal
      open={open}
      sessions={listedSessions}
      outcomes={outcomes}
      notice={notice}
      pendingId={pendingId}
      pendingAction={pendingAction}
      onStay={handleStay}
      onEnd={handleEnd}
      onClose={handleClose}
    />
  )
}
