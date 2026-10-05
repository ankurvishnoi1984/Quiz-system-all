/**
 * Helpers for Advanced “Random K from marked eligible” host UI (Live + Present).
 */

export function isQuestionPoolEligible(question) {
  if (!question) return true
  if (question.poolEligible === false || question.pool_eligible === false) return false
  return true
}

/**
 * Split mapped questions into eligible-first sections for host lists.
 * Each item keeps `index` into the original `mappedQuestions` array (for selection).
 */
export function partitionQuestionsByPoolEligibility(mappedQuestions = []) {
  const eligible = []
  const ineligible = []
  ;(mappedQuestions || []).forEach((question, index) => {
    const entry = { question, index }
    if (isQuestionPoolEligible(question)) eligible.push(entry)
    else ineligible.push(entry)
  })
  return { eligible, ineligible, eligibleCount: eligible.length, totalCount: mappedQuestions.length }
}
