import { Check } from 'lucide-react'
import { FitText } from '../../../../components/ui/FitText'
import { getChoiceRevealClasses, isOptionCorrectForReveal } from '../../../../utils/answerReveal'
import { useParticipantFit } from '../ParticipantFitContext'

export function McqOptions({
  options,
  currentResponse,
  inputsLocked,
  answerRevealMeta,
  canSeeAnswerReveal,
  allowMultipleSelect = false,
  onSelectOption,
}) {
  const fit = useParticipantFit()
  const selectedList = Array.isArray(currentResponse.selectedOptions)
    ? currentResponse.selectedOptions
    : currentResponse.selectedOption
      ? [currentResponse.selectedOption]
      : []

  return (
    <div className={`grid md:grid-cols-2 ${fit.id >= 2 ? 'gap-1.5' : 'gap-2'}`}>
      {(options || []).map((o, idx) => {
        const isSelected = allowMultipleSelect
          ? selectedList.includes(o.option_text)
          : currentResponse.selectedOption === o.option_text
        const isCorrect = isOptionCorrectForReveal(o, answerRevealMeta)
        return (
          <button
            key={o.option_id}
            disabled={inputsLocked}
            type="button"
            onClick={() => onSelectOption(o.option_text)}
            className={`quiz-option rounded-2xl border text-left font-semibold transition ${fit.optionPadClass} ${
              isSelected ? 'quiz-option-selected' : ''
            } ${getChoiceRevealClasses({
              isSelected,
              isCorrectOption: isCorrect,
              answerRevealed: canSeeAnswerReveal,
            })}`}
          >
            <span className="flex items-start gap-2">
              <span className="participant-option-badge inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs">
                {allowMultipleSelect && isSelected ? (
                  <Check className="size-3.5 text-navy-800" aria-hidden />
                ) : (
                  String.fromCharCode(65 + idx)
                )}
              </span>
              <FitText
                as="span"
                className="min-w-0 flex-1 leading-snug"
                minPx={fit.option.minPx}
                maxPx={fit.option.maxPx}
                maxLines={fit.option.maxLines}
              >
                {o.option_text}
              </FitText>
            </span>
          </button>
        )
      })}
    </div>
  )
}
