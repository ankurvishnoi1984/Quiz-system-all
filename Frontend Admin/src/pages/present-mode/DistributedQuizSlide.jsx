import { useMemo, useState } from 'react'
import { ChevronDown, Layers, Search, Shuffle, Users } from 'lucide-react'
import { PresentSlideHeader } from './PresentShell'
import { PoolEligibleBadge } from '../../components/live/PoolEligibleBadge'
import {
  AdvancedSlotActivationPanel,
  buildAdvancedSlotStats,
} from '../../components/live/AdvancedSlotActivationPanel'
import { countResponseSubmissions, filterResponsesForQuestion } from '../../utils/livePresentation'
import { getPresentModeSettings } from '../../utils/presentModeSettings'
import { partitionQuestionsByPoolEligibility } from '../../utils/poolEligibleUi'
import { sessionUsesMarkedEligiblePool } from '../../utils/sessionFlags'

const MODE_COPY = {
  advanced: {
    title: 'Advanced quiz — host-paced questions',
    body: (session, poolSize, eligibleCount = null) => {
      const k = Number(session?.questions_per_participant)
      const kLabel = Number.isFinite(k) && k > 0 ? k : 'K'
      const poolNote =
        eligibleCount != null &&
        Number.isFinite(eligibleCount) &&
        eligibleCount !== poolSize
          ? `${eligibleCount} eligible in pool (${poolSize} total). `
          : `Pool of ${poolSize}. `
      return `${poolNote}Each participant has ${kLabel} random question${kLabel === 1 ? '' : 's'}. Activate Question 1, then 2, … — participants only see their own assignment for that step (you do not see question text).`
    },
  },
  randomOrder: {
    title: 'Random question order',
    body: () =>
      'Each participant sees all questions in their own shuffled order. Present slides do not mirror what any one participant is answering right now.',
  },
  sets: {
    title: 'Question sets',
    body: () =>
      'Each participant receives one random set (e.g. Set A or Set B). This list shows the full pool across sets for monitoring only.',
  },
}

function responseCountForQuestion(questionId, responses) {
  return countResponseSubmissions(filterResponsesForQuestion(responses, questionId))
}

export function DistributedQuizSlide({
  session,
  sessionTitle,
  mappedQuestions = [],
  responses = [],
  assignments = [],
  assignmentsLoading = false,
  distributedMode,
  participantCount,
  liveParticipantCount,
  isSessionLive,
  readOnly,
  activeAssignmentSlot = 0,
  onActivateAssignmentSlot,
  onDeactivateAssignmentSlot,
  slotActivationPending = false,
  onInspectQuestion,
  onParticipantsClick,
  onOverallRankingsClick,
  overallRankingsActive,
}) {
  const hostAdvancedSlotMode = distributedMode === 'advanced' && !readOnly
  const [tab, setTab] = useState(hostAdvancedSlotMode ? 'activate' : 'pool')
  const [assignmentSearch, setAssignmentSearch] = useState('')
  const [expandedParticipantIds, setExpandedParticipantIds] = useState(() => new Set())
  const markedEligiblePoolEnabled =
    distributedMode === 'advanced' && sessionUsesMarkedEligiblePool(session)
  const poolPartition = useMemo(
    () =>
      markedEligiblePoolEnabled
        ? partitionQuestionsByPoolEligibility(mappedQuestions)
        : {
            eligible: mappedQuestions.map((question, index) => ({ question, index })),
            ineligible: [],
            eligibleCount: mappedQuestions.length,
            totalCount: mappedQuestions.length,
          },
    [mappedQuestions, markedEligiblePoolEnabled],
  )
  const poolSize = mappedQuestions.length
  const eligibleCount = poolPartition.eligibleCount
  const liveCount = mappedQuestions.filter((q) => q.isLive).length
  const questionsPerParticipant = Number(session?.questions_per_participant)
  const kLabel =
    Number.isFinite(questionsPerParticipant) && questionsPerParticipant > 0
      ? questionsPerParticipant
      : null

  const totalResponses = useMemo(
    () =>
      mappedQuestions.reduce(
        (sum, q) => sum + responseCountForQuestion(q.id, responses),
        0,
      ),
    [mappedQuestions, responses],
  )

  const copy = MODE_COPY[distributedMode] || MODE_COPY.advanced
  const bodyText =
    typeof copy.body === 'function'
      ? copy.body(
          session,
          poolSize,
          markedEligiblePoolEnabled ? eligibleCount : null,
        )
      : copy.body

  const poolSections = useMemo(() => {
    const toRows = (items) =>
      items.map(({ question, index }) => ({
        question,
        number: index + 1,
        responses: responseCountForQuestion(question.id, responses),
      }))

    if (!markedEligiblePoolEnabled) {
      return [{ key: 'all', label: null, rows: toRows(poolPartition.eligible) }]
    }
    return [
      {
        key: 'eligible',
        label: poolPartition.ineligible.length > 0 ? 'In random pool' : null,
        rows: toRows(poolPartition.eligible),
      },
      {
        key: 'ineligible',
        label: 'Not in random pool',
        rows: toRows(poolPartition.ineligible),
      },
    ]
  }, [mappedQuestions, markedEligiblePoolEnabled, poolPartition, responses])

  const showAssignmentsTab = distributedMode === 'advanced'
  const statCols =
    kLabel != null
      ? markedEligiblePoolEnabled
        ? 'sm:grid-cols-5'
        : 'sm:grid-cols-4'
      : markedEligiblePoolEnabled
        ? 'sm:grid-cols-4'
        : 'sm:grid-cols-3'

  const filteredAssignments = useMemo(() => {
    const query = assignmentSearch.trim().toLowerCase()
    if (!query) return assignments
    return (assignments || []).filter((row) => {
      const name = String(row.display_name || '').toLowerCase()
      if (name.includes(query)) return true
      return (row.questions || []).some((q) =>
        String(q.question_text || '').toLowerCase().includes(query),
      )
    })
  }, [assignments, assignmentSearch])

  const toggleParticipantExpanded = (participantId) => {
    setExpandedParticipantIds((prev) => {
      const next = new Set(prev)
      const id = Number(participantId)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const expandAllFiltered = () => {
    setExpandedParticipantIds(new Set(filteredAssignments.map((row) => Number(row.participant_id))))
  }

  const collapseAll = () => setExpandedParticipantIds(new Set())
  const presentSettings = getPresentModeSettings(session)

  const slotStats = useMemo(
    () =>
      distributedMode === 'advanced' && kLabel
        ? buildAdvancedSlotStats({ kLabel, assignments, responses })
        : [],
    [distributedMode, kLabel, assignments, responses],
  )

  return (
    <div className="quiz-slide-in flex min-h-0 flex-1 flex-col">
      <PresentSlideHeader
        sessionTitle={sessionTitle}
        sessionLogoUrl={session?.logo_url}
        participantCount={participantCount}
        liveParticipantCount={liveParticipantCount}
        isSessionLive={isSessionLive}
        onParticipantsClick={
          presentSettings.showParticipantStats ? onParticipantsClick : undefined
        }
        onOverallRankingsClick={onOverallRankingsClick}
        overallRankingsActive={overallRankingsActive}
        readOnly={readOnly}
        showParticipantStats={presentSettings.showParticipantStats}
      />

      <div className="mt-[clamp(0.5rem,1.5vh,1rem)] flex min-h-0 flex-1 flex-col gap-[clamp(0.75rem,2vh,1.25rem)] px-[clamp(0.5rem,2vw,1rem)] pb-2">
        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/70 px-4 py-3">
          <p className="inline-flex items-center gap-2 text-sm font-bold text-emerald-950">
            {distributedMode === 'sets' ? (
              <Layers className="size-4 shrink-0" />
            ) : (
              <Shuffle className="size-4 shrink-0" />
            )}
            {copy.title}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-emerald-900/90">{bodyText}</p>
        </div>

        <div className={`grid shrink-0 gap-3 ${statCols}`}>
          {markedEligiblePoolEnabled ? (
            <>
              <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/80 px-4 py-3 text-center">
                <p className="text-2xl font-bold text-emerald-900">{eligibleCount}</p>
                <p className="text-xs font-semibold text-emerald-800/80">Eligible</p>
              </div>
              <div className="rounded-xl border border-blue-200/70 bg-white/90 px-4 py-3 text-center">
                <p className="text-2xl font-bold text-navy-900">{poolSize}</p>
                <p className="text-xs font-semibold text-slate-500">Total</p>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-blue-200/70 bg-white/90 px-4 py-3 text-center">
              <p className="text-2xl font-bold text-navy-900">{poolSize}</p>
              <p className="text-xs font-semibold text-slate-500">In pool</p>
            </div>
          )}
          {kLabel != null ? (
            <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/80 px-4 py-3 text-center">
              <p className="text-2xl font-bold text-emerald-900">{kLabel}</p>
              <p className="text-xs font-semibold text-emerald-800/80">Per participant</p>
            </div>
          ) : null}
          <div className="rounded-xl border border-blue-200/70 bg-white/90 px-4 py-3 text-center">
            <p className="text-2xl font-bold text-navy-900">{liveCount}</p>
            <p className="text-xs font-semibold text-slate-500">Live now</p>
          </div>
          <div className="rounded-xl border border-blue-200/70 bg-white/90 px-4 py-3 text-center">
            <p className="text-2xl font-bold text-navy-900">{totalResponses}</p>
            <p className="text-xs font-semibold text-slate-500">Total responses</p>
          </div>
        </div>

        {showAssignmentsTab && hostAdvancedSlotMode ? (
          <div className="flex shrink-0 gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setTab('activate')}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                tab === 'activate'
                  ? 'bg-white text-navy-900 shadow-sm'
                  : 'text-slate-600 hover:text-navy-800'
              }`}
            >
              Activate
            </button>
            <button
              type="button"
              onClick={() => setTab('progress')}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                tab === 'progress'
                  ? 'bg-white text-navy-900 shadow-sm'
                  : 'text-slate-600 hover:text-navy-800'
              }`}
            >
              Participants
            </button>
          </div>
        ) : showAssignmentsTab ? (
          <div className="flex shrink-0 gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setTab('pool')}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                tab === 'pool'
                  ? 'bg-white text-navy-900 shadow-sm'
                  : 'text-slate-600 hover:text-navy-800'
              }`}
            >
              Pool
            </button>
            <button
              type="button"
              onClick={() => setTab('assignments')}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                tab === 'assignments'
                  ? 'bg-white text-navy-900 shadow-sm'
                  : 'text-slate-600 hover:text-navy-800'
              }`}
            >
              Who got which questions
            </button>
          </div>
        ) : null}

        {hostAdvancedSlotMode && tab === 'activate' ? (
          <AdvancedSlotActivationPanel
            slotStats={slotStats}
            activeAssignmentSlot={activeAssignmentSlot}
            isSessionLive={isSessionLive}
            readOnly={readOnly}
            onActivateAssignmentSlot={onActivateAssignmentSlot}
            onDeactivateAssignmentSlot={onDeactivateAssignmentSlot}
            slotActivationPending={slotActivationPending}
            assignmentsLoading={assignmentsLoading}
          />
        ) : null}

        {hostAdvancedSlotMode && tab === 'progress' ? (
          <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-blue-200/70 bg-white/95">
            <p className="shrink-0 border-b border-slate-100 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Participants — slot progress (no question text)
            </p>
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {(assignments || []).map((row) => (
                <div
                  key={row.participant_id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 text-sm"
                >
                  <span className="font-semibold text-navy-900">{row.display_name}</span>
                  <span className="text-xs text-slate-500">
                    {(row.questions || [])
                      .sort((a, b) => Number(a.display_order) - Number(b.display_order))
                      .map((q) => `Q${q.display_order}`)
                      .join(' · ') || '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {!hostAdvancedSlotMode && (tab === 'pool' || !showAssignmentsTab) ? (
          <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-blue-200/70 bg-white/95">
            <p className="shrink-0 border-b border-slate-100 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {markedEligiblePoolEnabled
                ? 'Questions — tap to inspect results'
                : 'Pool — tap a question to inspect results'}
            </p>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {poolSections.map((section) =>
                section.rows.length === 0 ? null : (
                  <div key={section.key}>
                    {section.label ? (
                      <p
                        className={`sticky top-0 z-10 border-b border-slate-100 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide backdrop-blur-sm ${
                          section.key === 'ineligible'
                            ? 'bg-slate-50/95 text-slate-500'
                            : 'bg-emerald-50/95 text-emerald-800'
                        }`}
                      >
                        {section.label}
                        <span className="ml-1 font-medium normal-case tracking-normal text-slate-400">
                          ({section.rows.length})
                        </span>
                      </p>
                    ) : null}
                    <ul className="divide-y divide-slate-100">
                      {section.rows.map(({ question, number, responses: count }) => {
                        const ineligible =
                          markedEligiblePoolEnabled && question.poolEligible === false
                        return (
                          <li key={question.id}>
                            <button
                              type="button"
                              onClick={() => onInspectQuestion?.(question)}
                              className={`flex w-full items-start gap-3 px-4 py-3 text-left transition ${
                                ineligible
                                  ? 'bg-slate-50/50 opacity-70 hover:bg-slate-50 hover:opacity-90'
                                  : 'hover:bg-blue-50/60'
                              }`}
                            >
                              <span
                                className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                                  ineligible
                                    ? 'bg-slate-100 text-slate-500'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {number}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="line-clamp-2 text-sm font-semibold text-navy-900">
                                  {question.text || 'Untitled question'}
                                </span>
                                <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                  <span>
                                    {count} response{count === 1 ? '' : 's'}
                                  </span>
                                  {markedEligiblePoolEnabled ? (
                                    <PoolEligibleBadge
                                      eligible={question.poolEligible !== false}
                                    />
                                  ) : null}
                                  {question.isLive ? (
                                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800">
                                      Live
                                    </span>
                                  ) : null}
                                </span>
                              </span>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ),
              )}
            </div>
          </div>
        ) : null}

        {!hostAdvancedSlotMode && tab === 'assignments' ? (
          <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-blue-200/70 bg-white/95">
            <div className="shrink-0 space-y-2 border-b border-slate-100 px-4 py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Assignments —{' '}
                  {kLabel != null ? `${kLabel} questions each` : 'random subset per participant'}
                </p>
                {assignments.length > 0 ? (
                  <div className="flex gap-2 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={expandAllFiltered}
                      className="text-navy-700 hover:underline"
                    >
                      Expand all
                    </button>
                    <span className="text-slate-300">·</span>
                    <button
                      type="button"
                      onClick={collapseAll}
                      className="text-navy-700 hover:underline"
                    >
                      Collapse all
                    </button>
                  </div>
                ) : null}
              </div>
              {assignments.length > 0 ? (
                <label className="relative block">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400"
                    aria-hidden
                  />
                  <input
                    type="search"
                    value={assignmentSearch}
                    onChange={(e) => setAssignmentSearch(e.target.value)}
                    placeholder="Search participant or question…"
                    className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-navy-900 outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                  />
                </label>
              ) : null}
            </div>
            {assignmentsLoading ? (
              <p className="p-4 text-sm text-slate-500">Loading assignments…</p>
            ) : !assignments.length ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
                <Users className="size-8 text-slate-300" aria-hidden />
                <p className="text-sm font-semibold text-slate-600">No assignments yet</p>
                <p className="max-w-sm text-xs text-slate-500">
                  Assignments appear when participants join this Advanced session.
                </p>
              </div>
            ) : !filteredAssignments.length ? (
              <p className="p-4 text-sm text-slate-500">
                No participants match “{assignmentSearch.trim()}”.
              </p>
            ) : (
              <ul className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
                {filteredAssignments.map((row) => {
                  const pid = Number(row.participant_id)
                  const expanded = expandedParticipantIds.has(pid)
                  return (
                    <li key={row.participant_id}>
                      <button
                        type="button"
                        onClick={() => toggleParticipantExpanded(pid)}
                        aria-expanded={expanded}
                        className="flex w-full items-center gap-2 px-4 py-3 text-left transition hover:bg-blue-50/60"
                      >
                        <ChevronDown
                          className={`size-4 shrink-0 text-slate-400 transition ${
                            expanded ? 'rotate-0' : '-rotate-90'
                          }`}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1 truncate font-semibold text-navy-900">
                          {row.display_name}
                        </span>
                        <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-900">
                          {row.questions_assigned} question
                          {row.questions_assigned === 1 ? '' : 's'}
                        </span>
                      </button>
                      {expanded ? (
                        <ol className="list-decimal space-y-1 border-t border-slate-50 bg-slate-50/50 px-4 py-3 pl-12 text-sm text-slate-700">
                          {(row.questions || []).map((q) => (
                            <li key={q.question_id} className="leading-snug">
                              <span className="line-clamp-2">{q.question_text}</span>
                            </li>
                          ))}
                        </ol>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
