import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Layers,
  LogOut,
  Play,
  Rocket,
  Square,
  Timer,
} from 'lucide-react'
import { HostQuestionActionButton } from '../../components/live/HostQuestionActionButton'
import { HostQuestionControls } from '../../components/live/HostQuestionControls'
import { QuestionMedia } from '../../components/participant-session/QuestionMedia'
import { useHostQuestionMutations } from '../../hooks/useHostQuestionMutations'
import { useLiveSession } from '../../hooks/useLiveSession'
import { getPresentSlideApi, getQuestionResultsApi, setPresentSlideApi } from '../../services/liveApi'
import { transitionSessionApi } from '../../services/dashboardApi'
import { lookupSessionByCodeApi } from '../../services/embedApi'
import { useAuthStore } from '../../store/authStore'
import {
  canHostActivateAllQuestions,
  canHostCloseAllQuestions,
  sessionRequiresActivateAllQuestions,
} from '../../utils/hostQuestionControls'
import { isSessionQuizTotalTimeEnabled } from '../../utils/sessionFlags'
import {
  getQuestionDeadlineMs,
  getQuizTotalRemainingSeconds,
  getRemainingQuestionSeconds,
} from '../../utils/questionTimer'
import {
  buildOptionChartData,
  buildRatingChartData,
  getPresentOptionColor,
  getDistributedPresentMode,
  getQuestionChartRawType,
  questionUsesOptionChart,
  sessionSupportsOverallLeaderboard,
  sessionSupportsSurveyEndingScreen,
  sessionUsesQuestionSets,
} from '../../utils/livePresentation'

function formatCountdown(totalSeconds) {
  const safe = Math.max(0, Math.floor(Number(totalSeconds) || 0))
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function timerChipClass(remainingSeconds) {
  if (remainingSeconds <= 0) return 'border-rose-300 bg-rose-50 text-rose-800'
  if (remainingSeconds < 10) return 'border-amber-300 bg-amber-50 text-amber-900'
  return 'border-sky-200 bg-sky-50 text-sky-900'
}

function EmbedTimerChip({ label, remainingSeconds }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold tabular-nums ${timerChipClass(remainingSeconds)}`}
      title={`${label} remaining`}
    >
      <Timer className="size-3 shrink-0" aria-hidden />
      <span className="font-semibold uppercase tracking-wide opacity-80">{label}</span>
      <span>{formatCountdown(remainingSeconds)}</span>
    </span>
  )
}

/** Collapsed by default so Zoom’s narrow panel keeps response bars / actions visible. */
function EmbedQuestionMediaToggle({ media }) {
  const [open, setOpen] = useState(false)
  const mediaKey = media?.url || ''

  useEffect(() => {
    setOpen(false)
  }, [mediaKey])

  if (!media?.url) return null

  return (
    <div className="mb-2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="inline-flex h-7 items-center gap-1 rounded-lg border border-blue-200 bg-white px-2 text-[10px] font-semibold uppercase tracking-wide text-navy-800 transition hover:bg-blue-50"
      >
        <ImageIcon className="size-3 shrink-0" aria-hidden />
        {open ? 'Hide media' : 'Show media'}
      </button>
      {open ? (
        <div className="mt-1.5 overflow-hidden rounded-lg border border-blue-100 bg-slate-50/80 p-1.5">
          <QuestionMedia media={media} maxHeightClass="max-h-28" className="rounded-md" />
        </div>
      ) : null}
    </div>
  )
}

/** Same deck shape as Present mode so Zoom/embed Next lands on real question slides. */
function buildEmbedSlides(mappedQuestions, distributedPresentMode) {
  const list = [{ type: 'participants', label: 'Lobby' }]
  if (distributedPresentMode) {
    list.push({
      type: 'distributedQuiz',
      distributedMode: distributedPresentMode,
      label: 'Distributed quiz',
    })
  } else {
    mappedQuestions.forEach((question, index) => {
      list.push({
        type: 'question',
        question,
        questionNumber: index + 1,
        label: `Question ${index + 1}`,
      })
    })
  }
  if (sessionSupportsOverallLeaderboard(mappedQuestions)) {
    list.push({ type: 'leaderboard', label: 'Rankings' })
    list.push({ type: 'podium', label: 'Podium' })
  } else if (sessionSupportsSurveyEndingScreen(mappedQuestions)) {
    list.push({ type: 'surveyEnding', label: 'Survey ending' })
  }
  return list
}

/**
 * Compact host console for the narrow side panels that PowerPoint, Teams, and Zoom give add-ins.
 * It signs in inside the frame because browsers keep iframe storage separate from the main tab,
 * so an existing dashboard login is not visible here.
 */
export function EmbedShell({ children }) {
  return (
    <div className="min-h-dvh bg-slate-50 px-3 py-3 text-slate-800">
      <div className="mx-auto max-w-md space-y-3">{children}</div>
    </div>
  )
}

export function InFrameSignIn({ bare = false }) {
  const login = useAuthStore((state) => state.login)
  const isLoading = useAuthStore((state) => state.isLoading)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    try {
      await login({ email, password, rememberMe: true })
    } catch (err) {
      setError(err?.message || 'Sign in failed')
    }
  }

  const card = (
    <div className="rounded-xl border border-blue-200/70 bg-white p-4 shadow-sm">
      <h1 className="text-base font-bold text-navy-900">Sign in to control the session</h1>
      <p className="mt-1 text-xs leading-relaxed text-slate-600">
        This panel runs in its own sandbox, so it needs a separate sign in from your browser tab.
      </p>
      <form className="mt-3 space-y-2" onSubmit={submit}>
        <input
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Work email"
          className="h-10 w-full rounded-lg border border-blue-200 bg-white px-3 text-sm outline-none focus:border-sky-400"
        />
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          className="h-10 w-full rounded-lg border border-blue-200 bg-white px-3 text-sm outline-none focus:border-sky-400"
        />
        {error ? <p className="text-xs font-semibold text-red-700">{error}</p> : null}
        <button
          type="submit"
          disabled={isLoading}
          className="h-10 w-full rounded-lg bg-navy-800 text-sm font-semibold text-white transition hover:bg-navy-900 disabled:opacity-60"
        >
          {isLoading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )

  if (bare) return card
  return <EmbedShell>{card}</EmbedShell>
}

export function SessionCodePrompt({ onResolved, bare = false, initialCode = '' }) {
  const [code, setCode] = useState(() => String(initialCode || '').trim().toUpperCase())
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const next = String(initialCode || '').trim().toUpperCase()
    if (next) setCode(next)
  }, [initialCode])

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const session = await lookupSessionByCodeApi(code.trim().toUpperCase())
      if (!session?.session_id) throw new Error('Session code not found')
      onResolved(String(session.session_id))
    } catch (err) {
      setError(err?.message || 'Session code not found')
    } finally {
      setBusy(false)
    }
  }

  const form = (
    <form
      onSubmit={submit}
      className="rounded-xl border border-blue-200/70 bg-white p-4 shadow-sm"
    >
      <h1 className="text-base font-bold text-navy-900">Pick a session</h1>
      <p className="mt-1 text-xs leading-relaxed text-slate-600">
        Enter the 6-character session code shown on your dashboard.
      </p>
      <input
        value={code}
        onChange={(event) => setCode(event.target.value)}
        placeholder="ABC123"
        maxLength={6}
        className="mt-3 h-10 w-full rounded-lg border border-blue-200 bg-white px-3 font-mono text-sm font-semibold uppercase tracking-widest outline-none focus:border-sky-400"
      />
      {error ? <p className="mt-2 text-xs font-semibold text-red-700">{error}</p> : null}
      <button
        type="submit"
        disabled={busy || code.trim().length < 4}
        className="mt-3 h-10 w-full rounded-lg bg-navy-800 text-sm font-semibold text-white transition hover:bg-navy-900 disabled:opacity-60"
      >
        {busy ? 'Looking up…' : 'Continue'}
      </button>
    </form>
  )

  if (bare) return form
  return <EmbedShell>{form}</EmbedShell>
}

export function EmbedControls({ sessionId, bare = false }) {
  const accessToken = useAuthStore((state) => state.accessToken)
  const logout = useAuthStore((state) => state.logout)
  const queryClient = useQueryClient()
  const [error, setError] = useState('')

  const { session, mappedQuestions, participants, responses, isLoading, isError } = useLiveSession(
    accessToken,
    sessionId,
  )

  const distributedPresentMode = useMemo(
    () => getDistributedPresentMode(session, mappedQuestions),
    [session, mappedQuestions],
  )
  const slides = useMemo(
    () => buildEmbedSlides(mappedQuestions, distributedPresentMode),
    [mappedQuestions, distributedPresentMode],
  )
  const slideTotal = Math.max(1, slides.length)

  const slideQuery = useQuery({
    queryKey: ['embed-controls-slide', sessionId],
    queryFn: () => getPresentSlideApi(accessToken, sessionId),
    // Only poll once the host can actually load the session (avoids 403 spam).
    enabled: Boolean(accessToken && sessionId && session),
    refetchInterval: 4000,
    retry: (count, err) => (err?.status === 403 || err?.status === 401 ? false : count < 2),
  })

  const slideMutation = useMutation({
    mutationFn: ({ slideIndex, slideType }) =>
      setPresentSlideApi(accessToken, sessionId, {
        slideIndex,
        slideTotal,
        slideType: slideType || null,
      }),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(['embed-controls-slide', sessionId], {
        slide_index: variables.slideIndex,
        slide_type: variables.slideType || null,
        ...(data && typeof data === 'object' ? data : {}),
      })
      queryClient.invalidateQueries({ queryKey: ['embed-controls-slide', sessionId] })
    },
    onError: (err) => setError(err?.message || 'Could not change the slide'),
  })

  const lifecycleMutation = useMutation({
    mutationFn: (action) => transitionSessionApi(accessToken, sessionId, action),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['live-session', sessionId] }),
    onError: (err) => setError(err?.message || 'Could not update the session'),
  })

  const onMutationError = useCallback((message) => setError(message), [])
  const questionMutations = useHostQuestionMutations(accessToken, sessionId, { onMutationError })

  const rawSlideIndex = Number(slideQuery.data?.slide_index)
  const slideIndex = Number.isFinite(rawSlideIndex)
    ? Math.min(Math.max(0, rawSlideIndex), slideTotal - 1)
    : 0
  const currentSlide = slides[slideIndex] || slides[0] || null
  const isLive = session?.status === 'live'
  const canEditLive = isLive
  const singleActiveQuestionMode = session?.participant_navigation_enabled === false
  const sessionQuizTotalTimeEnabled = isSessionQuizTotalTimeEnabled(session)
  const disableSingleActivation = useMemo(
    () => sessionRequiresActivateAllQuestions(session, mappedQuestions, sessionUsesQuestionSets),
    [session, mappedQuestions],
  )
  const showActivateAllQuestions = useMemo(
    () =>
      canHostActivateAllQuestions(mappedQuestions, {
        canEditLive,
        singleActiveQuestionMode,
      }) || (canEditLive && disableSingleActivation),
    [canEditLive, disableSingleActivation, mappedQuestions, singleActiveQuestionMode],
  )
  const showCloseAllQuestions = useMemo(
    () =>
      canHostCloseAllQuestions(mappedQuestions, {
        canEditLive,
        singleActiveQuestionMode,
      }),
    [canEditLive, mappedQuestions, singleActiveQuestionMode],
  )

  // Drive "current question" from the present slide — not only the live flag.
  // Old Zoom Next only bumped slide_index while this panel always showed the live/first question.
  const activeQuestion = useMemo(() => {
    if (currentSlide?.type === 'question' && currentSlide.question) return currentSlide.question
    return mappedQuestions.find((question) => question.isLive) || mappedQuestions[0] || null
  }, [currentSlide, mappedQuestions])

  const chartRawType = activeQuestion ? getQuestionChartRawType(activeQuestion) : null
  const currentResponses = useMemo(
    () =>
      (responses || []).filter(
        (row) => Number(row.question_id) === Number(activeQuestion?.id),
      ),
    [responses, activeQuestion?.id],
  )

  const questionResultsQuery = useQuery({
    queryKey: ['embed-question-results', activeQuestion?.id],
    queryFn: () => getQuestionResultsApi(accessToken, activeQuestion.id),
    enabled: Boolean(accessToken && activeQuestion?.id),
    refetchInterval: activeQuestion?.isLive ? 4000 : 8000,
  })

  const optionBreakdown = useMemo(() => {
    if (!activeQuestion) return []
    if (chartRawType === 'rating') {
      return buildRatingChartData(currentResponses, activeQuestion).map((row, index) => ({
        key: `rating-${row.name}-${index}`,
        label: row.name,
        count: Number(row.value) || 0,
        letter: null,
        color: getPresentOptionColor(row.name, index, chartRawType),
      }))
    }
    if (!questionUsesOptionChart(chartRawType)) return []
    return buildOptionChartData(
      activeQuestion,
      questionResultsQuery.data,
      currentResponses,
    ).map((row, index) => ({
      key: String(row.optionId ?? `${row.name}-${index}`),
      label: row.name,
      count: Number(row.value) || 0,
      letter: String.fromCharCode(65 + index),
      color: getPresentOptionColor(row.name, index, chartRawType),
      isCorrect: Boolean(
        (activeQuestion.options || []).find(
          (opt) =>
            Number(opt.option_id) === Number(row.optionId) ||
            String(opt.option_text).trim() === String(row.name).trim(),
        )?.is_correct,
      ),
    }))
  }, [activeQuestion, chartRawType, currentResponses, questionResultsQuery.data])

  const optionTotal = useMemo(
    () => optionBreakdown.reduce((sum, row) => sum + row.count, 0),
    [optionBreakdown],
  )

  const showQuizTimer = Boolean(sessionQuizTotalTimeEnabled && session?.started_at)
  const questionDeadlineMs = useMemo(() => {
    if (!activeQuestion?.isLive || activeQuestion?.isSurvey) return null
    if (Number(activeQuestion?.timeLimit) <= 0) return null
    return getQuestionDeadlineMs(activeQuestion)
  }, [activeQuestion])
  const showQuestionTimer = questionDeadlineMs != null
  const [timerTick, setTimerTick] = useState(0)

  useEffect(() => {
    if (!showQuizTimer && !showQuestionTimer) return undefined
    const id = window.setInterval(() => setTimerTick((value) => value + 1), 1000)
    return () => window.clearInterval(id)
  }, [showQuizTimer, showQuestionTimer, session?.started_at, activeQuestion?.id, activeQuestion?.liveActivatedAt])

  const quizRemainingSeconds = useMemo(() => {
    if (!showQuizTimer) return 0
    void timerTick
    return getQuizTotalRemainingSeconds(session)
  }, [showQuizTimer, session, timerTick])

  const questionRemainingSeconds = useMemo(() => {
    if (!showQuestionTimer || questionDeadlineMs == null) return 0
    void timerTick
    return getRemainingQuestionSeconds(questionDeadlineMs)
  }, [showQuestionTimer, questionDeadlineMs, timerTick])

  const goToSlide = useCallback(
    (nextIndex) => {
      const clamped = Math.min(Math.max(0, nextIndex), slideTotal - 1)
      if (clamped === slideIndex || slideMutation.isPending) return
      const target = slides[clamped]
      slideMutation.mutate({
        slideIndex: clamped,
        slideType: target?.type || null,
      })
    },
    [slideIndex, slideMutation, slideTotal, slides],
  )

  useEffect(() => {
    if (!error) return undefined
    const timer = setTimeout(() => setError(''), 4000)
    return () => clearTimeout(timer)
  }, [error])

  const wrap = (node) => (bare ? node : <EmbedShell>{node}</EmbedShell>)

  if (isError || (!isLoading && !session)) {
    return wrap(
      <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
        Could not load this session (access denied or missing). Link a session your account can
        manage, or unlink the meeting and try again.
      </p>,
    )
  }

  if (!session) {
    return wrap(
      <p className="rounded-xl border border-blue-200/70 bg-white p-4 text-sm text-slate-600">
        Loading session…
      </p>,
    )
  }

  const lifecycleLabel = isLive
    ? lifecycleMutation.isPending
      ? 'Ending…'
      : 'End'
    : lifecycleMutation.isPending
      ? 'Launching…'
      : 'Launch'

  return wrap(
    <div className="space-y-2">
      <div className="rounded-xl border border-blue-200/70 bg-white p-2.5 shadow-sm">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-navy-900">{session.title}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {session.status} · {participants.length} joined ·{' '}
              {currentSlide?.label || `Slide ${slideIndex + 1}`} ({slideIndex + 1}/{slideTotal})
            </p>
          </div>
          <button
            type="button"
            disabled={lifecycleMutation.isPending || session.status === 'completed'}
            onClick={() => lifecycleMutation.mutate(isLive ? 'end' : 'start')}
            className={`inline-flex h-8 shrink-0 items-center gap-1 rounded-lg px-2.5 text-[11px] font-semibold text-white transition disabled:opacity-50 ${
              isLive ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {isLive ? <Square className="size-3" /> : <Rocket className="size-3" />}
            {lifecycleLabel}
          </button>
          <button
            type="button"
            onClick={logout}
            title="Sign out of this panel"
            className="shrink-0 rounded-lg border border-blue-200 p-1.5 text-slate-500 transition hover:bg-blue-50"
          >
            <LogOut className="size-3.5" />
          </button>
        </div>

        {showQuizTimer || showQuestionTimer ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {showQuizTimer ? (
              <EmbedTimerChip label="Quiz" remainingSeconds={quizRemainingSeconds} />
            ) : null}
            {showQuestionTimer ? (
              <EmbedTimerChip label="Question" remainingSeconds={questionRemainingSeconds} />
            ) : null}
          </div>
        ) : null}

        <div className="mt-2 flex gap-1.5">
          <button
            type="button"
            disabled={slideIndex <= 0 || slideMutation.isPending}
            onClick={() => goToSlide(slideIndex - 1)}
            className="inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-lg border border-blue-200 bg-white text-[11px] font-semibold text-navy-800 transition hover:bg-blue-50 disabled:opacity-40"
          >
            <ChevronLeft className="size-3.5" />
            Prev
          </button>
          <button
            type="button"
            disabled={slideIndex >= slideTotal - 1 || slideMutation.isPending}
            onClick={() => goToSlide(slideIndex + 1)}
            className="inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-lg border border-blue-200 bg-white text-[11px] font-semibold text-navy-800 transition hover:bg-blue-50 disabled:opacity-40"
          >
            {slides[slideIndex + 1]?.type === 'question' ? 'Next Q' : 'Next'}
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
          {error}
        </p>
      ) : null}

      {activeQuestion ? (
        <div className="rounded-xl border border-blue-200/70 bg-white p-2.5 shadow-sm">
          <div className="mb-1.5 flex items-start justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {currentSlide?.type === 'question'
                ? `Q${currentSlide.questionNumber || ''}`
                : 'Question'}
              {optionTotal > 0 ? ` · ${optionTotal} answer${optionTotal === 1 ? '' : 's'}` : ''}
            </p>
          </div>

          <div className="mb-2 flex flex-wrap gap-1.5">
            {canEditLive && showActivateAllQuestions ? (
              <HostQuestionActionButton
                disabled={questionMutations.activateAllQuestionsMutation.isPending}
                icon={Play}
                label={
                  questionMutations.activateAllQuestionsMutation.isPending
                    ? 'Activating…'
                    : 'Activate all'
                }
                title="Make all questions live at once"
                tone="emerald"
                size="compact"
                onClick={() => questionMutations.activateAllQuestions()}
              />
            ) : null}
            {canEditLive && showCloseAllQuestions ? (
              <HostQuestionActionButton
                disabled={questionMutations.closeAllQuestionsMutation.isPending}
                icon={Layers}
                label={
                  questionMutations.closeAllQuestionsMutation.isPending
                    ? 'Closing…'
                    : 'Close all'
                }
                title="Stop accepting responses on all live untimed questions"
                tone="rose"
                size="compact"
                onClick={() => questionMutations.closeAllQuestions()}
              />
            ) : null}
            <HostQuestionControls
              question={activeQuestion}
              canEditLive={canEditLive}
              singleActiveQuestionMode={singleActiveQuestionMode}
              sessionQuizTotalTimeEnabled={sessionQuizTotalTimeEnabled}
              disableSingleActivation={disableSingleActivation}
              size="compact"
              showLabel={false}
              questionLiveMutation={questionMutations.questionLiveMutation}
              answerRevealMutation={questionMutations.answerRevealMutation}
              questionLeaderboardMutation={questionMutations.questionLeaderboardMutation}
              closeQuestionMutation={questionMutations.closeQuestionMutation}
              reattemptMutation={questionMutations.reattemptMutation}
              onCloseQuestion={() => questionMutations.closeQuestion(activeQuestion)}
              onOpenForReattempt={() => questionMutations.openForReattempt(activeQuestion)}
            />
          </div>

          <p className="mb-2 line-clamp-2 text-xs font-semibold leading-snug text-navy-900">
            {activeQuestion.text}
          </p>

          <EmbedQuestionMediaToggle media={activeQuestion.media} />

          {optionBreakdown.length ? (
            <ul className="space-y-1">
              {optionBreakdown.map((option) => {
                const percent =
                  optionTotal > 0 ? Math.round((option.count / optionTotal) * 100) : 0
                return (
                  <li
                    key={option.key}
                    className="relative overflow-hidden rounded-md border border-slate-200/80 bg-white"
                  >
                    <div
                      className="pointer-events-none absolute inset-y-0 left-0 transition-[width] duration-500 ease-out"
                      style={{
                        width: `${percent}%`,
                        background: `linear-gradient(90deg, ${option.color}33 0%, ${option.color}14 100%)`,
                      }}
                      aria-hidden
                    />
                    <div
                      className="pointer-events-none absolute inset-y-0 left-0 w-0.5"
                      style={{ backgroundColor: option.color }}
                      aria-hidden
                    />
                    <div className="relative flex items-center gap-1.5 px-2 py-1.5">
                      {option.letter ? (
                        <span
                          className="grid size-5 shrink-0 place-items-center rounded text-[10px] font-bold text-white"
                          style={{ backgroundColor: option.color }}
                        >
                          {option.letter}
                        </span>
                      ) : null}
                      <p className="min-w-0 flex-1 truncate text-[11px] font-semibold text-navy-900">
                        {option.label}
                        {option.isCorrect && activeQuestion.answerRevealed ? (
                          <span className="ml-1 text-[10px] font-bold text-emerald-600">✓</span>
                        ) : null}
                      </p>
                      <span
                        className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white"
                        style={{ backgroundColor: option.color }}
                        title={`${percent}% · ${option.count} vote${option.count === 1 ? '' : 's'}`}
                      >
                        {percent}%
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : Array.isArray(activeQuestion.options) && activeQuestion.options.length ? (
            <ul className="space-y-1 rounded-lg border border-blue-100 bg-slate-50/80 p-2">
              {activeQuestion.options.map((option, index) => (
                <li
                  key={String(option.option_id ?? index)}
                  className="flex gap-2 text-[11px] leading-snug text-slate-700"
                >
                  <span className="shrink-0 font-semibold text-navy-800">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  <span className="min-w-0 truncate">{option.option_text}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : currentSlide ? (
        <div className="rounded-xl border border-blue-200/70 bg-white p-2.5 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Current slide
          </p>
          <p className="mt-1 text-sm font-semibold text-navy-900">{currentSlide.label}</p>
          <p className="mt-1 text-[11px] text-slate-500">
            {currentSlide.type === 'participants'
              ? 'Lobby. Tap Next Q, then Activate so participants can answer.'
              : currentSlide.type === 'distributedQuiz'
                ? 'Distributed quiz — use Activate all when live.'
                : 'Ending slide for rankings or survey wrap-up.'}
          </p>
        </div>
      ) : null}
    </div>,
  )
}

export default function EmbedControlsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const user = useAuthStore((state) => state.user)
  const sessionId = searchParams.get('session') || ''

  if (!user) return <InFrameSignIn />

  if (!sessionId) {
    return (
      <SessionCodePrompt
        onResolved={(resolvedId) => {
          const next = new URLSearchParams(searchParams)
          next.set('session', resolvedId)
          setSearchParams(next, { replace: true })
        }}
      />
    )
  }

  return <EmbedControls sessionId={sessionId} />
}
