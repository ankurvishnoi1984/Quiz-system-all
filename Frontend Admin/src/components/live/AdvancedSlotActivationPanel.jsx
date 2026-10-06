import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2, PauseCircle, Play, Radio } from 'lucide-react'
import { countResponseSubmissions, filterResponsesForQuestion } from '../../utils/livePresentation'

function responseCountForQuestion(questionId, responses) {
  return countResponseSubmissions(filterResponsesForQuestion(responses, questionId))
}

/** Slot 1..K stats for Advanced host-paced activation. */
export function buildAdvancedSlotStats({ kLabel, assignments, responses }) {
  if (!kLabel) return []
  const stats = []
  for (let slot = 1; slot <= kLabel; slot += 1) {
    const questionIds = new Set()
    for (const row of assignments || []) {
      for (const q of row.questions || []) {
        if (Number(q.display_order) === slot) {
          questionIds.add(Number(q.question_id))
        }
      }
    }
    let responseCount = 0
    for (const qid of questionIds) {
      responseCount += responseCountForQuestion(qid, responses)
    }
    stats.push({ slot, responseCount, assignedVariants: questionIds.size })
  }
  return stats
}

export function getAdvancedSlotFlowState(activeAssignmentSlot, totalSlots) {
  const active = Math.max(0, Number(activeAssignmentSlot) || 0)
  const total = Math.max(0, Number(totalSlots) || 0)
  const nextSlot = active === 0 ? (total > 0 ? 1 : null) : active < total ? active + 1 : null
  const prevSlot = active > 1 ? active - 1 : null
  const allDone = total > 0 && active >= total
  return { active, total, nextSlot, prevSlot, allDone }
}

function slotStepStatus(slot, active, focused) {
  if (active > 0 && slot === active) return 'live'
  if (slot === focused) return 'focused'
  return 'idle'
}

export function AdvancedSlotActivationPanel({
  slotStats = [],
  activeAssignmentSlot = 0,
  isSessionLive = false,
  readOnly = false,
  onActivateAssignmentSlot,
  onDeactivateAssignmentSlot,
  slotActivationPending = false,
  assignmentsLoading = false,
  compact = false,
  className = '',
}) {
  const canControl =
    Boolean(onActivateAssignmentSlot) && isSessionLive && !readOnly
  const canDeactivate =
    Boolean(onDeactivateAssignmentSlot) && isSessionLive && !readOnly
  const total = slotStats.length
  const active = Math.max(0, Number(activeAssignmentSlot) || 0)

  const [focusedSlot, setFocusedSlot] = useState(() =>
    active > 0 ? active : total > 0 ? 1 : 1,
  )

  // Only sync focus when the host activates a different slot (not while browsing).
  useEffect(() => {
    if (active > 0) {
      setFocusedSlot(active)
    }
  }, [active])

  useEffect(() => {
    setFocusedSlot((prev) => {
      if (total <= 0) return 1
      if (prev >= 1 && prev <= total) return prev
      return 1
    })
  }, [total])

  const focused = Math.min(Math.max(focusedSlot, 1), Math.max(total, 1))
  const focusedStats = slotStats.find((s) => s.slot === focused)
  const isFocusedLive = active > 0 && focused === active
  const prevFocus = focused > 1 ? focused - 1 : null
  const nextFocus = focused < total ? focused + 1 : null

  const handleToggleLive = () => {
    if (slotActivationPending || readOnly || !isSessionLive) return
    if (isFocusedLive) {
      if (!canDeactivate) return
      onDeactivateAssignmentSlot()
      return
    }
    if (!canControl) return
    onActivateAssignmentSlot(focused)
  }

  const handleGoPrevious = () => {
    if (!prevFocus || readOnly) return
    setFocusedSlot(prevFocus)
  }

  const handleGoNext = () => {
    if (!nextFocus || readOnly) return
    setFocusedSlot(nextFocus)
  }

  const handleSelectStep = (slot) => {
    if (readOnly) return
    setFocusedSlot(slot)
  }

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-2xl border border-emerald-200/80 bg-white/95 ${compact ? '' : 'min-h-0 flex-1'} ${className}`}
    >
      <div className="shrink-0 border-b border-slate-100 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
          Host-paced sequence
        </p>
        <p className="mt-0.5 text-sm text-slate-600">
          Browse with Previous / Next, then use Activate to open that step for participants.
        </p>
      </div>

      <div className={`${compact ? 'p-4' : 'min-h-0 flex-1 overflow-y-auto p-4 sm:p-5'}`}>
        {!isSessionLive ? (
          <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Launch the session before activating questions.
          </p>
        ) : null}

        {assignmentsLoading ? (
          <p className="text-sm text-slate-500">Loading participant assignments…</p>
        ) : null}

        {!assignmentsLoading && total === 0 ? (
          <p className="text-sm text-slate-500">
            Set questions per participant (K) in the builder, then go live.
          </p>
        ) : null}

        {!assignmentsLoading && total > 0 ? (
          <div className="space-y-5">
            <div className="overflow-x-auto pb-1">
              <div className="flex min-w-min items-center gap-0 px-1">
                {slotStats.map(({ slot }, index) => {
                  const status = slotStepStatus(slot, active, focused)
                  const isLast = index === slotStats.length - 1
                  const stepLabel =
                    status === 'live' ? 'Live' : status === 'focused' ? 'Selected' : ''
                  return (
                    <div key={`step-${slot}`} className="flex items-center">
                      <button
                        type="button"
                        disabled={readOnly}
                        onClick={() => handleSelectStep(slot)}
                        className="flex flex-col items-center gap-1 disabled:cursor-not-allowed"
                        title={
                          status === 'live'
                            ? `Question ${slot} is live`
                            : `Select Question ${slot}`
                        }
                      >
                        <div
                          className={`flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition ${
                            status === 'live'
                              ? 'bg-emerald-600 text-white ring-4 ring-emerald-200'
                              : status === 'focused'
                                ? 'border-2 border-emerald-500 bg-white text-emerald-800'
                                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                          }`}
                        >
                          {slot}
                        </div>
                        {stepLabel ? (
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                            {stepLabel}
                          </span>
                        ) : (
                          <span className="h-[14px]" aria-hidden />
                        )}
                      </button>
                      {!isLast ? (
                        <div
                          className={`mx-1 h-0.5 w-6 sm:w-10 ${
                            status === 'live' ? 'bg-emerald-300' : 'bg-slate-200'
                          }`}
                          aria-hidden
                        />
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>

            <div
              className={`rounded-2xl border p-5 sm:p-6 ${
                isFocusedLive
                  ? 'border-emerald-300 bg-linear-to-br from-emerald-50 to-white'
                  : 'border-slate-200 bg-slate-50/80'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  {isFocusedLive ? (
                    <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-700">
                      <Radio className="size-3.5 animate-pulse" />
                      Live now
                    </p>
                  ) : (
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      {active === 0
                        ? 'Not activated'
                        : `Question ${active} is live — this step is selected only`}
                    </p>
                  )}
                  <p className="mt-1 text-3xl font-bold text-navy-900">Question {focused}</p>
                  {focusedStats ? (
                    <p className="mt-2 text-sm text-slate-600">
                      {focusedStats.responseCount} response
                      {focusedStats.responseCount === 1 ? '' : 's'}
                      {focusedStats.assignedVariants > 0
                        ? ` · ${focusedStats.assignedVariants} pool variant${focusedStats.assignedVariants === 1 ? '' : 's'}`
                        : ''}
                    </p>
                  ) : null}
                </div>

                {(canControl || canDeactivate) && isSessionLive ? (
                  <button
                    type="button"
                    disabled={
                      slotActivationPending ||
                      (isFocusedLive ? !canDeactivate : !canControl)
                    }
                    onClick={handleToggleLive}
                    title={
                      isFocusedLive
                        ? 'Close this question for participants'
                        : 'Open this question for participants'
                    }
                    className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      isFocusedLive
                        ? 'border border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100'
                        : 'bg-linear-to-r from-emerald-700 to-emerald-600 text-white hover:brightness-110'
                    }`}
                  >
                    {slotActivationPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : isFocusedLive ? (
                      <PauseCircle className="size-4" />
                    ) : (
                      <Play className="size-4" />
                    )}
                    {slotActivationPending
                      ? 'Updating…'
                      : isFocusedLive
                        ? 'Inactivate'
                        : 'Activate'}
                  </button>
                ) : isFocusedLive ? (
                  <p className="rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-emerald-800">
                    Live
                  </p>
                ) : null}
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={!prevFocus || readOnly}
                  onClick={handleGoPrevious}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-navy-900 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none sm:min-w-[160px]"
                >
                  <ChevronLeft className="size-4" />
                  Previous
                  {prevFocus ? ` · Q${prevFocus}` : ''}
                </button>
                <button
                  type="button"
                  disabled={!nextFocus || readOnly}
                  onClick={handleGoNext}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-navy-900 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none sm:min-w-[160px]"
                >
                  {nextFocus ? `Next · Q${nextFocus}` : 'Next'}
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>

            <p className="text-center text-xs text-slate-500">
              Previous / Next only change which step you are viewing. Use Activate / Inactivate to
              control what participants see.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
