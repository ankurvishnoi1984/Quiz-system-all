export function questionSupportsAnswerReveal(questionType, isQuizMode) {
  const apiType =
    questionType === 'MCQ'
      ? 'mcq'
      : questionType === 'True/False'
        ? 'true_false'
        : questionType === 'Match'
          ? 'match'
          : questionType
  return (
    Boolean(isQuizMode) &&
    (apiType === 'mcq' || apiType === 'true_false' || apiType === 'match')
  )
}

/** MCQ / True-False option styling after the host reveals the answer key. */
export function getChoiceRevealClasses({
  isSelected,
  isCorrectOption,
  answerRevealed,
  selectedClass = 'border-blue-400 bg-blue-50 text-blue-900',
  defaultClass = 'border-blue-200/70 bg-white text-slate-700 hover:bg-blue-50',
}) {
  if (!answerRevealed) {
    return isSelected ? selectedClass : defaultClass
  }
  // quiz-option-reveal* locks correct/wrong colors outside participant themes
  if (isCorrectOption) {
    return 'quiz-option-reveal quiz-option-reveal--correct'
  }
  if (isSelected) {
    return 'quiz-option-reveal quiz-option-reveal--wrong'
  }
  return 'quiz-option-reveal quiz-option-reveal--muted'
}

export function isOptionCorrectForReveal(option, revealMeta) {
  if (!revealMeta?.correctOptionIds?.length) return false
  return revealMeta.correctOptionIds.includes(Number(option.option_id))
}

/** After reveal: whether the participant's MCQ / True-False / Match choice matches the key. */
export function isParticipantChoiceCorrect(question, currentResponse, revealMeta) {
  if (question?.type === 'Match') {
    const correct =
      revealMeta?.correctMatchingPairs ||
      question?.correctMatchingPairs ||
      null
    if (!correct || typeof correct !== 'object') return null
    const leftIds = Object.keys(correct)
    if (!leftIds.length) return null
    const submitted =
      currentResponse?.matchingPairs && typeof currentResponse.matchingPairs === 'object'
        ? currentResponse.matchingPairs
        : {}
    return leftIds.every(
      (leftId) => Number(submitted[leftId]) === Number(correct[leftId]),
    )
  }

  if (!revealMeta?.correctOptionIds?.length) return null
  if (question?.type !== 'MCQ' && question?.type !== 'True/False') return null

  const selected = String(currentResponse?.selectedOption || '').trim()
  if (!selected) return false

  const selectedOption = (question?.options || []).find(
    (o) => String(o.option_text).trim().toLowerCase() === selected.toLowerCase(),
  )
  if (!selectedOption?.option_id) return false

  return revealMeta.correctOptionIds.includes(Number(selectedOption.option_id))
}
