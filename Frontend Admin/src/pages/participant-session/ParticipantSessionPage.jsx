import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useLocation, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useShallow } from 'zustand/shallow'
import {
  // askQaQuestionApi, // Q&A feature disabled
  getSessionLeaderboardApi,
  getParticipantSessionSurveySummaryApi,
  getParticipantSurveyQuestionResultsApi,
  joinSessionApi,
  sendSessionJoinOtpApi,
  verifySessionJoinOtpApi,
  // listQaQuestionsApi, // Q&A feature disabled
  listSessionQuestionsApi,
  lookupSessionApi,
  submitResponseApi,
  // upvoteQaApi, // Q&A feature disabled
} from '../../services/participantApi'
import { createRealtimeClient, RealtimeEvent } from '../../services/realtimeClient'
import { useParticipantStore } from '../../store/participantStore'
import { useParticipantProgressPersistence } from '../../hooks/useParticipantProgressPersistence'
import { useParticipantPreJoinRealtime } from '../../hooks/useParticipantPreJoinRealtime'
import { hasSessionCodeInJoinPath, isParticipantEmbedPath, normalizeSessionCode } from '../../utils/joinUrl'
import { isRunningInIframe } from '../../utils/iframeEmbed'
import {
  canAutoJoinWithIdentity,
  mergeJoinIdentity,
  parseJoinIdentityFromSearch,
} from '../../utils/embedJoinIdentity'
import { resolveJoinIdentityTokenApi } from '../../services/embedApi'
import { computeResponseTimeMs } from '../../utils/quizResponseTime'
import {
  playAnswerCorrect,
  playAnswerReveal,
  playAnswerWrong,
  playJoinedSession,
  playLeaderboardShown,
  playLeaderboardUpdate,
  playNewQuestion,
  playPickAnswer,
  playSessionEnded,
  playSubmitSuccess,
  unlockTimerAudio,
} from '../../utils/timerSounds'
import { isAdvancedBuilderSession, isSessionQuizTotalTimeEnabled, isSessionRandomQuestionOrderEnabled, isStrictLateJoinSession, sessionHasTimedQuestions } from '../../utils/sessionFlags'
import { normalizeParticipantTheme } from '../../utils/participantTheme'
import {
  questionSupportsLeaderboard,
  questionSupportsParticipantResults,
  sessionSupportsOverallLeaderboard,
  sessionSupportsSurveyEndingScreen,
} from '../../utils/livePresentation'
import {
  filterActiveQuestionsForLateJoinPolicy,
  getCountdownEndsAtForQuestion,
} from '../../utils/questionTimer'
import { ActiveQuestionPanel } from './components/ActiveQuestionPanel'
import { JoinFormView } from './components/JoinFormView'
import { SessionNotLiveView } from './components/SessionNotLiveView'
import { PageCenteredShell } from './components/PageCenteredShell'
import { ParticipantAlertModal } from './components/ParticipantAlertModal'
import { ParticipantSessionInactivityModal } from '../../components/session/ParticipantSessionInactivityModal'
// import { QaPanel } from './components/QaPanel' // Q&A feature disabled
import { OverallLeaderboardPanel } from './components/OverallLeaderboardPanel'
import { SurveySessionEndingPanel } from './components/SurveySessionEndingPanel'
import { SessionHeader } from './components/SessionHeader'
import { SessionEndedBanner, SessionEndedPanel } from './components/SessionEndedBanner'
import { WaitingForQuestion } from './components/WaitingForQuestion'
import { WaitingView } from './components/WaitingView'
import { isParticipantChoiceCorrect } from '../../utils/answerReveal'
import {
  applyParticipantQuestionOrder,
  buildResponsePayloadForQuestion,
  canShowPreviousForTimedMultiNav,
  canShowPreviousForUntimedMultiNav,
  canShowPreviousForQuizTotalTimeMultiNav,
  ensureParticipantQuestionOrder,
  isMultiNavLastQuestionFinalized,
  getLastActivatedLiveQuestion,
  canAutoNavigateToActivatedQuestion,
  clamp,
  findNextUnsubmittedActiveQuestion,
  getLockedNavigationQuestion,
  isParticipantAttemptingQuestion,
  mapParticipantQuestion,
  participantCanUpdateSubmittedResponse,
  participantWordCloudInputLocked,
  participantQuestionHasAnswer,
  shouldIncludeQuestionInFinalize,
} from './utils/questionUtils'
import {
  canReuseStoredParticipantSession,
  isSessionOpenForNewJoin,
} from './utils/joinFlow'

function ParticipantSessionPage({ embed = false }) {
  const { sessionId } = useParams()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const { participantToken, joinedUser, joinedSessionCode, setParticipant } = useParticipantStore()

  const embedMode = Boolean(embed) || isParticipantEmbedPath(location.pathname) || isRunningInIframe()
  const queryIdentity = useMemo(
    () => parseJoinIdentityFromSearch(searchParams.toString()),
    [searchParams],
  )
  const [tokenIdentity, setTokenIdentity] = useState(null)
  const [tokenIdentityError, setTokenIdentityError] = useState('')
  const [tokenIdentityLoading, setTokenIdentityLoading] = useState(() =>
    Boolean(queryIdentity.joinToken),
  )
  const resolvedIdentity = useMemo(
    () => mergeJoinIdentity(queryIdentity, tokenIdentity),
    [queryIdentity, tokenIdentity],
  )

  const hasSessionCodeInUrl = hasSessionCodeInJoinPath(location.pathname, sessionId)
  const [sessionCodeInput, setSessionCodeInput] = useState('')
  const effectiveSessionCode = normalizeSessionCode(
    hasSessionCodeInUrl ? sessionId : sessionCodeInput,
  )

  const canUseStoredJoin = useMemo(
    () =>
      canReuseStoredParticipantSession({
        hasSessionCodeInUrl,
        participantToken,
        joinedSessionCode,
        effectiveSessionCode,
      }),
    [hasSessionCodeInUrl, participantToken, joinedSessionCode, effectiveSessionCode],
  )

  const {
    responses,
    questionIndex,
    liveQuestionId,
    submitted,
    quizCountdownByQuestion,
    quizSessionCountdown,
    quizQuestionOpenedAt,
    quizSubmittedQuestionIds,
    quizExplicitSubmittedQuestionIds,
    quizQuestionOrder,
    setResponses,
    setQuestionIndex,
    setLiveQuestionId,
    setSubmitted,
    setQuizCountdown,
    startQuizSessionCountdown,
    freezeQuizSessionCountdown,
    resetQuizProgress,
    hydrateQuizProgress,
    freezeCountdownAfterSubmit,
    freezeAllCountdowns,
    markQuestionsSubmitted,
    markQuestionsExplicitlySubmitted,
    unlockQuestionForReattempt,
    markQuestionOpened,
    setQuizQuestionOrder,
  } = useParticipantStore(
    useShallow((s) => ({
      responses: s.quizResponses,
      questionIndex: s.quizQuestionIndex,
      liveQuestionId: s.quizLiveQuestionId,
      submitted: s.quizSubmitted,
      quizCountdownByQuestion: s.quizCountdownByQuestion,
      quizSessionCountdown: s.quizSessionCountdown,
      quizQuestionOpenedAt: s.quizQuestionOpenedAt,
      quizSubmittedQuestionIds: s.quizSubmittedQuestionIds,
      quizExplicitSubmittedQuestionIds: s.quizExplicitSubmittedQuestionIds,
      quizQuestionOrder: s.quizQuestionOrder,
      setResponses: s.setQuizResponses,
      setQuestionIndex: s.setQuizQuestionIndex,
      setLiveQuestionId: s.setQuizLiveQuestionId,
      setSubmitted: s.setQuizSubmitted,
      setQuizCountdown: s.setQuizCountdown,
      startQuizSessionCountdown: s.startQuizSessionCountdown,
      freezeQuizSessionCountdown: s.freezeQuizSessionCountdown,
      resetQuizProgress: s.resetQuizProgress,
      hydrateQuizProgress: s.hydrateQuizProgress,
      freezeCountdownAfterSubmit: s.freezeCountdownAfterSubmit,
      freezeAllCountdowns: s.freezeAllCountdowns,
      markQuestionsSubmitted: s.markQuestionsSubmitted,
      markQuestionsExplicitlySubmitted: s.markQuestionsExplicitlySubmitted,
      unlockQuestionForReattempt: s.unlockQuestionForReattempt,
      markQuestionOpened: s.markQuestionOpened,
      setQuizQuestionOrder: s.setQuizQuestionOrder,
    })),
  )

  const [participantHydrated, setParticipantHydrated] = useState(() =>
    useParticipantStore.persist.hasHydrated(),
  )
  const [countdownTick, setCountdownTick] = useState(0)
  const [step, setStep] = useState('join')
  const [name, setName] = useState(() => queryIdentity.name || '')
  const [email, setEmail] = useState(() => queryIdentity.email || '')
  const [mobile, setMobile] = useState(() => queryIdentity.mobile || '')
  const [otpChannel, setOtpChannel] = useState('email')
  const [otpCode, setOtpCode] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpBusy, setOtpBusy] = useState(false)
  const [joinBusy, setJoinBusy] = useState(false)
  const [joinError, setJoinError] = useState('')
  const [autoJoinPending, setAutoJoinPending] = useState(false)
  const autoJoinAttemptedRef = useRef(false)
  const joinIdentityTokenRef = useRef(queryIdentity.joinToken || '')

  useEffect(() => {
    joinIdentityTokenRef.current = queryIdentity.joinToken || ''
  }, [queryIdentity.joinToken])

  useEffect(() => {
    if (resolvedIdentity.name) setName(resolvedIdentity.name)
    if (resolvedIdentity.email) setEmail(resolvedIdentity.email)
    if (resolvedIdentity.mobile) setMobile(resolvedIdentity.mobile)
  }, [resolvedIdentity.name, resolvedIdentity.email, resolvedIdentity.mobile])

  useEffect(() => {
    let cancelled = false
    const token = queryIdentity.joinToken
    if (!token || !effectiveSessionCode) {
      setTokenIdentity(null)
      setTokenIdentityError('')
      setTokenIdentityLoading(false)
      return undefined
    }

    setTokenIdentityLoading(true)
    setTokenIdentityError('')
    resolveJoinIdentityTokenApi(effectiveSessionCode, token)
      .then((data) => {
        if (cancelled) return
        setTokenIdentity({
          name: data?.name || '',
          email: data?.email || '',
          mobile: data?.mobile || '',
        })
        setTokenIdentityLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        setTokenIdentity(null)
        setTokenIdentityError(err?.message || 'Join token is invalid or expired')
        setTokenIdentityLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [queryIdentity.joinToken, effectiveSessionCode])

  const [transitioningLive, setTransitioningLive] = useState(false)
  const [tagsInput, setTagsInput] = useState('')
  // Q&A feature disabled — re-enable when bringing Q&A back
  // const [askText, setAskText] = useState('')
  // const [askAnonymous, setAskAnonymous] = useState(false)
  // const [upvotes, setUpvotes] = useState({})
  // const [ownQuestions, setOwnQuestions] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitModal, setSubmitModal] = useState(null)
  const [reattemptModal, setReattemptModal] = useState(null)
  const [closedByHostModal, setClosedByHostModal] = useState(null)
  const [allQuestionsClosedModal, setAllQuestionsClosedModal] = useState(null)
  const [allQuestionsClosedByHost, setAllQuestionsClosedByHost] = useState(false)
  const [sessionEndedModal, setSessionEndedModal] = useState(false)
  const closedNoticeShownRef = useRef(new Set())
  const allQuestionsClosedNoticeShownRef = useRef(false)
  const sessionEndedNotifiedRef = useRef(false)
  const [leaderboard, setLeaderboard] = useState([])
  const [questionLeaderboardByQuestion, setQuestionLeaderboardByQuestion] = useState({})
  const [questionLbVisibleByQuestion, setQuestionLbVisibleByQuestion] = useState({})
  const [answerRevealByQuestion, setAnswerRevealByQuestion] = useState({})
  const [ipBlocked, setIpBlocked] = useState(false)
  const [unseenActivatedQuestionIds, setUnseenActivatedQuestionIds] = useState(
    () => new Set(),
  )

  const sessionQuery = useQuery({
    queryKey: ['participant-session', effectiveSessionCode],
    queryFn: () => lookupSessionApi(effectiveSessionCode),
    enabled: Boolean(effectiveSessionCode) && !ipBlocked,
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: true,
    refetchInterval: (query) => {
      if (ipBlocked) return false
      const status = query.state.data?.status
      const onJoinStep = step === 'join' && !participantToken && !canUseStoredJoin
      if (onJoinStep && !isSessionOpenForNewJoin(status)) return 3000
      if (onJoinStep && status === 'live') return 5000
      if (step === 'waiting' || status === 'draft') return 3000
      if (participantToken && (status === 'live' || status === 'paused')) return 5000
      return false
    },
  })

  useEffect(() => {
    const error = sessionQuery.error
    if (!error || error.status !== 403) return
    const code = error.details?.code
    if (code === 'ip_blocked' || /blocked by an administrator/i.test(error.message || '')) {
      setIpBlocked(true)
      useParticipantStore.getState().clearParticipant?.()
    }
  }, [sessionQuery.error])

  const preJoinRealtimeEnabled = Boolean(
    participantHydrated &&
      effectiveSessionCode &&
      step === 'join' &&
      !participantToken &&
      !canUseStoredJoin &&
      !ipBlocked,
  )

  useParticipantPreJoinRealtime({
    sessionCode: effectiveSessionCode,
    enabled: preJoinRealtimeEnabled,
  })

  const questionsQuery = useQuery({
    queryKey: ['participant-questions', sessionQuery.data?.session_id, participantToken],
    queryFn: () => listSessionQuestionsApi(participantToken, sessionQuery.data?.session_id),
    enabled: Boolean(participantToken && sessionQuery.data?.session_id) && !ipBlocked,
    refetchInterval: !ipBlocked && (step === 'active' || step === 'waiting') ? 5000 : false,
  })

  useEffect(() => {
    const error = questionsQuery.error
    if (!error || error.status !== 403) return
    const code = error.details?.code
    if (code === 'ip_blocked' || /blocked by an administrator/i.test(error.message || '')) {
      setIpBlocked(true)
      useParticipantStore.getState().clearParticipant?.()
    }
  }, [questionsQuery.error])

  // Q&A feature disabled — re-enable when bringing Q&A back
  // const qaQuery = useQuery({
  //   queryKey: ['participant-qa', sessionQuery.data?.session_id, participantToken],
  //   queryFn: () => listQaQuestionsApi(participantToken, sessionQuery.data?.session_id),
  //   enabled: Boolean(participantToken && sessionQuery.data?.session_id),
  //   refetchInterval: 10000,
  // })

  const mappedQuestions = useMemo(
    () => (questionsQuery.data || []).map(mapParticipantQuestion),
    [questionsQuery.data],
  )

  useEffect(() => {
    setQuestionLbVisibleByQuestion((prev) => {
      const next = { ...prev }
      mappedQuestions.forEach((q) => {
        next[String(q.id)] = Boolean(q.showLeaderboard)
      })
      return next
    })
  }, [mappedQuestions])

  useEffect(() => {
    setAnswerRevealByQuestion((prev) => {
      const merged = { ...prev }
      mappedQuestions.forEach((q) => {
        const key = String(q.id)
        if (q.answerRevealed) {
          merged[key] = {
            revealed: true,
            correctOptionIds: q.correctOptionIds || [],
            correctMatchingPairs: q.correctMatchingPairs || null,
          }
        } else if (merged[key]) {
          merged[key] = {
            revealed: false,
            correctOptionIds: [],
            correctMatchingPairs: null,
          }
        }
      })
      return merged
    })
  }, [mappedQuestions])

  const session = sessionQuery.data
  const isSessionEnded =
    session?.status === 'completed' || session?.status === 'archived'
  const showOverallLeaderboard = Boolean(
    session?.leaderboard_enabled || session?.current_rankings_enabled,
  )
  const rankingsTitle = session?.current_rankings_enabled
    ? 'Current rankings'
    : 'Overall Rankings'
  // Rankings replace the live question — participants only see the leaderboard screen.
  const showOverallLeaderboardTab =
    showOverallLeaderboard &&
    (sessionSupportsOverallLeaderboard(mappedQuestions) || mappedQuestions.length === 0)
  const showSurveyResultsEnabled = Boolean(session?.survey_results_enabled)
  // Host toggle: live survey result charts (not tied to session end).
  // Trust the toggle even if question mapping briefly lags behind WS updates.
  const showSurveyResults =
    showSurveyResultsEnabled &&
    (sessionSupportsSurveyEndingScreen(mappedQuestions) || showSurveyResultsEnabled)
  // After the host ends a survey-style session, show thanks only (results are cleared).
  const showSurveyThanks =
    isSessionEnded &&
    !showSurveyResults &&
    sessionSupportsSurveyEndingScreen(mappedQuestions)
  const showSurveyEndingScreen = showSurveyResults || showSurveyThanks
  const endingScreenOnlyMode = showOverallLeaderboardTab || showSurveyEndingScreen
  // Advanced is host-paced (one slot at a time) — no Previous/Next across assigned questions.
  const navigationEnabled =
    !isAdvancedBuilderSession(session) && session?.participant_navigation_enabled !== false
  const randomQuestionOrderEnabled = isSessionRandomQuestionOrderEnabled(session)
  const sessionQuizTotalTimeEnabled = useMemo(
    () => isSessionQuizTotalTimeEnabled(session),
    [session],
  )
  const sessionQuizTotalTimeSeconds = sessionQuizTotalTimeEnabled
    ? Math.max(0, Number(session?.quiz_total_time_minutes) || 0) * 60
    : 0
  const allLiveQuestionsClosed = useMemo(() => {
    if (!navigationEnabled) return false
    const live = mappedQuestions.filter((q) => q.isLive)
    if (!live.length) return false
    return live.every((q) => q.submissionsClosed)
  }, [mappedQuestions, navigationEnabled])

  const strictLateJoin = useMemo(
    () => isStrictLateJoinSession(session, mappedQuestions),
    [session, mappedQuestions],
  )

  const activeQuestionsBase = useMemo(
    () => filterActiveQuestionsForLateJoinPolicy(mappedQuestions),
    [mappedQuestions],
  )

  useEffect(() => {
    if (!randomQuestionOrderEnabled || !navigationEnabled || !activeQuestionsBase.length) return
    const nextOrder = ensureParticipantQuestionOrder(activeQuestionsBase, quizQuestionOrder)
    const currentKey = (quizQuestionOrder || []).join(',')
    const nextKey = nextOrder.join(',')
    if (currentKey !== nextKey) {
      setQuizQuestionOrder(nextOrder)
    }
  }, [
    randomQuestionOrderEnabled,
    navigationEnabled,
    activeQuestionsBase,
    quizQuestionOrder,
    setQuizQuestionOrder,
  ])

  const activeQuestions = useMemo(() => {
    if (!randomQuestionOrderEnabled || !quizQuestionOrder?.length) return activeQuestionsBase
    return applyParticipantQuestionOrder(activeQuestionsBase, quizQuestionOrder)
  }, [activeQuestionsBase, randomQuestionOrderEnabled, quizQuestionOrder])

  const sessionLastQuestionId = useMemo(() => {
    if (!activeQuestions.length) return null
    // Always use participant navigation order. Re-sorting by host display_order breaks
    // Advanced assignments (and any custom order) — a mid-list question can look "final".
    return activeQuestions[activeQuestions.length - 1]?.id ?? null
  }, [activeQuestions])

  const participantEditPolicy = useMemo(
    () => ({
      sessionQuizTotalTimeEnabled,
      lastQuestionFinalized:
        navigationEnabled &&
        isMultiNavLastQuestionFinalized(activeQuestions, quizExplicitSubmittedQuestionIds, {
          useParticipantOrder: true,
        }),
    }),
    [
      sessionQuizTotalTimeEnabled,
      navigationEnabled,
      activeQuestions,
      quizExplicitSubmittedQuestionIds,
    ],
  )

  const { lastQuestionFinalized } = participantEditPolicy

  const question = useMemo(() => {
    if (!activeQuestions.length) return null
    if (!navigationEnabled) {
      return getLockedNavigationQuestion(
        activeQuestions,
        liveQuestionId,
        quizSubmittedQuestionIds,
      )
    }
    if (randomQuestionOrderEnabled) {
      const idx = clamp(questionIndex, 0, activeQuestions.length - 1)
      return activeQuestions[idx] ?? null
    }
    if (liveQuestionId) {
      const live = activeQuestions.find((q) => q.id === liveQuestionId)
      if (live) return live
    }
    const idx = clamp(questionIndex, 0, activeQuestions.length - 1)
    return activeQuestions[idx] ?? null
  }, [
    activeQuestions,
    liveQuestionId,
    questionIndex,
    navigationEnabled,
    randomQuestionOrderEnabled,
    quizSubmittedQuestionIds,
  ])

  const joinRequirement = session?.join_type || 'name'
  const sessionJoinOtpRequired = Boolean(session?.join_otp_required)
  const contactJoinTypes = useMemo(
    () => new Set(['name_email', 'name_mobile', 'name_email_mobile']),
    [],
  )
  const needsContactOtp =
    sessionJoinOtpRequired && contactJoinTypes.has(joinRequirement)
  useParticipantProgressPersistence({
    enabled: contactJoinTypes.has(joinRequirement) && Boolean(participantToken),
    participantToken,
  })
  const timeLimit = question?.timeLimit ?? 0
  const hasCountdown = sessionQuizTotalTimeEnabled || Number(timeLimit) > 0
  const displayTimeLimit = sessionQuizTotalTimeEnabled ? sessionQuizTotalTimeSeconds : timeLimit
  const questionLockedBySubmission = Boolean((quizSubmittedQuestionIds || {})[String(question?.id)])
  const dbSessionId = session?.session_id

  const questionCountdown = question?.id
    ? (quizCountdownByQuestion || {})[String(question.id)]
    : null
  const countdownEndsAt = sessionQuizTotalTimeEnabled
    ? quizSessionCountdown?.endsAt ?? null
    : questionCountdown?.endsAt ?? null
  const countdownFrozen = sessionQuizTotalTimeEnabled
    ? quizSessionCountdown?.frozen ?? null
    : questionCountdown?.frozen ?? null

  const timer = useMemo(() => {
    if (isSessionEnded && hasCountdown) {
      if (countdownFrozen != null) return countdownFrozen
      return 0
    }
    if (!hasCountdown || !countdownEndsAt) return 0
    return Math.max(0, Math.ceil((countdownEndsAt - Date.now()) / 1000))
  }, [isSessionEnded, hasCountdown, countdownFrozen, countdownEndsAt, countdownTick])

  const sessionTimerExpired = sessionQuizTotalTimeEnabled && hasCountdown && timer === 0

  const canEditResponses = useMemo(
    () =>
      !isSessionEnded &&
      !lastQuestionFinalized &&
      !(sessionQuizTotalTimeEnabled && sessionTimerExpired),
    [
      isSessionEnded,
      lastQuestionFinalized,
      sessionQuizTotalTimeEnabled,
      sessionTimerExpired,
    ],
  )

  const submittedAtSeconds =
    countdownFrozen != null &&
    (sessionQuizTotalTimeEnabled
      ? lastQuestionFinalized
      : questionLockedBySubmission)
      ? countdownFrozen
      : null

  const submissionsClosed = Boolean(question?.submissionsClosed)
  const openForReattempt = Boolean(question?.openForReattempt)

  const inputsLocked =
    isSessionEnded ||
    (submissionsClosed && !openForReattempt) ||
    (navigationEnabled && allQuestionsClosedByHost && !openForReattempt) ||
    lastQuestionFinalized ||
    (sessionQuizTotalTimeEnabled && sessionTimerExpired) ||
    (question?.type === 'Emoji Reaction' && questionLockedBySubmission) ||
    (!sessionQuizTotalTimeEnabled &&
      hasCountdown &&
      (questionLockedBySubmission || timer === 0))

  const wordCloudInputsLocked = useMemo(
    () =>
      participantWordCloudInputLocked({
        question,
        navigationEnabled,
        inputsLocked,
        submittedIds: quizSubmittedQuestionIds,
        editPolicy: participantEditPolicy,
      }),
    [question, navigationEnabled, inputsLocked, quizSubmittedQuestionIds, participantEditPolicy],
  )

  const showClosedByHostNotice = useCallback((questionText) => {
    const preview = String(questionText || '').trim()
    setClosedByHostModal({
      variant: 'info',
      title: 'Question closed',
      message: preview
        ? `This question was closed by the host and is no longer accepting submissions:\n\n“${preview.slice(0, 120)}${preview.length > 120 ? '…' : ''}”`
        : 'This question was closed by the host and is no longer accepting submissions.',
      confirmLabel: 'OK',
    })
  }, [])

  const showAllQuestionsClosedNotice = useCallback(() => {
    setAllQuestionsClosedModal({
      variant: 'info',
      title: 'All questions closed',
      message:
        'All questions were closed by the host and are no longer accepting submissions. You can still review them.',
      confirmLabel: 'OK',
    })
  }, [])

  useEffect(() => {
    if (!navigationEnabled) return
    if (allLiveQuestionsClosed) {
      setAllQuestionsClosedByHost(true)
      if (allQuestionsClosedNoticeShownRef.current) return
      allQuestionsClosedNoticeShownRef.current = true
      showAllQuestionsClosedNotice()
    } else {
      setAllQuestionsClosedByHost(false)
    }
  }, [navigationEnabled, allLiveQuestionsClosed, showAllQuestionsClosedNotice])

  useEffect(() => {
    if (!question?.id || !submissionsClosed || navigationEnabled) return
    const key = String(question.id)
    if (closedNoticeShownRef.current.has(key)) return
    closedNoticeShownRef.current.add(key)
    showClosedByHostNotice(question.text)
  }, [question?.id, question?.text, submissionsClosed, showClosedByHostNotice])

  const activeQuestionsRef = useRef(activeQuestions)
  activeQuestionsRef.current = activeQuestions

  const addUnseenActivatedQuestion = useCallback(
    (questionId) => {
      const qid = Number(questionId)
      if (!qid || !navigationEnabled) return
      const opened = useParticipantStore.getState().quizQuestionOpenedAt || {}
      if (opened[String(qid)]) return
      setUnseenActivatedQuestionIds((prev) => {
        if (prev.has(qid)) return prev
        const next = new Set(prev)
        next.add(qid)
        return next
      })
    },
    [navigationEnabled],
  )

  const clearUnseenActivatedQuestion = useCallback((questionId) => {
    const qid = Number(questionId)
    if (!qid) return
    setUnseenActivatedQuestionIds((prev) => {
      if (!prev.has(qid)) return prev
      const next = new Set(prev)
      next.delete(qid)
      return next
    })
  }, [])

  useEffect(() => {
    setUnseenActivatedQuestionIds(new Set())
  }, [effectiveSessionCode])

  useEffect(() => {
    setOtpSent(false)
    setOtpCode('')
    setOtpChannel(joinRequirement === 'name_mobile' ? 'mobile' : 'email')
  }, [effectiveSessionCode, joinRequirement])

  const liveUnseenSyncedRef = useRef(false)
  useEffect(() => {
    liveUnseenSyncedRef.current = false
  }, [effectiveSessionCode])

  useEffect(() => {
    if (!navigationEnabled || step !== 'active' || liveUnseenSyncedRef.current) return
    if (!activeQuestions.length) return
    liveUnseenSyncedRef.current = true
    const opened = quizQuestionOpenedAt || {}
    const toAdd = activeQuestions
      .filter((q) => q.isLive && !opened[String(q.id)])
      .map((q) => Number(q.id))
      .filter(Boolean)
    if (!toAdd.length) return
    setUnseenActivatedQuestionIds((prev) => {
      const next = new Set(prev)
      let changed = false
      for (const id of toAdd) {
        if (!next.has(id)) {
          next.add(id)
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [navigationEnabled, step, activeQuestions, quizQuestionOpenedAt])

  /** Host activated a question while participant was mid-timed-attempt — apply when idle. */
  const pendingActivatedQuestionIdRef = useRef(null)

  const tryApplyPendingActivatedQuestion = useCallback(() => {
    const pendingId = pendingActivatedQuestionIdRef.current
    if (pendingId == null) return false

    const visibleActiveQuestions = activeQuestionsRef.current
    if (!visibleActiveQuestions.some((q) => q.id === pendingId)) return false

    const store = useParticipantStore.getState()

    if (store.quizLiveQuestionId === pendingId) {
      pendingActivatedQuestionIdRef.current = null
      return false
    }

    const canNavigate = navigationEnabled
      ? canAutoNavigateToActivatedQuestion({
          activeQuestions: visibleActiveQuestions,
          liveQuestionId: store.quizLiveQuestionId,
          questionIndex: store.quizQuestionIndex,
          quizSubmittedQuestionIds: store.quizSubmittedQuestionIds,
        })
      : !isParticipantAttemptingQuestion(
          getLockedNavigationQuestion(
            visibleActiveQuestions,
            store.quizLiveQuestionId,
            store.quizSubmittedQuestionIds,
          ),
          store.quizSubmittedQuestionIds,
        )
    if (!canNavigate) return false

    pendingActivatedQuestionIdRef.current = null
    setStep('active')
    setLiveQuestionId(pendingId)
    setSubmitted(false)
    return true
  }, [navigationEnabled, setLiveQuestionId, setSubmitted])

  const advanceToNextUnsubmittedActiveQuestion = useCallback(() => {
    if (navigationEnabled) return false
    const store = useParticipantStore.getState()
    const submittedIds = store.quizSubmittedQuestionIds || {}
    const visible = activeQuestionsRef.current
    const currentId = store.quizLiveQuestionId ?? question?.id ?? null
    const next = findNextUnsubmittedActiveQuestion(visible, submittedIds, currentId)
    if (!next) return false
    setLiveQuestionId(next.id)
    setSubmitted(false)
    return true
  }, [navigationEnabled, question?.id, setLiveQuestionId, setSubmitted])

  const handleHostQuestionActivated = useCallback(
    (questionId) => {
      playNewQuestion()
      addUnseenActivatedQuestion(questionId)
      if (randomQuestionOrderEnabled) return
      pendingActivatedQuestionIdRef.current = questionId
      tryApplyPendingActivatedQuestion()
    },
    [
      addUnseenActivatedQuestion,
      randomQuestionOrderEnabled,
      tryApplyPendingActivatedQuestion,
    ],
  )

  useEffect(() => {
    tryApplyPendingActivatedQuestion()
  }, [tryApplyPendingActivatedQuestion, activeQuestions, quizSubmittedQuestionIds, step])

  useEffect(() => {
    setSubmitted(questionLockedBySubmission)
  }, [questionLockedBySubmission, setSubmitted])

  const client = useMemo(() => {
    if (!effectiveSessionCode || !participantToken) return null
    return createRealtimeClient(
      '',
      { session: effectiveSessionCode, token: participantToken, role: 'participant' },
      'participant',
    )
  }, [effectiveSessionCode, participantToken])

  useEffect(() => {
    const unsub = useParticipantStore.persist.onFinishHydration(() => {
      setParticipantHydrated(true)
    })
    if (useParticipantStore.persist.hasHydrated()) {
      setParticipantHydrated(true)
    }
    return unsub
  }, [])

  useEffect(() => {
    if (!participantHydrated || !effectiveSessionCode) return
    const { participantToken: token, joinedSessionCode, clearParticipant } =
      useParticipantStore.getState()
    if (token && joinedSessionCode && joinedSessionCode !== effectiveSessionCode) {
      clearParticipant()
      setStep('join')
    }
  }, [participantHydrated, effectiveSessionCode])

  useEffect(() => {
    if (!participantHydrated || !session || !effectiveSessionCode) return
    const { participantToken: token, joinedSessionCode } = useParticipantStore.getState()
    if (!token || joinedSessionCode !== effectiveSessionCode) return
    setStep((current) => {
      if (current !== 'join') return current
      const s = session.status
      if (s === 'completed' || s === 'archived') return 'active'
      if (s === 'live' || s === 'paused') return 'active'
      return 'waiting'
    })
  }, [participantHydrated, session, effectiveSessionCode])

  useEffect(() => {
    sessionEndedNotifiedRef.current = false
    setSessionEndedModal(false)
  }, [effectiveSessionCode])

  useEffect(() => {
    if (!participantToken || !session) return
    if (session.status !== 'completed' && session.status !== 'archived') return
    freezeAllCountdowns()
    if (sessionEndedNotifiedRef.current) return
    sessionEndedNotifiedRef.current = true
    playSessionEnded()
    setSessionEndedModal(true)
  }, [participantToken, session?.status, freezeAllCountdowns])

  useEffect(() => {
    if (!isSessionEnded) return
    freezeAllCountdowns()
  }, [isSessionEnded, freezeAllCountdowns])

  useEffect(() => {
    if (!client || !effectiveSessionCode || !participantToken || !dbSessionId) return

    const offConnected = client.on(RealtimeEvent.CONNECTED, () => {
      queryClient.invalidateQueries({ queryKey: ['participant-session', effectiveSessionCode] })
      queryClient.invalidateQueries({ queryKey: ['participant-questions', dbSessionId] })
    })

    const offIpBlocked = client.on(RealtimeEvent.CONNECTION_IP_BLOCKED, () => {
      setIpBlocked(true)
      useParticipantStore.getState().clearParticipant?.()
      client.disconnect()
    })

    const offAdminClosed = client.on(RealtimeEvent.CONNECTION_CLOSED_BY_ADMIN, () => {
      // Connection closed by admin — do not auto-rejoin until refresh
    })

    const offSession = client.on(RealtimeEvent.SESSION_UPDATED, (data) => {
      if (data?.status || data?.advanced_active_slot != null) {
        const ended = data.status === 'completed' || data.status === 'archived'
        queryClient.setQueryData(['participant-session', effectiveSessionCode], (old) =>
          old
            ? {
                ...old,
                ...(data?.status ? { status: data.status } : {}),
                ...(data?.advanced_active_slot != null
                  ? { advanced_active_slot: data.advanced_active_slot }
                  : {}),
                // Match backend clearParticipantFacingDisplaysOnEnd before settings WS lands.
                ...(ended
                  ? {
                      leaderboard_enabled: false,
                      current_rankings_enabled: false,
                      survey_results_enabled: false,
                    }
                  : {}),
              }
            : old,
        )
      }
      queryClient.invalidateQueries({ queryKey: ['participant-session', effectiveSessionCode] })
      queryClient.invalidateQueries({ queryKey: ['participant-questions', dbSessionId] })
      if (data.status === 'completed' || data.status === 'live') {
        queryClient.invalidateQueries({ queryKey: ['participant-leaderboard', dbSessionId] })
        queryClient.invalidateQueries({ queryKey: ['participant-survey-summary', dbSessionId] })
      }
      if (data.status === 'completed' || data.status === 'archived') {
        freezeAllCountdowns()
        if (!sessionEndedNotifiedRef.current) {
          sessionEndedNotifiedRef.current = true
          playSessionEnded()
          setSessionEndedModal(true)
        }
      }
      if (Array.isArray(data.leaderboard)) {
        setLeaderboard(data.leaderboard)
      }
    })

    const handleReattemptOpened = (data) => {
      const qid = Number(data?.question_id)
      if (!qid) return

      closedNoticeShownRef.current.delete(String(qid))

      closedNoticeShownRef.current.delete(String(qid))
      setAllQuestionsClosedByHost(false)

      const cachedQuestions = queryClient.getQueryData([
        'participant-questions',
        dbSessionId,
        participantToken,
      ])
      const cachedQuestion = Array.isArray(cachedQuestions)
        ? cachedQuestions.find((q) => Number(q.question_id) === qid)
        : null
      const timeLimitSeconds =
        Number(data?.time_limit_seconds) ||
        Number(cachedQuestion?.time_limit_seconds) ||
        0
      const liveActivatedAt = data?.live_activated_at || new Date().toISOString()

      if (dbSessionId) {
        queryClient.setQueryData(
          ['participant-questions', dbSessionId, participantToken],
          (old) => {
          if (!Array.isArray(old)) return old
          return old.map((q) =>
            Number(q.question_id) === qid
              ? {
                  ...q,
                  is_live: true,
                  live_activated_at: liveActivatedAt,
                  open_for_reattempt: true,
                  submissions_closed: false,
                }
              : q,
          )
        })
      }

      unlockQuestionForReattempt(qid, { timeLimitSeconds })
      addUnseenActivatedQuestion(qid)
      setStep('active')
      setLiveQuestionId(qid)
      setSubmitted(false)
      const preview = String(data?.question_text || '').trim()
      setReattemptModal({
        variant: 'info',
        title: 'Question reopened',
        message: preview
          ? `The host has reopened this question for another attempt:\n\n“${preview.slice(0, 120)}${preview.length > 120 ? '…' : ''}”\n\nYour previous answer was cleared. Submit a new response.`
          : 'The host has reopened a question for another attempt. Your previous answer was cleared. Submit a new response.',
        confirmLabel: 'Go to question',
      })
      queryClient.invalidateQueries({ queryKey: ['participant-session', effectiveSessionCode] })
      if (dbSessionId) {
        queryClient.invalidateQueries({ queryKey: ['participant-questions', dbSessionId] })
      }
    }

    const offQuestion = client.on('question_changed', (data) => {
      if (dbSessionId && data?.question_id != null) {
        queryClient.setQueryData(
          ['participant-questions', dbSessionId, participantToken],
          (old) => {
          if (!Array.isArray(old)) return old
          const qid = Number(data.question_id)
          return old.map((q) => {
            if (Number(q.question_id) !== qid) return q
            return {
              ...q,
              is_live: Boolean(data.is_live),
              live_activated_at:
                data.is_live && data.live_activated_at != null
                  ? data.live_activated_at
                  : data.is_live
                    ? q.live_activated_at
                    : null,
              open_for_reattempt:
                data.open_for_reattempt !== undefined
                  ? Boolean(data.open_for_reattempt)
                  : q.open_for_reattempt,
              submissions_closed:
                data.submissions_closed !== undefined
                  ? Boolean(data.submissions_closed)
                  : q.submissions_closed,
            }
          })
        })
      }

      queryClient.invalidateQueries({ queryKey: ['participant-questions', dbSessionId] })

      if (!data.question_id) return

      if (data.is_live) {
        handleHostQuestionActivated(data.question_id)
      } else {
        if (pendingActivatedQuestionIdRef.current === data.question_id) {
          pendingActivatedQuestionIdRef.current = null
        }
        clearUnseenActivatedQuestion(data.question_id)
        setLiveQuestionId((current) => (current === data.question_id ? null : current))
      }
    })

    const offReattempt = client.on(RealtimeEvent.QUESTION_REATTEMPT_OPENED, handleReattemptOpened)

    const offSubmissionsClosed = client.on(
      RealtimeEvent.QUESTION_SUBMISSIONS_CLOSED,
      (data) => {
        const qid = Number(data?.question_id)
        if (!qid) return

        if (dbSessionId) {
          queryClient.setQueryData(
            ['participant-questions', dbSessionId, participantToken],
            (old) => {
            if (!Array.isArray(old)) return old
            return old.map((q) =>
              Number(q.question_id) === qid
                ? { ...q, submissions_closed: true }
                : q,
            )
          })
        }

        const key = String(qid)
        if (!closedNoticeShownRef.current.has(key)) {
          closedNoticeShownRef.current.add(key)
          if (!navigationEnabled) {
            showClosedByHostNotice(data?.question_text)
          }
        }
      },
    )

    const offAllQuestionsClosed = client.on(
      RealtimeEvent.ALL_QUESTIONS_SUBMISSIONS_CLOSED,
      () => {
        if (dbSessionId) {
          queryClient.setQueryData(
            ['participant-questions', dbSessionId, participantToken],
            (old) => {
            if (!Array.isArray(old)) return old
            return old.map((q) =>
              q.is_live === true || q.is_live === 1 || q.is_live === '1'
                ? { ...q, submissions_closed: true }
                : q,
            )
          })
        }
        setAllQuestionsClosedByHost(true)
        if (!allQuestionsClosedNoticeShownRef.current) {
          allQuestionsClosedNoticeShownRef.current = true
          showAllQuestionsClosedNotice()
        }
      },
    )

    const offAnswerReveal = client.on(RealtimeEvent.ANSWER_REVEALED, (data) => {
      const qid = String(data?.question_id ?? '')
      if (!qid) return
      const revealed = Boolean(data.answer_revealed)
      const correctOptionIds = (data.correct_option_ids || []).map(Number)
      const correctMatchingPairs = data.correct_matching_pairs || null
      setAnswerRevealByQuestion((prev) => ({
        ...prev,
        [qid]: {
          revealed,
          correctOptionIds,
          correctMatchingPairs,
        },
      }))
      if (revealed) {
        const state = useParticipantStore.getState()
        const q = activeQuestionsRef.current.find((item) => String(item.id) === qid)
        const response = state.quizResponses?.[qid] || state.quizResponses?.[Number(qid)]
        const submitted = Boolean((state.quizSubmittedQuestionIds || {})[qid])
        const isCorrect =
          submitted && q
            ? isParticipantChoiceCorrect(q, response, {
                revealed: true,
                correctOptionIds,
                correctMatchingPairs,
              })
            : null
        if (isCorrect === true) playAnswerCorrect()
        else if (isCorrect === false) playAnswerWrong()
        else playAnswerReveal()
      }
      queryClient.invalidateQueries({ queryKey: ['participant-questions', dbSessionId] })
    })

    const offResp = client.on('response_received', () => {
      // queryClient.invalidateQueries({ queryKey: ['participant-qa', dbSessionId] }) // Q&A feature disabled
      queryClient.invalidateQueries({ queryKey: ['participant-survey-results'] })
      queryClient.invalidateQueries({ queryKey: ['participant-survey-summary', dbSessionId] })
    })

    const offLeaderboard = client.on(RealtimeEvent.LEADERBOARD_UPDATE, (data) => {
      playLeaderboardUpdate()
      if (Array.isArray(data.leaderboard)) {
        setLeaderboard(data.leaderboard)
      }
      if (data.question_id != null && data.question_leaderboard) {
        setQuestionLeaderboardByQuestion((prev) => ({
          ...prev,
          [String(data.question_id)]: data.question_leaderboard,
        }))
      }
    })

    const offSessionSettings = client.on(RealtimeEvent.SESSION_SETTINGS_UPDATED, (data) => {
      const previousSession = queryClient.getQueryData(['participant-session', effectiveSessionCode])
      const wasLeaderboardEnabled = Boolean(
        previousSession?.leaderboard_enabled || previousSession?.current_rankings_enabled,
      )
      const isLeaderboardEnabled =
        data.leaderboard_enabled !== undefined || data.current_rankings_enabled !== undefined
          ? Boolean(data.leaderboard_enabled) || Boolean(data.current_rankings_enabled)
          : wasLeaderboardEnabled
      const wasSurveyResultsEnabled = Boolean(previousSession?.survey_results_enabled)
      const isSurveyResultsEnabled =
        data.survey_results_enabled !== undefined
          ? Boolean(data.survey_results_enabled)
          : wasSurveyResultsEnabled
      const wasParticipantCountVisible = Boolean(previousSession?.show_participant_count)
      const isParticipantCountVisible =
        data.show_participant_count !== undefined
          ? Boolean(data.show_participant_count)
          : wasParticipantCountVisible

      queryClient.setQueryData(['participant-session', effectiveSessionCode], (old) =>
        old
          ? {
              ...old,
              leaderboard_enabled:
                data.leaderboard_enabled !== undefined
                  ? Boolean(data.leaderboard_enabled)
                  : old.leaderboard_enabled,
              current_rankings_enabled:
                data.current_rankings_enabled !== undefined
                  ? Boolean(data.current_rankings_enabled)
                  : old.current_rankings_enabled,
              survey_results_enabled: isSurveyResultsEnabled,
              show_participant_count: isParticipantCountVisible,
              participants_count: isParticipantCountVisible
                ? old.participants_count
                : null,
              live_participants_count: isParticipantCountVisible
                ? old.live_participants_count
                : null,
              participant_navigation_enabled:
                data.participant_navigation_enabled ?? old.participant_navigation_enabled,
              random_question_order_enabled:
                data.random_question_order_enabled ?? old.random_question_order_enabled,
              allow_late_join:
                data.allow_late_join !== undefined ? data.allow_late_join : old.allow_late_join,
              participant_theme:
                data.participant_theme !== undefined
                  ? normalizeParticipantTheme(data.participant_theme)
                  : old.participant_theme,
            }
          : old,
      )

      if (!wasParticipantCountVisible && isParticipantCountVisible) {
        queryClient.invalidateQueries({ queryKey: ['participant-session', effectiveSessionCode] })
      }

        if (!wasLeaderboardEnabled && isLeaderboardEnabled) {
        playLeaderboardShown()
        setStep((current) => {
          if (current === 'join' || current === 'waiting') return current
          return 'leaderboard'
        })
        queryClient.invalidateQueries({ queryKey: ['participant-leaderboard', dbSessionId] })
        queryClient.invalidateQueries({ queryKey: ['participant-session', effectiveSessionCode] })
      }

      if (wasLeaderboardEnabled && !isLeaderboardEnabled) {
        setStep((current) => (current === 'leaderboard' ? 'active' : current))
      }

      if (!wasSurveyResultsEnabled && isSurveyResultsEnabled) {
        setStep((current) => {
          if (current === 'join' || current === 'waiting') return current
          return 'surveyEnding'
        })
        queryClient.invalidateQueries({ queryKey: ['participant-survey-summary', dbSessionId] })
        queryClient.invalidateQueries({ queryKey: ['participant-session', effectiveSessionCode] })
      }

      if (wasSurveyResultsEnabled && !isSurveyResultsEnabled) {
        setStep((current) => {
          if (current !== 'surveyEnding') return current
          const status = queryClient.getQueryData([
            'participant-session',
            effectiveSessionCode,
          ])?.status
          // Session end clears the toggle — stay on ending for thanks-only UI.
          if (status === 'completed' || status === 'archived') return current
          return 'active'
        })
      }
    })

    const offParticipantPresence = client.on(RealtimeEvent.PARTICIPANT_PRESENCE, (data) => {
      const liveCount = Number(data?.live_participants_count)
      if (!Number.isFinite(liveCount) || liveCount < 0) return
      queryClient.setQueryData(['participant-session', effectiveSessionCode], (old) => {
        if (!old?.show_participant_count) return old
        return {
          ...old,
          live_participants_count: liveCount,
          participants_count: liveCount,
        }
      })
    })

    const offQuestionLbVisibility = client.on(
      RealtimeEvent.QUESTION_LEADERBOARD_VISIBILITY,
      (data) => {
        const qid = String(data?.question_id ?? '')
        if (!qid) return
        setQuestionLbVisibleByQuestion((prev) => ({
          ...prev,
          [qid]: Boolean(data.show_leaderboard),
        }))
        if (data.show_leaderboard) {
          playLeaderboardShown()
        }
        if (!data.show_leaderboard) {
          setQuestionLeaderboardByQuestion((prev) => {
            const next = { ...prev }
            delete next[qid]
            return next
          })
        }
        queryClient.invalidateQueries({ queryKey: ['participant-survey-results'] })
        queryClient.invalidateQueries({ queryKey: ['participant-questions', dbSessionId] })
      },
    )

    client.connect()

    return () => {
      offConnected()
      offIpBlocked()
      offAdminClosed()
      offSession()
      offQuestion()
      offReattempt()
      offSubmissionsClosed()
      offAllQuestionsClosed()
      offAnswerReveal()
      offResp()
      offLeaderboard()
      offSessionSettings()
      offParticipantPresence()
      offQuestionLbVisibility()
      client.disconnect()
    }
  }, [
    client,
    effectiveSessionCode,
    participantToken,
    queryClient,
    dbSessionId,
    unlockQuestionForReattempt,
    setLiveQuestionId,
    handleHostQuestionActivated,
    freezeAllCountdowns,
    showClosedByHostNotice,
    showAllQuestionsClosedNotice,
    navigationEnabled,
  ])

  useEffect(() => {
    if (showOverallLeaderboardTab && dbSessionId) {
      queryClient.invalidateQueries({ queryKey: ['participant-leaderboard', dbSessionId] })
    }
  }, [showOverallLeaderboardTab, dbSessionId, queryClient])

  useEffect(() => {
    if (showSurveyResults && dbSessionId) {
      queryClient.invalidateQueries({ queryKey: ['participant-survey-summary', dbSessionId] })
    }
  }, [showSurveyResults, dbSessionId, queryClient])

  useEffect(() => {
    if (step === 'join' || step === 'waiting') return
    if (showOverallLeaderboardTab && step !== 'leaderboard') {
      setStep('leaderboard')
      return
    }
    if (!showOverallLeaderboardTab && showSurveyEndingScreen && step !== 'surveyEnding') {
      setStep('surveyEnding')
      return
    }
    if (!showOverallLeaderboardTab && !showSurveyEndingScreen) {
      if (step === 'leaderboard' || step === 'surveyEnding') {
        setStep('active')
      }
    }
  }, [showOverallLeaderboardTab, showSurveyEndingScreen, step])

  // Q&A feature disabled — leave any stale 'qa' step
  useEffect(() => {
    if (step === 'qa') setStep('active')
  }, [step])

  useEffect(() => {
    if (!activeQuestions.length) {
      setLiveQuestionId(null)
      setQuestionIndex(0)
      return
    }

    if (!navigationEnabled) {
      const locked = getLockedNavigationQuestion(
        activeQuestions,
        liveQuestionId,
        quizSubmittedQuestionIds,
      )
      if (locked) {
        const idx = activeQuestions.findIndex((q) => q.id === locked.id)
        if (idx !== -1) setQuestionIndex(idx)
        if (liveQuestionId !== locked.id) {
          setLiveQuestionId(locked.id)
        }
      }
      return
    }

    if (randomQuestionOrderEnabled) {
      setQuestionIndex((prev) => clamp(prev, 0, activeQuestions.length - 1))
      return
    }

    if (liveQuestionId) {
      const idx = activeQuestions.findIndex((q) => q.id === liveQuestionId)
      if (idx !== -1) {
        setQuestionIndex(idx)
        return
      }
      setLiveQuestionId(null)
    }

    setQuestionIndex((prev) => clamp(prev, 0, activeQuestions.length - 1))
  }, [
    activeQuestions,
    liveQuestionId,
    navigationEnabled,
    randomQuestionOrderEnabled,
    quizSubmittedQuestionIds,
    setLiveQuestionId,
    setQuestionIndex,
  ])

  useEffect(() => {
    if (navigationEnabled || step !== 'active' || !activeQuestions.length) return
    const submittedIds = quizSubmittedQuestionIds || {}
    const currentId = question?.id
    if (!currentId || !submittedIds[String(currentId)]) return
    if (tryApplyPendingActivatedQuestion()) return
    advanceToNextUnsubmittedActiveQuestion()
  }, [
    navigationEnabled,
    step,
    activeQuestions,
    question?.id,
    quizSubmittedQuestionIds,
    tryApplyPendingActivatedQuestion,
    advanceToNextUnsubmittedActiveQuestion,
  ])

  const displayQuestionIndex = useMemo(() => {
    if (!question?.id || !activeQuestions.length) return 0
    const idx = activeQuestions.findIndex((q) => q.id === question.id)
    return idx !== -1 ? idx : clamp(questionIndex, 0, activeQuestions.length - 1)
  }, [question?.id, activeQuestions, questionIndex])

  const isLastDisplayedQuestion = useMemo(() => {
    if (!navigationEnabled) return true
    return activeQuestions.length > 0 && displayQuestionIndex === activeQuestions.length - 1
  }, [navigationEnabled, activeQuestions.length, displayQuestionIndex])

  const multiNavTimedSession = useMemo(
    () => navigationEnabled && sessionHasTimedQuestions(activeQuestions),
    [navigationEnabled, activeQuestions],
  )

  const lastActivatedLiveQuestion = useMemo(
    () => (multiNavTimedSession ? getLastActivatedLiveQuestion(activeQuestions) : null),
    [multiNavTimedSession, activeQuestions],
  )

  const canShowPreviousQuestion = useMemo(() => {
    if (!navigationEnabled) return false
    if (sessionQuizTotalTimeEnabled) {
      return canShowPreviousForQuizTotalTimeMultiNav(
        mappedQuestions,
        quizExplicitSubmittedQuestionIds,
        sessionTimerExpired,
        allQuestionsClosedByHost,
      )
    }
    if (multiNavTimedSession) {
      return canShowPreviousForTimedMultiNav(
        activeQuestions,
        quizExplicitSubmittedQuestionIds,
      )
    }
    return canShowPreviousForUntimedMultiNav(activeQuestions)
  }, [
    navigationEnabled,
    sessionQuizTotalTimeEnabled,
    sessionTimerExpired,
    allQuestionsClosedByHost,
    mappedQuestions,
    multiNavTimedSession,
    activeQuestions,
    quizExplicitSubmittedQuestionIds,
  ])

  const highlightNextButton = useMemo(() => {
    if (!navigationEnabled || unseenActivatedQuestionIds.size === 0) return false
    const currentId = question?.id
    return activeQuestions.some(
      (q, idx) =>
        unseenActivatedQuestionIds.has(q.id) &&
        q.id !== currentId &&
        idx > displayQuestionIndex,
    )
  }, [
    navigationEnabled,
    unseenActivatedQuestionIds,
    activeQuestions,
    question?.id,
    displayQuestionIndex,
  ])

  const showNewQuestionAlert = useMemo(() => {
    if (!navigationEnabled || unseenActivatedQuestionIds.size === 0) return false
    const currentId = question?.id
    return [...unseenActivatedQuestionIds].some((id) => id !== currentId)
  }, [navigationEnabled, unseenActivatedQuestionIds, question?.id])

  const canSubmitCurrentQuestion = useMemo(() => {
    if (!question?.id) return false
    if ((quizSubmittedQuestionIds || {})[String(question.id)]) return false
    return participantQuestionHasAnswer(question, responses[question.id])
  }, [question, responses, quizSubmittedQuestionIds])

  const hasFinalizePayload = useMemo(
    () =>
      activeQuestions.some((q) =>
        shouldIncludeQuestionInFinalize(
          q,
          quizSubmittedQuestionIds,
          navigationEnabled,
          responses,
          participantEditPolicy,
        ),
      ),
    [activeQuestions, responses, quizSubmittedQuestionIds, navigationEnabled, participantEditPolicy],
  )

  const currentQuestionAnswered = useMemo(
    () => participantQuestionHasAnswer(question, responses[question?.id]),
    [question, responses],
  )

  const canGoToNextQuestion = useMemo(() => {
    if (sessionQuizTotalTimeEnabled) return true
    if (!hasCountdown) return true
    if (questionLockedBySubmission) return true
    if (timer === 0) return true
    return currentQuestionAnswered
  }, [
    sessionQuizTotalTimeEnabled,
    hasCountdown,
    questionLockedBySubmission,
    timer,
    currentQuestionAnswered,
  ])

  const goToQuestionIndex = useCallback(
    (nextIndex) => {
      if (!navigationEnabled || !activeQuestions.length) return
      const n = clamp(nextIndex, 0, activeQuestions.length - 1)
      if (
        !sessionQuizTotalTimeEnabled &&
        hasCountdown &&
        n > displayQuestionIndex &&
        !canGoToNextQuestion
      ) {
        return
      }
      setLiveQuestionId(null)
      setQuestionIndex(n)
    },
    [
      activeQuestions.length,
      sessionQuizTotalTimeEnabled,
      hasCountdown,
      displayQuestionIndex,
      canGoToNextQuestion,
      navigationEnabled,
      setLiveQuestionId,
      setQuestionIndex,
    ],
  )

  useEffect(() => {
    if (isSessionEnded) return
    if (step !== 'active') return
    if (!hasCountdown) return
    const id = setInterval(() => setCountdownTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [isSessionEnded, step, hasCountdown])

  useEffect(() => {
    if (isSessionEnded) return
    if (step !== 'active') return
    if (!sessionQuizTotalTimeEnabled) return
    if (!activeQuestions.length) return
    startQuizSessionCountdown(Number(session?.quiz_total_time_minutes))
  }, [
    isSessionEnded,
    step,
    sessionQuizTotalTimeEnabled,
    activeQuestions.length,
    session?.quiz_total_time_minutes,
    startQuizSessionCountdown,
  ])

  useEffect(() => {
    if (!sessionQuizTotalTimeEnabled || !sessionTimerExpired) return
    freezeQuizSessionCountdown()
  }, [sessionQuizTotalTimeEnabled, sessionTimerExpired, freezeQuizSessionCountdown])

  useEffect(() => {
    if (isSessionEnded) return
    if (step !== 'active' || !question?.id) return
    if (sessionQuizTotalTimeEnabled) return
    if (!hasCountdown) {
      setQuizCountdown({ questionId: null, endsAt: null })
      return
    }
    const qid = question.id
    const s = useParticipantStore.getState()
    const submittedIds = s.quizSubmittedQuestionIds || {}
    const qidStr = String(qid)
    const byQuestion = s.quizCountdownByQuestion || {}
    const existingCountdown = byQuestion[qidStr]
    if (submittedIds[qidStr]) {
      if (!existingCountdown) {
        setQuizCountdown({ questionId: qid, endsAt: Date.now() })
        useParticipantStore.getState().freezeCountdownAfterSubmit(qid)
      }
      return
    }
    if (existingCountdown?.endsAt != null && existingCountdown.endsAt > Date.now()) {
      return
    }
    const endsAt = getCountdownEndsAtForQuestion({
      question,
      strictLateJoin,
    })
    if (endsAt == null) return
    setQuizCountdown({ questionId: qid, endsAt })
  }, [
    isSessionEnded,
    step,
    question,
    hasCountdown,
    timeLimit,
    strictLateJoin,
    setQuizCountdown,
    quizSubmittedQuestionIds,
  ])

  useEffect(() => {
    if (step !== 'active' || !question?.id) return
    markQuestionOpened(question.id)
    clearUnseenActivatedQuestion(question.id)
  }, [step, question?.id, markQuestionOpened, clearUnseenActivatedQuestion])

  useEffect(() => {
    if (!session) return
    if (session.status === 'live' && step === 'waiting') {
      setTransitioningLive(true)
      const id = setTimeout(() => {
        setTransitioningLive(false)
        setStep('active')
      }, 900)
      return () => clearTimeout(id)
    }
  }, [session, step])

  // Q&A feature disabled
  // const approvedQa = useMemo(
  //   () => (qaQuery.data || []).filter((q) => q.moderation_status === 'approved'),
  //   [qaQuery.data],
  // )

  const hasAnyQuestionSaved = useMemo(
    () => Object.keys(quizSubmittedQuestionIds || {}).length > 0,
    [quizSubmittedQuestionIds],
  )

  const leaderboardQuery = useQuery({
    queryKey: ['participant-leaderboard', dbSessionId, participantToken],
    queryFn: () => getSessionLeaderboardApi(participantToken, dbSessionId),
    enabled: Boolean(participantToken && dbSessionId && showOverallLeaderboardTab),
    staleTime: 5000,
  })

  const surveySummaryQuery = useQuery({
    queryKey: ['participant-survey-summary', dbSessionId, participantToken],
    queryFn: () => getParticipantSessionSurveySummaryApi(participantToken, dbSessionId),
    enabled: Boolean(
      participantToken &&
        dbSessionId &&
        showSurveyResults &&
        (hasAnyQuestionSaved ||
          session?.survey_results_enabled ||
          step === 'surveyEnding'),
    ),
    staleTime: 5000,
    retry: (failureCount, error) => {
      // Host just enabled results — short retry window for read-after-write / WS race.
      if (error?.status === 403 && failureCount < 4) return true
      return failureCount < 1
    },
    retryDelay: (attempt) => Math.min(400 * 2 ** attempt, 2500),
    refetchInterval: showSurveyResults ? 8000 : false,
  })

  useEffect(() => {
    if (leaderboardQuery.data != null) {
      setLeaderboard(leaderboardQuery.data)
    }
  }, [leaderboardQuery.data])

  const currentResponse = responses[question?.id] || {}
  const hasSubmittedQuestion = questionLockedBySubmission
  const isAnswerRevealedByHost = Boolean(
    answerRevealByQuestion[String(question?.id)]?.revealed ?? question?.answerRevealed,
  )
  const canSeeAnswerReveal =
    !question?.isSurvey &&
    question?.type !== 'Poll' &&
    question?.isQuizMode !== false &&
    isAnswerRevealedByHost &&
    hasSubmittedQuestion
  const answerRevealMeta = canSeeAnswerReveal
    ? {
        revealed: true,
        correctOptionIds:
          answerRevealByQuestion[String(question?.id)]?.correctOptionIds ??
          question?.correctOptionIds ??
          [],
        correctMatchingPairs:
          answerRevealByQuestion[String(question?.id)]?.correctMatchingPairs ??
          question?.correctMatchingPairs ??
          null,
      }
    : isAnswerRevealedByHost
      ? { revealed: true, correctOptionIds: [], correctMatchingPairs: null }
      : null
  const isAnswerRevealed = isAnswerRevealedByHost
  const participantAnswerIsCorrect = useMemo(() => {
    if (!canSeeAnswerReveal || !question) return null
    return isParticipantChoiceCorrect(question, currentResponse, answerRevealMeta)
  }, [canSeeAnswerReveal, question, currentResponse, answerRevealMeta])
  const currentQuestionLeaderboard = question?.id
    ? questionLeaderboardByQuestion[String(question.id)] || []
    : []
  const isCurrentQuestionLeaderboardVisible = question?.id
    ? Boolean(questionLbVisibleByQuestion[String(question.id)])
    : false
  const showCurrentQuestionLeaderboard =
    !question?.isSurvey &&
    questionSupportsLeaderboard(question) &&
    isCurrentQuestionLeaderboardVisible &&
    step === 'active' &&
    Boolean(questionLockedBySubmission || submitted)

  const showCurrentSurveyResults =
    questionSupportsParticipantResults(question) &&
    isCurrentQuestionLeaderboardVisible &&
    step === 'active' &&
    Boolean(questionLockedBySubmission || submitted)

  const surveyResultsQuery = useQuery({
    queryKey: ['participant-survey-results', question?.id, participantToken],
    queryFn: () => getParticipantSurveyQuestionResultsApi(participantToken, question.id),
    enabled: Boolean(showCurrentSurveyResults && participantToken && question?.id),
    refetchInterval: showCurrentSurveyResults ? 5000 : false,
  })

  const buildFinalPayload = useCallback(() => {
    const { quizCountdownByQuestion: countdowns, quizQuestionOpenedAt: openedAt } =
      useParticipantStore.getState()
    const submittedIds = quizSubmittedQuestionIds || {}
    return activeQuestions
      .filter((q) =>
        shouldIncludeQuestionInFinalize(
          q,
          submittedIds,
          navigationEnabled,
          responses,
          participantEditPolicy,
        ),
      )
      .map((q) => {
        const payload = buildResponsePayloadForQuestion(q, responses[q.id])
        if (!payload) return null
        const responseTimeMs = computeResponseTimeMs(q, countdowns, openedAt)
        if (responseTimeMs != null) {
          payload.response_time_ms = responseTimeMs
        }
        return payload
      })
      .filter(Boolean)
  }, [activeQuestions, responses, quizSubmittedQuestionIds, navigationEnabled, participantEditPolicy])

  const submitQuestionById = useCallback(
    async (questionId) => {
      if (isSessionEnded) return false
      if (!participantToken || !questionId) return false
      const q = activeQuestions.find((item) => item.id === questionId)
      if (!q) return false
      const payload = buildResponsePayloadForQuestion(q, responses[questionId])
      if (!payload) return false
      const alreadySubmitted = Boolean((quizSubmittedQuestionIds || {})[String(questionId)])
      if (
        alreadySubmitted &&
        !participantCanUpdateSubmittedResponse(q, navigationEnabled, participantEditPolicy)
      ) {
        return true
      }

      const responseTimeMs = computeResponseTimeMs(
        q,
        useParticipantStore.getState().quizCountdownByQuestion,
        useParticipantStore.getState().quizQuestionOpenedAt,
      )
      if (responseTimeMs != null) {
        payload.response_time_ms = responseTimeMs
      }

      if (q.submissionsClosed && !q.openForReattempt) {
        setSubmitModal({
          variant: 'error',
          title: 'Question closed',
          message:
            'This question was closed by the host and is no longer accepting submissions.',
          confirmLabel: 'OK',
        })
        return false
      }

      try {
        await submitResponseApi(participantToken, payload)
        markQuestionsSubmitted([questionId])
        if (Number(q.timeLimit) > 0) {
          freezeCountdownAfterSubmit(questionId)
        }
        playSubmitSuccess()
        return true
      } catch (err) {
        const message = err?.message || ''
        if (/closed/i.test(message)) {
          setSubmitModal({
            variant: 'error',
            title: 'Question closed',
            message:
              'This question was closed by the host and is no longer accepting submissions.',
            confirmLabel: 'OK',
          })
        }
        console.error(err)
        return false
      }
    },
    [
      isSessionEnded,
      participantToken,
      activeQuestions,
      responses,
      quizSubmittedQuestionIds,
      markQuestionsSubmitted,
      freezeCountdownAfterSubmit,
      navigationEnabled,
      participantEditPolicy,
    ],
  )

  const handleSubmitResponse = async () => {
    if (isSessionEnded || lastQuestionFinalized) return false
    const payloads = buildFinalPayload()
    if (!payloads.length || !participantToken) return false

    setIsSubmitting(true)
    const hadCountdown = hasCountdown
    try {
      await Promise.all(payloads.map((p) => submitResponseApi(participantToken, p)))
      const submittedIds = payloads.map((p) => p.question_id)
      markQuestionsSubmitted(submittedIds)
      if (
        navigationEnabled &&
        sessionLastQuestionId != null &&
        question?.id != null &&
        Number(question.id) === Number(sessionLastQuestionId)
      ) {
        markQuestionsExplicitlySubmitted([sessionLastQuestionId])
      }
      if (hadCountdown && !sessionQuizTotalTimeEnabled && question?.id) {
        freezeCountdownAfterSubmit(question.id)
      }
      if (
        hadCountdown &&
        sessionQuizTotalTimeEnabled &&
        navigationEnabled &&
        sessionLastQuestionId != null &&
        question?.id != null &&
        Number(question.id) === Number(sessionLastQuestionId)
      ) {
        freezeQuizSessionCountdown()
      }
      if (dbSessionId) {
        queryClient.invalidateQueries({ queryKey: ['participant-leaderboard', dbSessionId] })
      }
      playSubmitSuccess()
      return true
    } catch (err) {
      console.error(err)
      return false
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitCurrentQuestion = async () => {
    if (isSessionEnded || !question?.id) return
    if (
      (submissionsClosed && !question?.openForReattempt) ||
      (navigationEnabled && allQuestionsClosedByHost && !question?.openForReattempt)
    ) {
      if (navigationEnabled && allQuestionsClosedByHost) {
        showAllQuestionsClosedNotice()
      } else {
        showClosedByHostNotice(question.text)
      }
      return
    }
    if ((quizSubmittedQuestionIds || {})[String(question.id)]) {
      const moved = tryApplyPendingActivatedQuestion() || advanceToNextUnsubmittedActiveQuestion()
      if (!moved) {
        setSubmitModal({
          variant: 'success',
          title: 'Already submitted',
          message: 'Please wait for the host to open the next question.',
          confirmLabel: 'OK',
        })
      }
      return
    }
    setIsSubmitting(true)
    try {
      const ok = await submitQuestionById(question.id)
      if (ok) {
        setSubmitted(true)
        const moved =
          tryApplyPendingActivatedQuestion() || advanceToNextUnsubmittedActiveQuestion()
        if (moved) {
          setSubmitted(false)
        }
        setSubmitModal({
          variant: 'success',
          title: 'Submission successful',
          message: moved
            ? 'Your answer was submitted. Continue with the next question when you are ready.'
            : 'Your answer was submitted. Please wait for the host to open the next question.',
          confirmLabel: 'Continue',
        })
      } else {
        setSubmitModal({
          variant: 'error',
          title: 'Submission failed',
          message: 'We could not submit your answer. Check your connection and try again.',
          confirmLabel: 'Try again',
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNext = async () => {
    if (isSessionEnded || !navigationEnabled) return
    if (!question?.id || isLastDisplayedQuestion) return
    const submissionsBlocked =
      (submissionsClosed && !question?.openForReattempt) ||
      (allQuestionsClosedByHost && !question?.openForReattempt)
    if (
      !submissionsBlocked &&
      participantQuestionHasAnswer(question, responses[question.id])
    ) {
      await submitQuestionById(question.id)
    }
    if (tryApplyPendingActivatedQuestion()) {
      setSubmitted(false)
      return
    }
    goToQuestionIndex(displayQuestionIndex + 1)
    setSubmitted(false)
  }

  const handlePrevious = () => {
    if (!navigationEnabled || !canShowPreviousQuestion || displayQuestionIndex <= 0) return
    goToQuestionIndex(displayQuestionIndex - 1)
  }

  const handleSubmit = async () => {
    if (isSessionEnded || lastQuestionFinalized) return
    if (!isLastDisplayedQuestion) return
    const ok = await handleSubmitResponse()
    if (ok) {
      setSubmitModal({
        variant: 'success',
        title: 'Submission successful',
        message:
          'Your answers were submitted successfully. You can review questions, but answers can no longer be changed.',
          // Q&A feature disabled — was: "...or open Q&A..."
        confirmLabel: 'Continue',
      })
    } else {
      setSubmitModal({
        variant: 'error',
        title: 'Submission failed',
        message: 'We could not submit your answers. Check your connection and try again.',
        confirmLabel: 'Try again',
      })
    }
  }

  const handleNextOrSubmit = async () => {
    if (isSessionEnded) return
    if (!navigationEnabled) {
      await handleSubmitCurrentQuestion()
      return
    }
    if (isLastDisplayedQuestion) {
      await handleSubmit()
      return
    }
    await handleNext()
  }

  const handleTimerFinalize = async () => {
    if (!question?.id) return
    if (isLastDisplayedQuestion) {
      await handleSubmitResponse()
      tryApplyPendingActivatedQuestion()
      return
    }
    await handleNext()
  }

  useEffect(() => {
    if (isSessionEnded) return
    if (step !== 'active') return
    if (!hasCountdown) return
    if (timer > 0) return
    if (sessionQuizTotalTimeEnabled) return
    if (questionLockedBySubmission) return

    const qid = question?.id

    if (!navigationEnabled) {
      const timeout = setTimeout(async () => {
        if (qid != null) {
          await submitQuestionById(qid)
        }
        setSubmitted(true)
        if (tryApplyPendingActivatedQuestion()) {
          setSubmitted(false)
        }
      }, 800)
      return () => clearTimeout(timeout)
    }

    const isLast = isLastDisplayedQuestion

    if (!isLast) {
      const nextIdx = displayQuestionIndex + 1
      const timeout = setTimeout(async () => {
        if (qid != null) {
          await submitQuestionById(qid)
        }
        if (tryApplyPendingActivatedQuestion()) return
        setLiveQuestionId(null)
        setQuestionIndex(nextIdx)
      }, 800)

      return () => clearTimeout(timeout)
    }

    if (!questionLockedBySubmission) {
      const timeout = setTimeout(() => {
        handleTimerFinalize()
      }, 500)
      return () => clearTimeout(timeout)
    }
  }, [
    isSessionEnded,
    navigationEnabled,
    timer,
    step,
    displayQuestionIndex,
    activeQuestions.length,
    questionLockedBySubmission,
    hasCountdown,
    question?.id,
    isLastDisplayedQuestion,
    sessionQuizTotalTimeEnabled,
    submitQuestionById,
    tryApplyPendingActivatedQuestion,
    advanceToNextUnsubmittedActiveQuestion,
    setLiveQuestionId,
    setQuestionIndex,
  ])

  const sessionLookupFailed =
    Boolean(effectiveSessionCode) &&
    sessionQuery.isFetched &&
    !sessionQuery.isLoading &&
    (!session || sessionQuery.isError)

  const handleJoin = async (event, options = {}) => {
    event?.preventDefault?.()
    setJoinError('')
    unlockTimerAudio()

    const abortJoin = (message) => {
      setJoinError(message)
      setAutoJoinPending(false)
      setJoinBusy(false)
    }

    if (!effectiveSessionCode) {
      abortJoin('Please enter a session code')
      return
    }

    if (!session) {
      abortJoin('Session not found. Check the code and try again.')
      return
    }

    if (session.join_blocked && session.join_blocked_reason !== 'plan_limit') {
      abortJoin(session.join_blocked_message || 'Session has already started')
      return
    }

    const identity = options.identity || {
      name,
      email,
      mobile,
    }
    const formName = String(identity.name || '').trim()
    const formEmail = String(identity.email || '').trim()
    const formMobile = String(identity.mobile || '').trim()
    const skipOtpRequirement = Boolean(options.skipOtp)

    try {
      let nickname = null
      let checkEmail = null
      let checkMobile = null
      let isAnonymous = false
      const needsContactOtp =
        !skipOtpRequirement &&
        sessionJoinOtpRequired &&
        contactJoinTypes.has(joinRequirement)

      if (joinRequirement === 'anonymous') {
        isAnonymous = true
      } else if (joinRequirement === 'name') {
        if (!formName) {
          abortJoin('Please enter your name')
          return
        }
        nickname = formName
      } else if (joinRequirement === 'name_email') {
        if (!formName) {
          abortJoin('Please enter your name')
          return
        }
        if (!formEmail) {
          abortJoin('Please enter your email')
          return
        }
        nickname = formName
        checkEmail = formEmail
      } else if (joinRequirement === 'name_mobile') {
        if (!formName) {
          abortJoin('Please enter your name')
          return
        }
        if (!formMobile) {
          abortJoin('Please enter your mobile number')
          return
        }
        nickname = formName
        checkMobile = formMobile
      } else if (joinRequirement === 'name_email_mobile') {
        if (!formName) {
          abortJoin('Please enter your name')
          return
        }
        if (!formEmail) {
          abortJoin('Please enter your email')
          return
        }
        if (!formMobile) {
          abortJoin('Please enter your mobile number')
          return
        }
        nickname = formName
        checkEmail = formEmail
        checkMobile = formMobile
      } else {
        abortJoin('Unsupported join requirement for this session')
        return
      }

      let otpToken = null
      if (needsContactOtp) {
        const channel =
          joinRequirement === 'name_mobile'
            ? 'mobile'
            : joinRequirement === 'name_email'
              ? 'email'
              : otpChannel
        if (!otpSent) {
          abortJoin('Send a verification code first')
          return
        }
        if (!/^\d{6}$/.test(String(otpCode || '').trim())) {
          abortJoin('Enter the 6-digit verification code')
          return
        }
        setJoinBusy(true)
        const verified = await verifySessionJoinOtpApi(effectiveSessionCode, {
          nickname,
          email: checkEmail,
          mobile: checkMobile,
          channel,
          code: otpCode.trim(),
        })
        otpToken = verified.otpToken
        if (!otpToken) {
          abortJoin('Verification failed. Please try again.')
          return
        }
      } else {
        setJoinBusy(true)
      }

      const joinPayload = {
        email: checkEmail,
        mobile: checkMobile,
        is_anonymous: isAnonymous,
      }
      if (nickname) joinPayload.nickname = nickname
      if (otpToken) joinPayload.otp_token = otpToken
      const signedJoinToken =
        options.joinIdentityToken || joinIdentityTokenRef.current || ''
      if (signedJoinToken) joinPayload.join_identity_token = signedJoinToken

      const result = await joinSessionApi(effectiveSessionCode, joinPayload)
      if (result.isReturning && result.sessionState) {
        hydrateQuizProgress(result.sessionState)
      } else {
        resetQuizProgress()
      }
      setParticipant({
        token: result.token,
        refreshToken: result.refreshToken,
        participant: {
          name: result.participant.nickname || 'Anonymous',
          email: result.participant.email,
          mobile: result.participant.mobile,
          anonymous: result.participant.is_anonymous,
        },
        sessionCode: effectiveSessionCode,
      })
      if (session.status === 'completed' || session.status === 'archived') {
        setStep('active')
      } else if (session.status === 'live' || session.status === 'paused') {
        setStep('active')
      } else {
        setStep('waiting')
      }
      setJoinError('')
      setAutoJoinPending(false)
      playJoinedSession()
    } catch (err) {
      setJoinError(err.message || 'Failed to join session')
      setAutoJoinPending(false)
    } finally {
      setJoinBusy(false)
    }
  }

  useEffect(() => {
    if (autoJoinAttemptedRef.current) return
    if (!participantHydrated) return
    if (canUseStoredJoin || participantToken) return
    if (step !== 'join') return
    if (!session || sessionQuery.isLoading) return
    if (tokenIdentityLoading) return
    if (tokenIdentityError) return
    if (!isSessionOpenForNewJoin(session.status)) return
    if (session.join_blocked && session.join_blocked_reason !== 'plan_limit') return
    if (!canAutoJoinWithIdentity(session, resolvedIdentity)) return

    autoJoinAttemptedRef.current = true
    setAutoJoinPending(true)
    void handleJoin(null, {
      identity: resolvedIdentity,
      joinIdentityToken: joinIdentityTokenRef.current || undefined,
    })
    // Intentional: run once when session + query identity become eligible.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- auto-join bootstrap
  }, [
    participantHydrated,
    canUseStoredJoin,
    participantToken,
    step,
    session,
    sessionQuery.isLoading,
    tokenIdentityLoading,
    tokenIdentityError,
    resolvedIdentity,
  ])

  const handleSendJoinOtp = async () => {
    setJoinError('')
    if (!effectiveSessionCode || !session) {
      setJoinError('Session not found. Check the code and try again.')
      return
    }

    try {
      if (!name?.trim()) {
        setJoinError('Please enter your name')
        return
      }
      if (
        (joinRequirement === 'name_email' || joinRequirement === 'name_email_mobile') &&
        !email?.trim()
      ) {
        setJoinError('Please enter your email')
        return
      }
      if (
        (joinRequirement === 'name_mobile' || joinRequirement === 'name_email_mobile') &&
        !mobile?.trim()
      ) {
        setJoinError('Please enter your mobile number')
        return
      }

      const channel =
        joinRequirement === 'name_mobile'
          ? 'mobile'
          : joinRequirement === 'name_email'
            ? 'email'
            : otpChannel

      setOtpBusy(true)
      await sendSessionJoinOtpApi(effectiveSessionCode, {
        nickname: name.trim(),
        email: email?.trim() || undefined,
        mobile: mobile?.trim() || undefined,
        channel,
      })
      setOtpSent(true)
      setOtpCode('')
    } catch (err) {
      setJoinError(err.message || 'Failed to send verification code')
    } finally {
      setOtpBusy(false)
    }
  }

  // Q&A feature disabled — re-enable when bringing Q&A back
  // const allowAnonymousQa = session?.allow_anonymous_qa || false
  //
  // const handleAskQuestion = async () => {
  //   if (!dbSessionId || !askText.trim() || !participantToken) return
  //
  //   try {
  //     const newQ = await askQaQuestionApi(participantToken, dbSessionId, {
  //       question_text: askText.trim(),
  //       is_anonymous: allowAnonymousQa ? askAnonymous : false,
  //     })
  //     if (newQ) {
  //       setOwnQuestions((prev) => [
  //         { id: newQ.qa_question_id, text: newQ.question_text, status: newQ.moderation_status },
  //         ...prev,
  //       ])
  //     }
  //     setAskText('')
  //     setAskAnonymous(false)
  //   } catch (err) {
  //     console.error('Failed to ask question:', err)
  //   }
  // }

  // const handleUpvote = async (qaId) => {
  //   if (!participantToken) return
  //   try {
  //     await upvoteQaApi(participantToken, qaId)
  //     setUpvotes((prev) => ({ ...prev, [qaId]: (prev[qaId] || 0) + 1 }))
  //   } catch (err) {
  //     console.error('Failed to upvote:', err)
  //   }
  // }

  const updateResponse = useCallback(
    (questionId, patch) => {
      if (!canEditResponses) return
      setResponses((prev) => ({
        ...prev,
        [questionId]: { ...prev[questionId], ...patch },
      }))
    },
    [canEditResponses, setResponses],
  )

  const handleSelectOption = useCallback(
    (questionId, optionText) => {
      if (!canEditResponses) return
      const q = activeQuestions.find((item) => item.id === questionId)
      if (!q) return
      playPickAnswer()
      if (q.allowMultipleSelect) {
        setResponses((prev) => {
          const current = prev[questionId] || {}
          const list = Array.isArray(current.selectedOptions) ? [...current.selectedOptions] : []
          const idx = list.indexOf(optionText)
          if (idx >= 0) list.splice(idx, 1)
          else list.push(optionText)
          return {
            ...prev,
            [questionId]: {
              ...current,
              selectedOptions: list,
              selectedOption: list[0] || '',
            },
          }
        })
        return
      }
      updateResponse(questionId, { selectedOption: optionText, selectedOptions: [optionText] })
    },
    [canEditResponses, activeQuestions, setResponses, updateResponse],
  )

  const handleToggleEmojiOption = useCallback(
    (questionId, emoji) => {
      if (!canEditResponses) return
      const q = activeQuestions.find((item) => item.id === questionId)
      if (!q || q.type !== 'Emoji Reaction') return
      playPickAnswer()
      setResponses((prev) => {
        const current = prev[questionId] || {}
        const selected = String(current.selectedOption || '').trim()
        const nextSelected = selected === emoji ? '' : emoji
        return {
          ...prev,
          [questionId]: {
            ...current,
            selectedOption: nextSelected,
            selectedOptions: nextSelected ? [nextSelected] : [],
          },
        }
      })
    },
    [canEditResponses, activeQuestions, setResponses],
  )

  const handleAddWordCloudTag = useCallback(
    (questionId) => {
      if (!canEditResponses) return
      if (
        String(questionId) === String(question?.id) &&
        wordCloudInputsLocked
      ) {
        return
      }
      const t = tagsInput.trim()
      if (!t) return
      playPickAnswer()
      setResponses((prev) => ({
        ...prev,
        [questionId]: {
          ...prev[questionId],
          tags: [...(prev[questionId]?.tags || []), t].slice(0, 10),
        },
      }))
      setTagsInput('')
    },
    [canEditResponses, question?.id, wordCloudInputsLocked, tagsInput, setResponses],
  )

  const handleLeaveInactiveSession = useCallback(() => {
    useParticipantStore.getState().clearParticipant()
    setStep('join')
  }, [])

  const participantTheme = normalizeParticipantTheme(session?.participant_theme)

  if (!participantHydrated) {
    return (
      <PageCenteredShell compact={embedMode} theme={participantTheme}>
        <p className="text-slate-600">Restoring session...</p>
      </PageCenteredShell>
    )
  }

  if (ipBlocked) {
    return (
      <PageCenteredShell compact={embedMode} theme={participantTheme}>
        <h1 className="text-2xl font-bold text-navy-900">Access blocked</h1>
        <p className="mt-2 text-slate-600">
          This IP address has been blocked by an administrator. You cannot join or stay in this
          session from this network.
        </p>
      </PageCenteredShell>
    )
  }

  const showJoinForm = !canUseStoredJoin && step === 'join'
  const showSessionNotLive =
    showJoinForm &&
    Boolean(session) &&
    !isSessionOpenForNewJoin(session.status)

  if (showJoinForm && (autoJoinPending || tokenIdentityLoading) && !joinError && !tokenIdentityError) {
    return (
      <PageCenteredShell compact={embedMode} theme={participantTheme}>
        <p className="text-sm font-semibold text-navy-900">
          {tokenIdentityLoading ? 'Checking signed join link…' : 'Joining session…'}
        </p>
        <p className="mt-2 text-sm text-slate-600">
          Using your name and contact details from the link.
        </p>
      </PageCenteredShell>
    )
  }

  const handleUseDifferentSessionCode = () => {
    setSessionCodeInput('')
    setJoinError('')
    queryClient.removeQueries({ queryKey: ['participant-session', effectiveSessionCode] })
  }

  if (showSessionNotLive) {
    return (
      <SessionNotLiveView
        session={session}
        hasSessionCodeInUrl={hasSessionCodeInUrl}
        isRefreshing={sessionQuery.isFetching}
        onUseDifferentCode={hasSessionCodeInUrl ? undefined : handleUseDifferentSessionCode}
      />
    )
  }

  if (showJoinForm) {
    const joinBlocked = Boolean(session?.join_blocked)
    const joinBlockedMessage =
      session?.join_blocked_message || 'Session has already started'

    return (
      <JoinFormView
        hasSessionCodeInUrl={hasSessionCodeInUrl}
        sessionCodeInput={sessionCodeInput}
        onSessionCodeChange={setSessionCodeInput}
        sessionLookupFailed={sessionLookupFailed}
        effectiveSessionCode={effectiveSessionCode}
        sessionQueryLoading={sessionQuery.isLoading}
        showJoinDetails={Boolean(session)}
        session={session}
        joinRequirement={joinRequirement}
        name={name}
        onNameChange={setName}
        email={email}
        onEmailChange={setEmail}
        mobile={mobile}
        onMobileChange={setMobile}
        otpEnabled={needsContactOtp}
        otpChannel={otpChannel}
        onOtpChannelChange={setOtpChannel}
        otpCode={otpCode}
        onOtpCodeChange={setOtpCode}
        otpSent={otpSent}
        otpBusy={otpBusy}
        joinBusy={joinBusy}
        onSendOtp={handleSendJoinOtp}
        joinError={joinError || tokenIdentityError}
        joinBlocked={joinBlocked}
        joinBlockedMessage={joinBlockedMessage}
        joinBlockedReason={session?.join_blocked_reason || ''}
        onSubmit={handleJoin}
      />
    )
  }

  if (effectiveSessionCode && sessionQuery.isLoading) {
    return (
      <PageCenteredShell compact={embedMode} theme={participantTheme}>
        <p className="text-slate-600">Loading session...</p>
      </PageCenteredShell>
    )
  }

  if (effectiveSessionCode && sessionLookupFailed) {
    return (
      <PageCenteredShell compact={embedMode} theme={participantTheme}>
        <h1 className="text-2xl font-bold text-navy-900">Session not found</h1>
        <p className="mt-2 text-slate-600">The join link is invalid or this session was removed.</p>
      </PageCenteredShell>
    )
  }

  if (!session) {
    return (
      <PageCenteredShell compact={embedMode} theme={participantTheme}>
        <p className="text-slate-600">Loading session...</p>
      </PageCenteredShell>
    )
  }

  const inactivityModal = (
    <ParticipantSessionInactivityModal
      enabled={Boolean(participantToken)}
      session={session}
      participantToken={participantToken}
      sessionQueryKey={['participant-session', effectiveSessionCode]}
      onLeave={handleLeaveInactiveSession}
    />
  )

  if (step === 'waiting') {
    return (
      <>
        <WaitingView session={session} transitioningLive={transitioningLive} />
        {inactivityModal}
      </>
    )
  }

  return (
    <main
      className={`participant-session-bg ${
        embedMode
          ? 'min-h-dvh overflow-y-auto p-3 sm:p-4'
          : 'min-h-dvh p-4 md:min-h-screen md:p-6'
      }`}
      data-participant-theme={participantTheme}
    >
      <div className="mx-auto w-full max-w-4xl space-y-4">
        <SessionHeader session={session} joinedUser={joinedUser} />

        {isSessionEnded && endingScreenOnlyMode ? <SessionEndedBanner /> : null}

        {showOverallLeaderboardTab ? (
          <OverallLeaderboardPanel
            leaderboard={leaderboard}
            sessionStatus={session?.status}
            isLoading={leaderboardQuery.isLoading}
            title={rankingsTitle}
          />
        ) : showSurveyEndingScreen ? (
          <SurveySessionEndingPanel
            sessionTitle={session.title}
            summary={showSurveyResults ? surveySummaryQuery.data : null}
            isLoading={showSurveyResults ? surveySummaryQuery.isLoading : false}
            thanksOnly={showSurveyThanks}
            error={
              showSurveyResults && surveySummaryQuery.isError
                ? surveySummaryQuery.error?.message || 'Unable to load survey results.'
                : ''
            }
          />
        ) : (
          <>
            {step === 'active' && isSessionEnded ? <SessionEndedPanel /> : null}

            {step === 'active' && !question && !isSessionEnded && <WaitingForQuestion />}


            {step === 'active' && question && !isSessionEnded && (
              <ActiveQuestionPanel
            question={question}
            activeQuestions={activeQuestions}
            displayQuestionIndex={displayQuestionIndex}
            hasCountdown={hasCountdown}
            canGoToNextQuestion={canGoToNextQuestion}
            inputsLocked={inputsLocked}
            wordCloudInputsLocked={wordCloudInputsLocked}
            submissionsClosed={submissionsClosed}
            allQuestionsClosedByHost={allQuestionsClosedByHost}
            hasAnyQuestionSaved={hasAnyQuestionSaved}
            timeLimit={displayTimeLimit}
            timer={timer}
            submittedAtSeconds={submittedAtSeconds}
            sessionQuizTotalTimeEnabled={sessionQuizTotalTimeEnabled}
            lastQuestionFinalized={lastQuestionFinalized}
            currentResponse={currentResponse}
            answerRevealMeta={answerRevealMeta}
            isAnswerRevealed={isAnswerRevealed}
            hasSubmittedQuestion={hasSubmittedQuestion}
            canSeeAnswerReveal={canSeeAnswerReveal}
            participantAnswerIsCorrect={participantAnswerIsCorrect}
            sessionEnded={isSessionEnded}
            tagsInput={tagsInput}
            submitted={submitted}
            navigationEnabled={navigationEnabled}
            canShowPreviousQuestion={canShowPreviousQuestion}
            lastActivatedLiveQuestion={lastActivatedLiveQuestion}
            highlightNextButton={highlightNextButton}
            showNewQuestionAlert={showNewQuestionAlert}
            isLastDisplayedQuestion={isLastDisplayedQuestion}
            isSubmitting={isSubmitting}
            hasFinalizePayload={navigationEnabled ? hasFinalizePayload : canSubmitCurrentQuestion}
            showCurrentQuestionLeaderboard={showCurrentQuestionLeaderboard}
            currentQuestionLeaderboard={currentQuestionLeaderboard}
            showCurrentSurveyResults={showCurrentSurveyResults}
            surveyResults={surveyResultsQuery.data}
            surveyResultsLoading={surveyResultsQuery.isLoading}
            onTagsInputChange={setTagsInput}
            onAddTag={handleAddWordCloudTag}
            onSelectOption={handleSelectOption}
            onToggleEmojiOption={handleToggleEmojiOption}
            onSelectRating={(questionId, rating) => {
              playPickAnswer()
              updateResponse(questionId, { rating })
            }}
            onTextChange={(questionId, text) => updateResponse(questionId, { textResponse: text })}
            onRankingChange={(questionId, rankingOrder) => {
              playPickAnswer()
              updateResponse(questionId, { rankingOrder })
            }}
            onMatchingChange={(questionId, matchingPairs) => {
              playPickAnswer()
              updateResponse(questionId, { matchingPairs })
            }}
            onPrevious={handlePrevious}
            onNextOrSubmit={handleNextOrSubmit}
            // onGoToQa={() => setStep('qa')} // Q&A feature disabled
          />
            )}

            {/* Q&A feature disabled — re-enable when bringing Q&A back
            {step === 'qa' && (
              <QaPanel
                askText={askText}
                onAskTextChange={setAskText}
                allowAnonymousQa={allowAnonymousQa}
                askAnonymous={askAnonymous}
                onAskAnonymousChange={setAskAnonymous}
                onAskQuestion={handleAskQuestion}
                ownQuestions={ownQuestions}
                approvedQa={approvedQa}
                upvotes={upvotes}
                onUpvote={handleUpvote}
              />
            )}
            */}
          </>
        )}
      </div>

      <ParticipantAlertModal
        open={Boolean(submitModal)}
        variant={submitModal?.variant ?? 'success'}
        title={submitModal?.title ?? ''}
        message={submitModal?.message ?? ''}
        confirmLabel={submitModal?.confirmLabel ?? 'Continue'}
        onClose={() => setSubmitModal(null)}
      />

      <ParticipantAlertModal
        open={Boolean(reattemptModal)}
        variant={reattemptModal?.variant ?? 'info'}
        title={reattemptModal?.title ?? 'Question reopened'}
        message={reattemptModal?.message ?? ''}
        confirmLabel={reattemptModal?.confirmLabel ?? 'Go to question'}
        onClose={() => setReattemptModal(null)}
      />

      <ParticipantAlertModal
        open={Boolean(closedByHostModal)}
        variant={closedByHostModal?.variant ?? 'info'}
        title={closedByHostModal?.title ?? 'Question closed'}
        message={closedByHostModal?.message ?? ''}
        confirmLabel={closedByHostModal?.confirmLabel ?? 'OK'}
        onClose={() => setClosedByHostModal(null)}
      />

      <ParticipantAlertModal
        open={Boolean(allQuestionsClosedModal)}
        variant={allQuestionsClosedModal?.variant ?? 'info'}
        title={allQuestionsClosedModal?.title ?? 'All questions closed'}
        message={allQuestionsClosedModal?.message ?? ''}
        confirmLabel={allQuestionsClosedModal?.confirmLabel ?? 'OK'}
        onClose={() => setAllQuestionsClosedModal(null)}
      />

      <ParticipantAlertModal
        open={sessionEndedModal}
        variant="info"
        title="Session ended"
        message="The host has ended this session. Thank you for participating!"
        confirmLabel="OK"
        onClose={() => setSessionEndedModal(false)}
      />

      {inactivityModal}

    </main>
  )
}

export default ParticipantSessionPage
