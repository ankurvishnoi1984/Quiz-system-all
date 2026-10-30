import {
  Activity,
  BarChart3,
  Download,
  FileBarChart2,
  LayoutDashboard,
  Loader2,
  LoaderCircle,
  Play,
  Radio,
  Users,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { SessionSummaryReportCard } from '../components/analytics/SessionSummaryReportCard'
import { QuestionBreakdownTables } from '../components/analytics/QuestionBreakdownTables'
import { HostAlertModal } from '../components/live/HostAlertModal'
import { SESSION_REPORT_VIEWS } from '../constants/sessionReportTypes'
import {
  getSessionParticipantsReportApi,
  getSessionSummaryReportApi,
} from '../services/analyticsApi'
import { listSessionQuestionsApi, getSessionResponsesApi } from '../services/liveApi'
import {
  activateAllSessionAdminQuestionsApi,
  getSessionAdminDashboardApi,
} from '../services/sessionAdminApi'
import { useAuthStore } from '../store/authStore'
import {
  apiQuestionTypeToUi,
  buildAnalyticsCsvRows,
  joinTypeContactFields,
} from '../utils/analyticsQuestions'
import { buildEmojiBarData } from '../utils/emojiReaction'
import { exportCombinedSessionReportExcel } from '../utils/combinedSessionReportExcelExport'
import {
  canHostActivateAllQuestions,
  sessionUsesAdvancedSlotActivation,
} from '../utils/hostQuestionControls'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'reports', label: 'Reports', icon: FileBarChart2 },
]

const QUESTION_STATE_STYLE = {
  live: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  answered: 'bg-sky-100 text-sky-800 ring-sky-200',
  closed: 'bg-slate-200 text-slate-700 ring-slate-300',
  waiting: 'bg-amber-50 text-amber-800 ring-amber-200',
}

function formatStatus(status) {
  const map = {
    draft: 'Draft',
    live: 'Live',
    paused: 'Paused',
    completed: 'Completed',
    archived: 'Archived',
  }
  return map[status] || status || '—'
}

function StatCard({ icon: Icon, label, value, hint, tone = 'teal' }) {
  const tones = {
    teal: 'from-teal-700 to-cyan-600 shadow-teal-800/15',
    slate: 'from-slate-700 to-slate-600 shadow-slate-800/10',
    amber: 'from-amber-600 to-orange-500 shadow-amber-700/15',
  }
  return (
    <div className={`rounded-2xl bg-linear-to-br ${tones[tone]} p-5 text-white shadow-lg`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/75">{label}</p>
        <Icon className="size-5 text-white/85" />
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-sm text-white/80">{hint}</p> : null}
    </div>
  )
}

function SessionAdminPage() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const queryClient = useQueryClient()
  const [nav, setNav] = useState('dashboard')
  const [reportView, setReportView] = useState('summary')
  const [exportingReport, setExportingReport] = useState(false)
  const [hostAlert, setHostAlert] = useState(null)

  const dashboardQuery = useQuery({
    queryKey: ['session-admin-dashboard'],
    queryFn: () => getSessionAdminDashboardApi(accessToken),
    enabled: Boolean(accessToken),
    refetchInterval: 8_000,
  })

  const session = dashboardQuery.data?.session
  const sessionId = session?.session_id
  const questions = dashboardQuery.data?.questions || []
  const live = dashboardQuery.data?.live || { connected_now: 0, total_joined: 0 }
  const timeline = dashboardQuery.data?.join_timeline || []
  const reportsEnabled = Boolean(accessToken && sessionId && nav === 'reports')

  const canEditLive = session?.status === 'live'
  const singleActiveQuestionMode = session?.participant_navigation_enabled === false
  const advancedSlotActivation = sessionUsesAdvancedSlotActivation(session)
  const showActivateAllQuestionsButton = useMemo(() => {
    if (advancedSlotActivation) return false
    return canHostActivateAllQuestions(
      (questions || []).map((q) => ({ isLive: Boolean(q.is_live) })),
      { canEditLive, singleActiveQuestionMode },
    )
  }, [advancedSlotActivation, questions, canEditLive, singleActiveQuestionMode])

  const activateAllQuestionsMutation = useMutation({
    mutationFn: () => activateAllSessionAdminQuestionsApi(accessToken),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['session-admin-dashboard'] })
      const count = data?.activated_count
      setHostAlert({
        variant: 'success',
        title: 'Questions activated',
        message:
          typeof count === 'number'
            ? `${count} question${count === 1 ? '' : 's'} are now live for participants.`
            : 'All inactive questions are now live for participants.',
        confirmLabel: 'OK',
      })
    },
    onError: (error) => {
      setHostAlert({
        variant: 'error',
        title: 'Could not activate all questions',
        message: error?.message || 'Something went wrong. Please try again.',
        confirmLabel: 'OK',
      })
    },
  })

  const requestActivateAllQuestions = () => {
    setHostAlert({
      variant: 'warning',
      title: 'Activate all questions?',
      message:
        'This will make every inactive question live for participants at once. Timed questions will share the same start time.',
      confirmLabel: 'Cancel',
      secondaryLabel: activateAllQuestionsMutation.isPending ? 'Activating…' : 'Activate',
      onSecondary: () => {
        if (activateAllQuestionsMutation.isPending) return
        activateAllQuestionsMutation.mutate()
      },
    })
  }

  const summaryQuery = useQuery({
    queryKey: ['session-admin-summary', sessionId],
    queryFn: () => getSessionSummaryReportApi(accessToken, sessionId),
    enabled: reportsEnabled,
  })

  const participantsQuery = useQuery({
    queryKey: ['session-admin-participants-report', sessionId],
    queryFn: () => getSessionParticipantsReportApi(accessToken, sessionId),
    enabled: reportsEnabled,
  })

  const questionsQuery = useQuery({
    queryKey: ['session-admin-export-questions', sessionId],
    queryFn: () => listSessionQuestionsApi(accessToken, sessionId),
    enabled: reportsEnabled,
  })

  const responsesQuery = useQuery({
    queryKey: ['session-admin-export-responses', sessionId],
    queryFn: () => getSessionResponsesApi(accessToken, sessionId),
    enabled: reportsEnabled,
  })

  const sortedQuestions = useMemo(
    () =>
      [...(questionsQuery.data || [])].sort(
        (a, b) => (Number(a.display_order) || 0) - (Number(b.display_order) || 0),
      ),
    [questionsQuery.data],
  )

  const allResponses = responsesQuery.data || []

  const sessionMeta = useMemo(() => {
    if (!sessionId) return null
    return {
      id: String(sessionId),
      title: session?.title || 'Session',
      status: formatStatus(session?.status),
      startedAt: session?.started_at ?? null,
      endedAt: session?.ended_at ?? null,
    }
  }, [sessionId, session?.title, session?.status, session?.started_at, session?.ended_at])

  const isPollOrSurveySession = useMemo(() => {
    if (!sortedQuestions.length) return false
    return sortedQuestions.every(
      (q) => q.question_type === 'poll' || q.question_type === 'survey',
    )
  }, [sortedQuestions])

  const chartData = useMemo(
    () =>
      timeline.map((row) => ({
        label: String(row.bucket || '').slice(11, 16) || row.bucket,
        joined: row.count,
        cumulative: row.cumulative,
      })),
    [timeline],
  )

  const buildRawResponseExportRows = ({ includeEmail = false, includeMobile = false } = {}) => {
    if (!sessionMeta) {
      return { rawResponseRows: [], emojiSummaryRows: [] }
    }

    let rawResponseRows = buildAnalyticsCsvRows({
      sessionMeta,
      sortedQuestions,
      allResponses,
      includeEmail,
      includeMobile,
    })

    if (!rawResponseRows.length) {
      rawResponseRows = sortedQuestions.map((q, index) => {
        const row = [
          sessionMeta.id,
          sessionMeta.title,
          String(q.display_order ?? index + 1),
          apiQuestionTypeToUi(q.question_type),
          q.question_type === 'survey' ? q.survey_subtype || '' : '',
          (q.question_text || '').replaceAll('"', '""'),
          '',
        ]
        if (includeEmail) row.push('')
        if (includeMobile) row.push('')
        row.push('', '', '')
        return row
      })
    }

    const emojiSummaryRows = []
    const emojiQuestions = sortedQuestions.filter((q) => q.question_type === 'emoji_reaction')
    for (const question of emojiQuestions) {
      const questionResponses = allResponses.filter(
        (row) => Number(row.question_id) === Number(question.question_id),
      )
      const { rows: emojiRows } = buildEmojiBarData(question, null, questionResponses)
      const emojiCols = Array.from({ length: 5 }, (_, index) => emojiRows[index]?.emoji ?? '')
      const countCols = Array.from({ length: 5 }, (_, index) => String(emojiRows[index]?.count ?? 0))
      emojiSummaryRows.push([
        sessionMeta.id,
        sessionMeta.title,
        String(question.display_order ?? ''),
        (question.question_text || '').replaceAll('"', '""'),
        ...emojiCols,
        ...countCols,
      ])
    }

    return { rawResponseRows, emojiSummaryRows }
  }

  const handleDownloadReport = async () => {
    if (!sessionId) return
    try {
      setExportingReport(true)
      const [summaryReport, participantsReport] = await Promise.all([
        summaryQuery.data || getSessionSummaryReportApi(accessToken, sessionId),
        participantsQuery.data || getSessionParticipantsReportApi(accessToken, sessionId),
      ])
      const joinType =
        summaryReport?.session?.join_type || participantsReport?.session?.join_type || null
      const { includeEmail, includeMobile } = joinTypeContactFields(joinType)
      const { rawResponseRows, emojiSummaryRows } = buildRawResponseExportRows({
        includeEmail,
        includeMobile,
      })
      await exportCombinedSessionReportExcel({
        summaryReport,
        participantsReport,
        showScore: !isPollOrSurveySession,
        rawResponseRows,
        emojiSummaryRows,
      })
    } catch (error) {
      console.error(error)
      window.alert(error?.message || 'Export failed')
    } finally {
      setExportingReport(false)
    }
  }

  if (dashboardQuery.isLoading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <p className="inline-flex items-center gap-2 text-sm font-medium text-teal-800">
          <LoaderCircle className="size-4 animate-spin" />
          Loading Session Admin…
        </p>
      </div>
    )
  }

  if (dashboardQuery.error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
        {dashboardQuery.error.message || 'Unable to load Session Admin dashboard.'}
      </div>
    )
  }

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-3xl bg-linear-to-r from-teal-950 via-teal-800 to-cyan-600 p-7 text-white shadow-xl shadow-teal-950/20">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/25">
              <Activity className="size-6" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-100">
                Session Admin workspace
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                {session?.title || 'Assigned session'}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-cyan-50/90 sm:text-base">
                Watch live participation and open reports. Building, presenting, and going live stay
                with the host. When multiple questions can be active, you can Activate All here.
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm backdrop-blur">
            <p className="text-cyan-100">Status</p>
            <p className="mt-0.5 text-lg font-bold">{formatStatus(session?.status)}</p>
            <p className="mt-1 font-mono text-xs text-cyan-100/90">
              Code {session?.session_code || '—'}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex flex-wrap gap-2 rounded-2xl border border-teal-200/70 bg-white/80 p-2 shadow-sm">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = nav === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setNav(item.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                active
                  ? 'bg-teal-700 text-white shadow-md shadow-teal-800/20'
                  : 'text-teal-900 hover:bg-teal-50'
              }`}
            >
              <Icon className="size-4" />
              {item.label}
            </button>
          )
        })}
      </nav>

      {nav === 'dashboard' ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              icon={Radio}
              label="Connected now"
              value={live.connected_now ?? 0}
              hint="People currently in the room"
            />
            <StatCard
              icon={Users}
              label="Total joined"
              value={live.total_joined ?? 0}
              hint="Join history for this session"
              tone="slate"
            />
            <StatCard
              icon={BarChart3}
              label="Questions"
              value={questions.length}
              hint={`${questions.filter((q) => q.state === 'live').length} live now`}
              tone="amber"
            />
          </div>

          <div className="rounded-3xl border border-teal-200/70 bg-white/90 p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-teal-950">Participation over time</h2>
                <p className="text-sm text-slate-600">Joins by hour during the session</p>
              </div>
            </div>
            {chartData.length ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="saJoinFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0f766e" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#0f766e" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ccfbf1" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#5eead4" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#5eead4" />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="cumulative"
                      name="Total joined"
                      stroke="#0f766e"
                      fill="url(#saJoinFill)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-teal-200 bg-teal-50/40 px-4 py-10 text-center text-sm text-teal-800">
                No participant joins yet. The chart updates as people enter the session.
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-teal-200/70 bg-white/90 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-teal-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-teal-950">Questions</h2>
                <p className="text-sm text-slate-600">
                  {showActivateAllQuestionsButton
                    ? 'Live-style list · Activate All available'
                    : 'Live-style list · view only'}
                </p>
              </div>
              {showActivateAllQuestionsButton ? (
                <button
                  type="button"
                  onClick={requestActivateAllQuestions}
                  disabled={activateAllQuestionsMutation.isPending}
                  title="Make all questions live at once (timed questions share the same start time)"
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {activateAllQuestionsMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Play className="size-4 fill-current" />
                  )}
                  {activateAllQuestionsMutation.isPending
                    ? 'Activating…'
                    : 'Activate all questions'}
                </button>
              ) : null}
            </div>
            {!questions.length ? (
              <div className="px-5 py-10 text-center text-sm text-slate-600">
                No questions in this session yet.
              </div>
            ) : (
              <ul className="divide-y divide-teal-50">
                {questions.map((question) => (
                  <li
                    key={question.question_id}
                    className="flex flex-wrap items-start gap-3 px-5 py-4"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-teal-100 text-sm font-bold text-teal-900">
                      {question.order}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900">{question.question_text}</p>
                      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                        {String(question.question_type || '').replaceAll('_', ' ')} ·{' '}
                        {question.response_count} response
                        {question.response_count === 1 ? '' : 's'}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${
                        QUESTION_STATE_STYLE[question.state] || QUESTION_STATE_STYLE.waiting
                      }`}
                    >
                      {question.state}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {SESSION_REPORT_VIEWS.map((view) => {
                const active = reportView === view.id
                return (
                  <button
                    key={view.id}
                    type="button"
                    onClick={() => setReportView(view.id)}
                    className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                      active
                        ? 'bg-cyan-700 text-white shadow-sm'
                        : 'border border-teal-200 bg-white text-teal-900 hover:bg-teal-50'
                    }`}
                  >
                    {view.label}
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              onClick={() => void handleDownloadReport()}
              disabled={summaryQuery.isLoading || exportingReport || !sessionId}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-teal-200/80 bg-white px-4 text-sm font-bold text-teal-900 shadow-sm transition hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {exportingReport ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              Download Report
            </button>
          </div>

          {summaryQuery.isLoading ? (
            <p className="text-sm text-slate-600">Loading session report…</p>
          ) : summaryQuery.error ? (
            <p className="text-sm text-red-600">{summaryQuery.error.message}</p>
          ) : reportView === 'summary' ? (
            <SessionSummaryReportCard report={summaryQuery.data} />
          ) : (
            <div className="rounded-3xl border border-teal-200/70 bg-white/90 p-5 shadow-sm">
              <h2 className="text-lg font-bold text-teal-950">Question breakdown</h2>
              <p className="mt-1 text-sm text-slate-600">
                Response totals and option distribution for each question
              </p>
              <div className="mt-4">
                <QuestionBreakdownTables
                  surveyQuestions={summaryQuery.data?.survey_question_breakdowns}
                  standaloneQuestions={summaryQuery.data?.standalone_question_breakdowns}
                />
              </div>
            </div>
          )}
        </div>
      )}

      <HostAlertModal
        open={Boolean(hostAlert)}
        variant={hostAlert?.variant ?? 'success'}
        title={hostAlert?.title ?? ''}
        message={hostAlert?.message ?? ''}
        confirmLabel={hostAlert?.confirmLabel ?? 'OK'}
        secondaryLabel={hostAlert?.secondaryLabel}
        onSecondary={hostAlert?.onSecondary}
        onClose={() => setHostAlert(null)}
      />
    </section>
  )
}

export default SessionAdminPage
