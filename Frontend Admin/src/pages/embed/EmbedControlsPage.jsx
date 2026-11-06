import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, LogOut, Play, Square } from 'lucide-react'
import { HostQuestionControls } from '../../components/live/HostQuestionControls'
import { useHostQuestionMutations } from '../../hooks/useHostQuestionMutations'
import { useLiveSession } from '../../hooks/useLiveSession'
import { getPresentSlideApi, setPresentSlideApi } from '../../services/liveApi'
import { transitionSessionApi } from '../../services/dashboardApi'
import { lookupSessionByCodeApi } from '../../services/embedApi'
import { useAuthStore } from '../../store/authStore'
import { sessionRequiresActivateAllQuestions } from '../../utils/hostQuestionControls'
import { isSessionQuizTotalTimeEnabled } from '../../utils/sessionFlags'
import {
  getDistributedPresentMode,
  sessionSupportsOverallLeaderboard,
  sessionSupportsSurveyEndingScreen,
  sessionUsesQuestionSets,
} from '../../utils/livePresentation'

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

  const { session, mappedQuestions, participants, isLoading, isError } = useLiveSession(
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

  // Drive "current question" from the present slide — not only the live flag.
  // Old Zoom Next only bumped slide_index while this panel always showed the live/first question.
  const activeQuestion = useMemo(() => {
    if (currentSlide?.type === 'question' && currentSlide.question) return currentSlide.question
    return mappedQuestions.find((question) => question.isLive) || mappedQuestions[0] || null
  }, [currentSlide, mappedQuestions])

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

  return wrap(
    <>
      <div className="rounded-xl border border-blue-200/70 bg-white p-3 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-navy-900">{session.title}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {session.status} · {participants.length} joined ·{' '}
              {currentSlide?.label || `Slide ${slideIndex + 1}`} ({slideIndex + 1}/{slideTotal})
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            title="Sign out of this panel"
            className="shrink-0 rounded-lg border border-blue-200 p-2 text-slate-500 transition hover:bg-blue-50"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
          {error}
        </p>
      ) : null}

      <div className="rounded-xl border border-blue-200/70 bg-white p-3 shadow-sm">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Questions / slides
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={slideIndex <= 0 || slideMutation.isPending}
            onClick={() => goToSlide(slideIndex - 1)}
            className="inline-flex h-10 flex-1 items-center justify-center gap-1 rounded-lg border border-blue-200 bg-white text-sm font-semibold text-navy-800 transition hover:bg-blue-50 disabled:opacity-40"
          >
            <ChevronLeft className="size-4" />
            Previous
          </button>
          <button
            type="button"
            disabled={slideIndex >= slideTotal - 1 || slideMutation.isPending}
            onClick={() => goToSlide(slideIndex + 1)}
            className="inline-flex h-10 flex-1 items-center justify-center gap-1 rounded-lg border border-blue-200 bg-white text-sm font-semibold text-navy-800 transition hover:bg-blue-50 disabled:opacity-40"
          >
            {slides[slideIndex + 1]?.type === 'question' ? 'Next question' : 'Next'}
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-blue-200/70 bg-white p-3 shadow-sm">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Session
        </p>
        <button
          type="button"
          disabled={lifecycleMutation.isPending || session.status === 'completed'}
          onClick={() => lifecycleMutation.mutate(isLive ? 'end' : 'start')}
          className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold text-white transition disabled:opacity-50 ${
            isLive ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
          }`}
        >
          {isLive ? <Square className="size-4" /> : <Play className="size-4" />}
          {isLive ? 'End session' : 'Start session'}
        </button>
      </div>

      {currentSlide?.type === 'question' && activeQuestion ? (
        <div className="rounded-xl border border-blue-200/70 bg-white p-3 shadow-sm">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Question {currentSlide.questionNumber || ''}
          </p>
          <p className="mb-3 line-clamp-2 text-sm font-semibold text-navy-900">
            {activeQuestion.text}
          </p>
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
      ) : currentSlide ? (
        <div className="rounded-xl border border-blue-200/70 bg-white p-3 shadow-sm">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Current slide
          </p>
          <p className="text-sm font-semibold text-navy-900">{currentSlide.label}</p>
          <p className="mt-1 text-xs text-slate-500">
            {currentSlide.type === 'participants'
              ? 'Lobby slide. Tap Next question to move to the first question, then Activate so participants can answer.'
              : currentSlide.type === 'distributedQuiz'
                ? 'Distributed quiz mode — activate all questions from Session / Live controls when needed.'
                : 'Ending slide. Participants see rankings or survey wrap-up when enabled.'}
          </p>
        </div>
      ) : null}
    </>,
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
