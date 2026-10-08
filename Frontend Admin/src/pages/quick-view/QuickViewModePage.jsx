import { Maximize2, Minimize2, Trophy, Users } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import {
  AdvancedSlotActivationPanel,
  buildAdvancedSlotStats,
} from '../../components/live/AdvancedSlotActivationPanel'
import { HostQuestionActionButton } from '../../components/live/HostQuestionActionButton'
import { useAuthStore } from '../../store/authStore'
import {
  activateAdvancedAssignmentSlotApi,
  deactivateAdvancedAssignmentSlotApi,
  getSessionDetailApi,
  getSessionResponsesApi,
  listSessionQuestionAssignmentsApi,
  listSessionQuestionsApi,
  updateSessionApi,
} from '../../services/liveApi'
import { createRealtimeClient, RealtimeEvent } from '../../services/realtimeClient'
import { sessionUsesAdvancedSlotActivation } from '../../utils/hostQuestionControls'
import {
  mapLiveQuestions,
  sessionSupportsOverallLeaderboard,
} from '../../utils/livePresentation'

function QuickViewFullscreenButton({ isFullscreen, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex items-center gap-2 rounded-xl border border-emerald-200/80 bg-white/90 px-4 py-2.5 text-sm font-semibold text-navy-800 shadow-sm transition hover:bg-white"
    >
      {isFullscreen ? (
        <>
          <Minimize2 className="size-4" />
          Exit fullscreen
        </>
      ) : (
        <>
          <Maximize2 className="size-4" />
          Fullscreen
        </>
      )}
    </button>
  )
}

export default function QuickViewModePage() {
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session') || ''
  const accessToken = useAuthStore((state) => state.accessToken)
  const queryClient = useQueryClient()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const sessionQuery = useQuery({
    queryKey: ['quick-view-session', sessionId],
    queryFn: () => getSessionDetailApi(accessToken, sessionId),
    enabled: Boolean(accessToken && sessionId),
    refetchInterval: 5000,
  })

  const questionsQuery = useQuery({
    queryKey: ['quick-view-questions', sessionId],
    queryFn: () => listSessionQuestionsApi(accessToken, sessionId),
    enabled: Boolean(accessToken && sessionId),
    refetchInterval: sessionQuery.data?.status === 'live' ? 8000 : false,
  })

  const responsesQuery = useQuery({
    queryKey: ['quick-view-responses', sessionId],
    queryFn: () => getSessionResponsesApi(accessToken, sessionId),
    enabled: Boolean(accessToken && sessionId),
    refetchInterval: sessionQuery.data?.status === 'live' ? 5000 : false,
  })

  const session = sessionQuery.data
  const advancedSlotActivation = sessionUsesAdvancedSlotActivation(session)
  const questionsPerParticipantK = Number(session?.questions_per_participant)
  const advancedKLabel =
    Number.isFinite(questionsPerParticipantK) && questionsPerParticipantK > 0
      ? questionsPerParticipantK
      : null

  const advancedAssignmentsQuery = useQuery({
    queryKey: ['quick-view-assignments', sessionId],
    queryFn: () => listSessionQuestionAssignmentsApi(accessToken, sessionId),
    enabled: Boolean(accessToken && sessionId && advancedSlotActivation),
    refetchInterval: session?.status === 'live' ? 8000 : false,
  })

  const mappedQuestions = useMemo(
    () => mapLiveQuestions(questionsQuery.data),
    [questionsQuery.data],
  )
  const canToggleOverallLeaderboard = sessionSupportsOverallLeaderboard(mappedQuestions)
  const canEditLive = session?.status === 'live'
  const showSessionControls = session?.status === 'live' || session?.status === 'paused'

  const invalidateLive = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['quick-view-session', sessionId] })
    queryClient.invalidateQueries({ queryKey: ['quick-view-questions', sessionId] })
    queryClient.invalidateQueries({ queryKey: ['quick-view-assignments', sessionId] })
    queryClient.invalidateQueries({ queryKey: ['quick-view-responses', sessionId] })
    queryClient.invalidateQueries({ queryKey: ['live-session', sessionId] })
    queryClient.invalidateQueries({ queryKey: ['live-questions', sessionId] })
    queryClient.invalidateQueries({ queryKey: ['live-dept-sessions'] })
  }, [queryClient, sessionId])

  const activateAssignmentSlotMutation = useMutation({
    mutationFn: (slot) => activateAdvancedAssignmentSlotApi(accessToken, sessionId, slot),
    onSuccess: (result) => {
      setErrorMessage('')
      const patch = {
        advanced_active_slot:
          result?.advanced_active_slot ?? result?.slot ?? undefined,
        leaderboard_enabled: false,
        current_rankings_enabled: false,
      }
      queryClient.setQueryData(['quick-view-session', sessionId], (old) =>
        old ? { ...old, ...patch } : old,
      )
      invalidateLive()
    },
    onError: (error) =>
      setErrorMessage(error.message || 'Unable to activate this question slot.'),
  })

  const deactivateAssignmentSlotMutation = useMutation({
    mutationFn: async () => {
      await deactivateAdvancedAssignmentSlotApi(accessToken, sessionId)
      if (session?.leaderboard_enabled || session?.current_rankings_enabled) {
        await updateSessionApi(accessToken, sessionId, {
          leaderboard_enabled: false,
          current_rankings_enabled: false,
        })
      }
    },
    onSuccess: () => {
      setErrorMessage('')
      invalidateLive()
    },
    onError: (error) => setErrorMessage(error.message || 'Unable to inactivate this question.'),
  })

  const sessionLeaderboardMutation = useMutation({
    mutationFn: async ({ enabled, mode = 'overall' }) => {
      if (enabled) {
        await deactivateAdvancedAssignmentSlotApi(accessToken, sessionId)
      }
      if (mode === 'current') {
        return updateSessionApi(accessToken, sessionId, {
          current_rankings_enabled: enabled,
          ...(enabled ? { leaderboard_enabled: false } : {}),
        })
      }
      return updateSessionApi(accessToken, sessionId, {
        leaderboard_enabled: enabled,
        ...(enabled ? { current_rankings_enabled: false } : {}),
      })
    },
    onSuccess: () => {
      setErrorMessage('')
      invalidateLive()
    },
    onError: (error) =>
      setErrorMessage(error.message || 'Unable to update rankings setting'),
  })

  const slotControlPending =
    activateAssignmentSlotMutation.isPending || deactivateAssignmentSlotMutation.isPending

  const advancedSlotStats = useMemo(
    () =>
      advancedSlotActivation && advancedKLabel
        ? buildAdvancedSlotStats({
            kLabel: advancedKLabel,
            assignments: advancedAssignmentsQuery.data?.assignments,
            responses: responsesQuery.data || [],
          })
        : [],
    [
      advancedSlotActivation,
      advancedKLabel,
      advancedAssignmentsQuery.data?.assignments,
      responsesQuery.data,
    ],
  )

  const participantCount = useMemo(() => {
    const live = Number(session?.live_participants_count)
    const total = Number(session?.participants_count)
    if (Number.isFinite(live) && live >= 0) return live
    if (Number.isFinite(total) && total >= 0) return total
    return 0
  }, [session?.live_participants_count, session?.participants_count])

  const activeSlot = Number(session?.advanced_active_slot) || 0

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await document.documentElement.requestFullscreen()
      }
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    const sessionCode = session?.session_code
    if (!accessToken || !sessionId || !sessionCode) return undefined
    const client = createRealtimeClient(
      '',
      { session: sessionCode, token: accessToken, role: 'host' },
      'host',
    )
    const refresh = () => invalidateLive()
    const offs = [
      client.on(RealtimeEvent.SESSION_SETTINGS_UPDATED, refresh),
      client.on(RealtimeEvent.SESSION_UPDATED, refresh),
      client.on(RealtimeEvent.QUESTION_CHANGED, refresh),
      client.on(RealtimeEvent.RESPONSE_RECEIVED, () => {
        queryClient.invalidateQueries({ queryKey: ['quick-view-responses', sessionId] })
      }),
      client.on(RealtimeEvent.PARTICIPANT_JOINED, refresh),
      client.on(RealtimeEvent.LEADERBOARD_UPDATE, refresh),
    ]
    return () => {
      offs.forEach((off) => off?.())
      client.disconnect?.()
    }
  }, [accessToken, sessionId, session?.session_code, invalidateLive, queryClient])

  if (!accessToken) {
    return (
      <div className="grid min-h-dvh place-items-center bg-slate-50 p-6">
        <p className="text-center text-lg text-slate-600">Sign in as host to use Quick View Mode.</p>
      </div>
    )
  }

  if (!sessionId) {
    return (
      <div className="grid min-h-dvh place-items-center bg-slate-50 p-6">
        <p className="text-center text-lg text-slate-600">
          Missing session. Open Quick View Mode from the Live page.
        </p>
      </div>
    )
  }

  if (sessionQuery.isLoading) {
    return (
      <div className="grid min-h-dvh place-items-center bg-slate-50 p-6">
        <p className="text-slate-600">Loading Quick View…</p>
      </div>
    )
  }

  if (!advancedSlotActivation) {
    return (
      <div className="grid min-h-dvh place-items-center bg-slate-50 p-6">
        <div className="max-w-md text-center">
          <p className="text-lg font-semibold text-navy-900">Quick View is for Advanced sessions</p>
          <p className="mt-2 text-sm text-slate-600">
            This control surface is only available for Advanced (host-paced) quizzes. Use Preview Mode
            from Live for normal sessions.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-linear-to-br from-emerald-50/80 via-white to-slate-100 text-navy-900">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        aria-hidden
        style={{
          backgroundImage:
            'radial-gradient(circle at 10% 20%, rgba(4, 120, 87, 0.12) 0%, transparent 45%), radial-gradient(circle at 90% 80%, rgba(27, 75, 107, 0.08) 0%, transparent 42%)',
        }}
      />

      <header className="relative z-10 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-emerald-200/60 bg-white/85 px-4 py-3 backdrop-blur-md sm:px-6">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-800">
            Quick view mode · Screen share controls
          </p>
          <h1 className="mt-0.5 truncate text-xl font-bold text-navy-900 sm:text-2xl">
            {session?.title || 'Session'}
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Status: {session?.status || '—'}
            {activeSlot > 0 ? ` · Live question ${activeSlot}` : ' · No question activated'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {Boolean(session?.show_participant_count) ? (
            <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-950">
              <Users className="size-4" />
              <span className="tabular-nums">{participantCount}</span>
              <span className="text-xs font-medium text-emerald-800/80">participants</span>
            </div>
          ) : null}
          <QuickViewFullscreenButton isFullscreen={isFullscreen} onToggle={toggleFullscreen} />
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-5xl min-h-0 flex-1 flex-col gap-4 p-4 sm:p-6">
        {errorMessage ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {canToggleOverallLeaderboard && showSessionControls ? (
          <div className="flex flex-wrap items-center gap-2">
            <HostQuestionActionButton
              disabled={sessionLeaderboardMutation.isPending || !canEditLive}
              icon={Trophy}
              label={
                sessionLeaderboardMutation.isPending ? 'Updating…' : 'Current rankings'
              }
              title={
                session?.current_rankings_enabled
                  ? 'Hide current rankings from participants'
                  : 'Show current rankings for questions attempted so far and close the live question'
              }
              active={Boolean(session?.current_rankings_enabled)}
              tone="amber"
              onClick={() =>
                sessionLeaderboardMutation.mutate({
                  enabled: !session?.current_rankings_enabled,
                  mode: 'current',
                })
              }
            />
            <HostQuestionActionButton
              disabled={sessionLeaderboardMutation.isPending || !canEditLive}
              icon={Trophy}
              label={
                sessionLeaderboardMutation.isPending ? 'Updating…' : 'Overall rankings'
              }
              title={
                session?.leaderboard_enabled
                  ? 'Hide overall rankings from participants'
                  : 'Show overall rankings and close the live question'
              }
              active={Boolean(session?.leaderboard_enabled)}
              tone="amber"
              onClick={() =>
                sessionLeaderboardMutation.mutate({
                  enabled: !session?.leaderboard_enabled,
                  mode: 'overall',
                })
              }
            />
          </div>
        ) : null}

        <div className="min-h-0 flex-1">
          <AdvancedSlotActivationPanel
            slotStats={advancedSlotStats}
            activeAssignmentSlot={activeSlot}
            isSessionLive={canEditLive}
            onActivateAssignmentSlot={
              canEditLive ? (slot) => activateAssignmentSlotMutation.mutate(slot) : undefined
            }
            onDeactivateAssignmentSlot={
              canEditLive ? () => deactivateAssignmentSlotMutation.mutate() : undefined
            }
            slotActivationPending={slotControlPending}
            assignmentsLoading={advancedAssignmentsQuery.isLoading}
            className="h-full shadow-lg shadow-emerald-900/5"
          />
        </div>

        <p className="text-center text-xs text-slate-500">
          Share this window in Zoom/Meet. Use Previous / Next to browse, Activate to open a step for
          participants.
        </p>
      </main>
    </div>
  )
}
