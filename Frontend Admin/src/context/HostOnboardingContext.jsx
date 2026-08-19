import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import {
  HOST_ONBOARDING_STEPS,
  hostOnboardingPathForStep,
  hostOnboardingStepIndex,
  isUserHintsCompleted,
  readHostOnboardingState,
  writeHostOnboardingState,
} from '../constants/hostOnboarding'

const HostOnboardingContext = createContext(null)

const INACTIVE_ONBOARDING = {
  active: false,
  step: HOST_ONBOARDING_STEPS[0],
  stepIndex: 0,
  totalSteps: HOST_ONBOARDING_STEPS.length,
  isLast: false,
  sessionId: null,
  paused: false,
  next: () => {},
  back: () => {},
  skip: () => {},
  complete: () => {},
  restart: () => {},
  setPaused: () => {},
  continueAfterSessionCreated: () => {},
  continueAfterQuestionSaved: () => {},
}

function pathMatchesStep(pathname, search, step, sessionId) {
  const target = hostOnboardingPathForStep(step, sessionId)
  if (!target) return true
  const [targetPath, targetQuery] = target.split('?')
  if (pathname !== targetPath) return false
  if (!targetQuery) return true
  const wanted = new URLSearchParams(targetQuery)
  const current = new URLSearchParams(search)
  for (const [key, value] of wanted.entries()) {
    if (current.get(key) !== value) return false
  }
  return true
}

export function HostOnboardingProvider({ children }) {
  const user = useAuthStore((state) => state.user)
  const isBootstrapping = useAuthStore((state) => state.isBootstrapping)
  const setHintsCompleted = useAuthStore((state) => state.setHintsCompleted)
  const userId = user?.user_id || user?.email
  const hintsCompleted = isUserHintsCompleted(user)
  const navigate = useNavigate()
  const location = useLocation()
  const [active, setActive] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [sessionId, setSessionId] = useState(null)
  const [paused, setPaused] = useState(false)

  const persist = useCallback(
    (next) => {
      if (!userId) return
      writeHostOnboardingState(userId, next)
    },
    [userId],
  )

  const syncCompleted = useCallback(
    async (completed) => {
      persist({
        completed,
        stepId: completed ? null : HOST_ONBOARDING_STEPS[0].id,
        sessionId: completed ? null : sessionId,
        completedAt: completed ? new Date().toISOString() : undefined,
      })
      await setHintsCompleted(completed)
    },
    [persist, sessionId, setHintsCompleted],
  )

  useEffect(() => {
    if (isBootstrapping || !userId) {
      if (!userId) setActive(false)
      return undefined
    }

    if (hintsCompleted) {
      setActive(false)
      persist({ completed: true, stepId: null, sessionId: null })
      return undefined
    }

    const saved = readHostOnboardingState(userId)
    const resumeFromStart = Boolean(saved.completed)
    const index = resumeFromStart ? 0 : hostOnboardingStepIndex(saved.stepId)
    const nextStep = HOST_ONBOARDING_STEPS[index]
    const nextSessionId = resumeFromStart ? null : saved.sessionId
    setStepIndex(index)
    setSessionId(nextSessionId)
    persist({ completed: false, stepId: nextStep.id, sessionId: nextSessionId })

    const target = hostOnboardingPathForStep(nextStep, nextSessionId)
    const current = `${window.location.pathname}${window.location.search}`
    if (target && current !== target) {
      navigate(target)
    }

    const timer = window.setTimeout(() => setActive(true), 350)
    return () => window.clearTimeout(timer)
  }, [hintsCompleted, isBootstrapping, navigate, persist, userId])

  const step = HOST_ONBOARDING_STEPS[stepIndex] || HOST_ONBOARDING_STEPS[0]
  const isLast = stepIndex >= HOST_ONBOARDING_STEPS.length - 1

  const goToStep = useCallback(
    (index, nextSessionId = sessionId) => {
      const nextIndex = Math.max(0, Math.min(HOST_ONBOARDING_STEPS.length - 1, index))
      const nextStep = HOST_ONBOARDING_STEPS[nextIndex]
      setStepIndex(nextIndex)
      persist({ completed: false, stepId: nextStep.id, sessionId: nextSessionId || null })
      const target = hostOnboardingPathForStep(nextStep, nextSessionId)
      if (target && !pathMatchesStep(location.pathname, location.search, nextStep, nextSessionId)) {
        navigate(target)
      }
    },
    [location.pathname, location.search, navigate, persist, sessionId],
  )

  const complete = useCallback(() => {
    setActive(false)
    void syncCompleted(true)
  }, [syncCompleted])

  const next = useCallback(() => {
    if (isLast) {
      complete()
      return
    }
    goToStep(stepIndex + 1)
  }, [complete, goToStep, isLast, stepIndex])

  const back = useCallback(() => {
    if (stepIndex <= 0) return
    goToStep(stepIndex - 1)
  }, [goToStep, stepIndex])

  const restart = useCallback(() => {
    if (!userId) return
    persist({ completed: false, stepId: HOST_ONBOARDING_STEPS[0].id, sessionId: null })
    setSessionId(null)
    setStepIndex(0)
    setActive(true)
    void setHintsCompleted(false)
    if (location.pathname !== '/dashboard') {
      navigate('/dashboard')
    }
  }, [location.pathname, navigate, persist, setHintsCompleted, userId])

  const continueAfterSessionCreated = useCallback(
    (createdSessionId) => {
      const nextSessionId = createdSessionId != null ? String(createdSessionId) : sessionId
      setSessionId(nextSessionId)
      const addQuestionsIndex = HOST_ONBOARDING_STEPS.findIndex((item) => item.id === 'add-questions')
      goToStep(addQuestionsIndex >= 0 ? addQuestionsIndex : stepIndex + 1, nextSessionId)
    },
    [goToStep, sessionId, stepIndex],
  )

  const continueAfterQuestionSaved = useCallback(() => {
    const shareIndex = HOST_ONBOARDING_STEPS.findIndex((item) => item.id === 'share')
    goToStep(shareIndex >= 0 ? shareIndex : stepIndex + 1, sessionId)
  }, [goToStep, sessionId, stepIndex])

  const value = useMemo(
    () => ({
      active,
      step,
      stepIndex,
      totalSteps: HOST_ONBOARDING_STEPS.length,
      isLast,
      sessionId,
      paused,
      next,
      back,
      skip: complete,
      complete,
      restart,
      setPaused,
      continueAfterSessionCreated,
      continueAfterQuestionSaved,
    }),
    [
      active,
      back,
      complete,
      continueAfterQuestionSaved,
      continueAfterSessionCreated,
      isLast,
      next,
      paused,
      restart,
      sessionId,
      setPaused,
      step,
      stepIndex,
    ],
  )

  return <HostOnboardingContext.Provider value={value}>{children}</HostOnboardingContext.Provider>
}

export function useHostOnboarding() {
  const value = useContext(HostOnboardingContext)
  if (!value) return INACTIVE_ONBOARDING
  return value
}
