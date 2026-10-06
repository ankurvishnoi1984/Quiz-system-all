import {
  isAdvancedBuilderSession,
  isSessionRandomQuestionOrderEnabled,
} from './sessionFlags'

/** Untimed single-active-question sessions: host may close submissions while question stays live. */
export function canHostCloseQuestion(question, singleActiveQuestionMode) {
  if (!singleActiveQuestionMode || !question?.isLive) return false
  if (Number(question?.timeLimit ?? 0) > 0) return false
  return !question.submissionsClosed
}

/** Untimed multi-question sessions: close all live questions at once. */
export function canHostCloseAllQuestions(questions, { canEditLive, singleActiveQuestionMode }) {
  if (!canEditLive || singleActiveQuestionMode) return false
  const live = (questions || []).filter((q) => q.isLive)
  if (!live.length) return false
  if (live.some((q) => Number(q.timeLimit ?? 0) > 0)) return false
  return live.some((q) => !q.submissionsClosed)
}

/** Advanced Present: host activates participant slots 1..K (not full pool at once). */
export function sessionUsesAdvancedSlotActivation(session) {
  return isAdvancedBuilderSession(session)
}

/** Per-question Activate is hidden when sets, random order, or Advanced pool require all-or-nothing. */
export function sessionRequiresActivateAllQuestions(session, mappedQuestions, sessionUsesQuestionSets) {
  if (sessionUsesAdvancedSlotActivation(session)) return true
  if (typeof sessionUsesQuestionSets === 'function') {
    return sessionUsesQuestionSets(mappedQuestions) || isSessionRandomQuestionOrderEnabled(session)
  }
  return Boolean(sessionUsesQuestionSets) || isSessionRandomQuestionOrderEnabled(session)
}

/** Multi-question sessions (timed or untimed): activate every question at once. */
export function canHostActivateAllQuestions(
  questions,
  { canEditLive, singleActiveQuestionMode, sessionQuizTotalTimeEnabled = false },
) {
  if (sessionQuizTotalTimeEnabled) return false
  if (!canEditLive || singleActiveQuestionMode) return false
  const list = questions || []
  if (!list.length) return false
  return list.some((q) => !q.isLive)
}
