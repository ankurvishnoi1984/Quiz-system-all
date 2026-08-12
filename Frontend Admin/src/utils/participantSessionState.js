export const PARTICIPANT_PROGRESS_FIELDS = [
  'quizResponses',
  'quizQuestionIndex',
  'quizLiveQuestionId',
  'quizSubmitted',
  'quizSubmittedQuestionIds',
  'quizExplicitSubmittedQuestionIds',
  'quizCountdownByQuestion',
  'quizSessionCountdown',
  'quizQuestionOpenedAt',
  'quizQuestionOrder',
]

export function pickParticipantProgressState(state = {}) {
  return {
    quizResponses: state.quizResponses || {},
    quizQuestionIndex: Number.isFinite(Number(state.quizQuestionIndex))
      ? Number(state.quizQuestionIndex)
      : 0,
    quizLiveQuestionId:
      state.quizLiveQuestionId != null && state.quizLiveQuestionId !== ''
        ? Number(state.quizLiveQuestionId)
        : null,
    quizSubmitted: Boolean(state.quizSubmitted),
    quizSubmittedQuestionIds: state.quizSubmittedQuestionIds || {},
    quizExplicitSubmittedQuestionIds: state.quizExplicitSubmittedQuestionIds || {},
    quizCountdownByQuestion: state.quizCountdownByQuestion || {},
    quizSessionCountdown: state.quizSessionCountdown ?? null,
    quizQuestionOpenedAt: state.quizQuestionOpenedAt || {},
    quizQuestionOrder: Array.isArray(state.quizQuestionOrder)
      ? state.quizQuestionOrder.map(Number).filter((id) => Number.isFinite(id) && id > 0)
      : [],
  }
}

export function hasParticipantProgressChanged(current = {}, previous = {}) {
  return PARTICIPANT_PROGRESS_FIELDS.some((field) => current[field] !== previous[field])
}
