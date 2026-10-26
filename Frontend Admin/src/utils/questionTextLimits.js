/** Shared authoring + participant readability limits for question/option text. */

export const QUESTION_TEXT_MAX_CHARS = 500
export const OPTION_TEXT_MAX_CHARS = 200

export const PARTICIPANT_TITLE_MIN_PX = 14
export const PARTICIPANT_OPTION_MIN_PX = 12

export function clipToMaxChars(value, maxChars) {
  const text = value == null ? '' : String(value)
  if (text.length <= maxChars) return text
  return text.slice(0, maxChars)
}

export function isWithinMaxChars(value, maxChars) {
  return String(value ?? '').length <= maxChars
}

/** Returns a short error message if question/option text exceeds limits; otherwise null. */
export function getQuestionTextLimitError(question) {
  if (!question) return null
  const qText = String(question.text ?? '').trim()
  if (qText.length > QUESTION_TEXT_MAX_CHARS) {
    return `Question text must be at most ${QUESTION_TEXT_MAX_CHARS} characters (currently ${qText.length}).`
  }

  const options = Array.isArray(question.options) ? question.options : []
  for (let i = 0; i < options.length; i += 1) {
    const optText = String(options[i]?.text ?? '').trim()
    if (optText.length > OPTION_TEXT_MAX_CHARS) {
      return `Option ${i + 1} must be at most ${OPTION_TEXT_MAX_CHARS} characters (currently ${optText.length}).`
    }
  }

  const pairs = Array.isArray(question.matchPairs) ? question.matchPairs : []
  for (let i = 0; i < pairs.length; i += 1) {
    const left = String(pairs[i]?.left ?? '').trim()
    const right = String(pairs[i]?.right ?? '').trim()
    if (left.length > OPTION_TEXT_MAX_CHARS) {
      return `Match pair ${i + 1} left text must be at most ${OPTION_TEXT_MAX_CHARS} characters.`
    }
    if (right.length > OPTION_TEXT_MAX_CHARS) {
      return `Match pair ${i + 1} right text must be at most ${OPTION_TEXT_MAX_CHARS} characters.`
    }
  }

  return null
}
