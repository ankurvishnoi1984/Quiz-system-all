import { FitText } from '../../../../components/ui/FitText'
import { getChoiceRevealClasses, isOptionCorrectForReveal } from '../../../../utils/answerReveal'
import { getTrueFalseChoices } from '../../utils/questionUtils'
import { useParticipantFit } from '../ParticipantFitContext'

export function TrueFalseOptions({
  question,
  currentResponse,
  inputsLocked,
  answerRevealMeta,
  canSeeAnswerReveal,
  onSelectOption,
}) {
  const fit = useParticipantFit()
  return (
    <div className={`grid sm:grid-cols-2 ${fit.id >= 2 ? 'gap-1.5' : 'gap-2'}`}>
      {getTrueFalseChoices(question).map((o) => {
        const label = o.option_text
        const isSelected =
          String(currentResponse.selectedOption || '').trim().toLowerCase() ===
          String(label).trim().toLowerCase()
        const isCorrect = isOptionCorrectForReveal(o, answerRevealMeta)
        return (
          <button
            disabled={inputsLocked}
            key={label}
            type="button"
            onClick={() => onSelectOption(label)}
            className={`quiz-option rounded-2xl border font-semibold transition ${fit.optionPadClass} ${
              isSelected ? 'quiz-option-selected' : ''
            } ${getChoiceRevealClasses({
              isSelected,
              isCorrectOption: isCorrect,
              answerRevealed: canSeeAnswerReveal,
            })}`}
          >
            <FitText
              as="span"
              className="leading-snug"
              minPx={fit.option.minPx}
              maxPx={fit.option.maxPx}
              maxLines={fit.option.maxLines}
            >
              {label}
            </FitText>
          </button>
        )
      })}
    </div>
  )
}
