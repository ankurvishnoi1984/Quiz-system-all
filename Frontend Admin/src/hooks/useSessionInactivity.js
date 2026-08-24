import { useCallback, useEffect, useRef, useState } from 'react'
import {
  SESSION_ACTIVITY_PING_MS,
  SESSION_INACTIVITY_MS,
  isSessionInactive,
} from '../constants/sessionInactivity'

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'mousemove', 'scroll', 'touchstart', 'click']

export function useSessionInactivity({ enabled, lastActivityAt, onPing }) {
  const [open, setOpen] = useState(false)
  const openRef = useRef(false)
  const lastLocalRef = useRef(Date.now())
  const lastPingRef = useRef(0)
  const onPingRef = useRef(onPing)
  const lastActivityAtRef = useRef(lastActivityAt)

  useEffect(() => {
    onPingRef.current = onPing
  }, [onPing])

  useEffect(() => {
    lastActivityAtRef.current = lastActivityAt
  }, [lastActivityAt])

  useEffect(() => {
    openRef.current = open
  }, [open])

  const pingIfDue = useCallback(async (force = false) => {
    if (!enabled || openRef.current) return
    const now = Date.now()
    if (!force && now - lastPingRef.current < SESSION_ACTIVITY_PING_MS) return
    lastPingRef.current = now
    try {
      await onPingRef.current?.()
    } catch {
      // Keep the session usable even if a background ping fails.
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) {
      setOpen(false)
      return undefined
    }

    lastLocalRef.current = Date.now()

    if (isSessionInactive(lastActivityAtRef.current)) {
      setOpen(true)
    } else {
      pingIfDue(true)
    }

    const markLocal = () => {
      if (openRef.current) return
      lastLocalRef.current = Date.now()
      pingIfDue(false)
    }

    const checkIdle = () => {
      if (openRef.current) return
      if (Date.now() - lastLocalRef.current >= SESSION_INACTIVITY_MS) {
        setOpen(true)
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') checkIdle()
    }

    ACTIVITY_EVENTS.forEach((type) => {
      window.addEventListener(type, markLocal, { passive: true })
    })
    document.addEventListener('visibilitychange', onVisibility)
    const interval = window.setInterval(checkIdle, 10000)

    return () => {
      ACTIVITY_EVENTS.forEach((type) => {
        window.removeEventListener(type, markLocal)
      })
      document.removeEventListener('visibilitychange', onVisibility)
      window.clearInterval(interval)
    }
  }, [enabled, pingIfDue])

  const stay = useCallback(async () => {
    lastLocalRef.current = Date.now()
    lastPingRef.current = Date.now()
    openRef.current = false
    setOpen(false)
    try {
      await onPingRef.current?.()
    } catch {
      // Stay in the session even if the ping fails.
    }
  }, [])

  return { inactivityOpen: open, stay }
}
