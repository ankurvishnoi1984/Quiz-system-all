import { useRef } from 'react'
import { CheckCircle2, CircleDashed, ListChecks, Pencil } from 'lucide-react'
import { QuestionMedia } from '../../../components/participant-session/QuestionMedia'
import { FitText } from '../../../components/ui/FitText'
import { useParticipantSubmitVisibleDensity } from '../../../hooks/useParticipantSubmitVisibleDensity'
import { getParticipantDensityLevel } from '../utils/participantQuestionDensity'
import { ParticipantFitProvider } from './ParticipantFitContext'
import { McqOptions } from './question/McqOptions'
import { QuestionLeaderboard } from './question/QuestionLeaderboard'
import { QuestionSurveyResults } from './question/QuestionSurveyResults'
import { QuestionTimer } from './question/QuestionTimer'
import { RatingOptions } from './question/RatingOptions'
import { RankingOptions } from './question/RankingOptions'
import { MatchOptions } from './question/MatchOptions'
import { TextResponse } from './question/TextResponse'
import { TrueFalseOptions } from './question/TrueFalseOptions'
import { WordCloudInput } from './question/WordCloudInput'
import { EmojiReactionOptions } from './question/EmojiReactionOptions'

export function ActiveQuestionPanel({
  question,
  activeQuestions,
  displayQuestionIndex,
  questionSerialNumber = null,
  questionSerialTotal = null,
  answeredCount = 0,
  leftBlankCount = 0,
  hasCountdown,
  hasQuestionCountdown = false,
  canGoToNextQuestion,
  inputsLocked,
  wordCloudInputsLocked = false,
  submissionsClosed = false,
  allQuestionsClosedByHost = false,
  hasAnyQuestionSaved,
  timeLimit,
  timer,
  questionTimer = null,
  questionTimeLimit = 0,
  submittedAtSeconds,
  questionSubmittedAtSeconds = null,
  currentResponse,
  answerRevealMeta,
  hasSubmittedQuestion,
  canSeeAnswerReveal,
  participantAnswerIsCorrect,
  sessionEnded = false,
  navigationEnabled = true,
  syncedQuestionLockstep = false,
  canShowPreviousQuestion = false,
  sessionQuizTotalTimeEnabled = false,
  lastQuestionFinalized = false,
  lastActivatedLiveQuestion = null,
  highlightNextButton = false,
  showNewQuestionAlert = false,
  tagsInput,
  submitted,
  isLastDisplayedQuestion,
  isSubmitting,
  hasFinalizePayload,
  showCurrentQuestionLeaderboard,
  currentQuestionLeaderboard,
  showCurrentSurveyResults,
  surveyResults,
  surveyResultsLoading,
  onTagsInputChange,
  onAddTag,
  onSelectOption,
  onSelectRating,
  onTextChange,
  onRankingChange,
  onMatchingChange,
  onToggleEmojiOption,
  onPrevious,
  onNextOrSubmit,
  onGoToQa,
}) {
  const useNextNav = navigationEnabled && !isLastDisplayedQuestion && !syncedQuestionLockstep
  const useLockstepSubmit = Boolean(syncedQuestionLockstep && navigationEnabled)
  const panelRef = useRef(null)
  const actionsRef = useRef(null)
  const hasMedia = Boolean(question?.media?.url)
  const contentKey = `${question?.id}:${question?.text || ''}:${question?.media?.url || ''}:${(question?.options || []).length}`
  const densityId = useParticipantSubmitVisibleDensity({
    panelRef,
    actionsRef,
    contentKey,
    hasMedia,
  })
  const density = getParticipantDensityLevel(densityId)
  const questionSerial =
    Number.isFinite(Number(questionSerialNumber)) && Number(questionSerialNumber) > 0
      ? Number(questionSerialNumber)
      : Number.isFinite(Number(displayQuestionIndex)) && Number(displayQuestionIndex) >= 0
        ? Number(displayQuestionIndex) + 1
        : null
  const serialTotal =
    questionSerialTotal == null
      ? null
      : Number.isFinite(Number(questionSerialTotal)) && Number(questionSerialTotal) > 0
        ? Number(questionSerialTotal)
        : null
  const questionTitleBase =
    question.type === 'Emoji Reaction' && !String(question.text || '').trim()
      ? 'Share your reaction'
      : question.text || 'Untitled question'
  const questionTitle =
    questionSerial != null ? `Q${questionSerial}. ${questionTitleBase}` : questionTitleBase
  const serialLabel = questionSerial ?? displayQuestionIndex + 1
  const answered = Math.max(0, Number(answeredCount) || 0)
  const leftBlank = Math.max(0, Number(leftBlankCount) || 0)
  const showAttemptProgress = answered + leftBlank > 0
  const answeredLabel = answered === 1 ? '1 answered' : `${answered} answered`
  const leftBlankLabel = leftBlank === 1 ? '1 left blank' : `${leftBlank} left blank`

  const attemptProgress = showAttemptProgress ? (
    <div
      className="flex flex-wrap items-center gap-1.5"
      aria-label={`${answeredLabel}, ${leftBlankLabel} so far`}
    >
      <span
        className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 ring-1 ring-emerald-200/80"
        title="Questions you have selected or filled in so far"
      >
        <CheckCircle2 className="size-3 shrink-0" aria-hidden />
        {answeredLabel}
      </span>
      <span
        className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200/80"
        title="Reached questions with no answer yet (includes skipped or timed out)"
      >
        <CircleDashed className="size-3 shrink-0" aria-hidden />
        {leftBlankLabel}
      </span>
    </div>
  ) : null

  return (
    <ParticipantFitProvider densityId={densityId}>
    <section
      ref={panelRef}
      key={question.id}
      data-pq-density={densityId}
      className={`participant-surface quiz-fade-in rounded-2xl border border-blue-200/70 bg-white shadow-sm shadow-navy-900/5 ${density.panelClass}`}
    >
      {navigationEnabled ? (
      <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
            <p className="participant-accent-text min-w-0 truncate text-xs font-semibold uppercase tracking-wider text-navy-700">
              {serialTotal != null
                ? `Question ${serialLabel} / ${serialTotal}`
                : `Question ${serialLabel}`}
            </p>
            {attemptProgress}
          </div>
        {sessionQuizTotalTimeEnabled && !canShowPreviousQuestion && (
          <p className="max-w-[min(100%,20rem)] text-right text-[11px] font-medium leading-snug text-slate-500">
            Submit the last question or wait for the quiz timer to end.
          </p>
        )}
        {sessionQuizTotalTimeEnabled && canShowPreviousQuestion && (
          <p className="max-w-[min(100%,20rem)] text-right text-[11px] font-medium leading-snug text-slate-500">
            {allQuestionsClosedByHost
              ? 'Questions closed by the host — use Previous and Next to review your answers.'
              : lastQuestionFinalized
                ? 'Answers are locked — use Previous and Next to review only.'
                : 'Quiz timer: use Previous and Next to review your answers.'}
          </p>
        )}
        {/* {hasQuestionCountdown && !canGoToNextQuestion && (
          <p className="max-w-[min(100%,20rem)] text-right text-[11px] font-medium leading-snug text-slate-500">
            Answer this question or wait for the question timer to use Next.
          </p>
        )} */}
        {hasQuestionCountdown &&
          canGoToNextQuestion &&
          inputsLocked &&
          canShowPreviousQuestion &&
          !sessionQuizTotalTimeEnabled && (
          <p className="max-w-[min(100%,20rem)] text-right text-[11px] font-medium leading-snug text-slate-500">
            Timed: use Previous and Next to browse; answers cannot be changed after submit or when
            time runs out.
          </p>
        )}
        {hasQuestionCountdown &&
          canGoToNextQuestion &&
          inputsLocked &&
          !canShowPreviousQuestion &&
          !sessionQuizTotalTimeEnabled && (
          <p className="max-w-[min(100%,20rem)] text-right text-[11px] font-medium leading-snug text-slate-500">
            Submit the latest active question before you can use Previous.
          </p>
        )}
        {!hasCountdown && hasAnyQuestionSaved && canShowPreviousQuestion && (
          <p className="max-w-[min(100%,18rem)] text-right text-[11px] font-medium leading-snug text-slate-500">
            No timer: revisit questions with Previous; use Submit on the last question to update.
          </p>
        )}
      </div>
      ) : showAttemptProgress ? (
        <div className="flex flex-wrap items-center gap-2">{attemptProgress}</div>
      ) : null}

      {showNewQuestionAlert ? (
        <p className="quiz-pop rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
          {highlightNextButton
            ? 'New question available — tap Next to view it.'
            : 'New question available — use Previous to view it.'}
        </p>
      ) : null}

      {allQuestionsClosedByHost ? (
        <p className="rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
          All questions are closed by the host and no longer accepting submissions.
        </p>
      ) : null}

      {submissionsClosed && !allQuestionsClosedByHost && !question?.openForReattempt ? (
        <p className="rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
          This question was closed by the host and is no longer accepting submissions.
        </p>
      ) : null}

      {hasQuestionCountdown && !question.isSurvey ? (
        <QuestionTimer
          variant="compact"
          label="Question time"
          timer={questionTimer ?? timer}
          timeLimit={questionTimeLimit || timeLimit}
          submittedAtSeconds={questionSubmittedAtSeconds ?? submittedAtSeconds}
          timerSoundKey={question.timerSoundKey}
          timerSoundUrl={question.timerSoundUrl}
          timerEndingSoundKey={question.timerEndingSoundKey}
          timerEndingSoundUrl={question.timerEndingSoundUrl}
          timerSoundStartSeconds={question.timerSoundStartSeconds}
        />
      ) : null}

      <FitText
        as="h2"
        className="participant-heading font-bold leading-snug text-navy-900"
        minPx={density.title.minPx}
        maxPx={density.title.maxPx}
        maxLines={density.title.maxLines}
      >
        {questionTitle}
      </FitText>

      <QuestionMedia media={question.media} maxHeightClass={density.mediaMaxHeightClass} />

      {(question.type === 'MCQ' || question.type === 'Poll') && question.allowMultipleSelect && (
        <div className="flex gap-3 rounded-xl border border-indigo-200 bg-indigo-50/90 px-3 py-2.5">
          <ListChecks className="mt-0.5 size-4 shrink-0 text-indigo-700" aria-hidden />
          <p className="text-sm font-medium text-indigo-900">
            Select all that apply — you can choose more than one option.
          </p>
        </div>
      )}

      {(question.type === 'MCQ' || question.type === 'Poll') && (
        <McqOptions
          options={question.options}
          currentResponse={currentResponse}
          inputsLocked={inputsLocked}
          answerRevealMeta={answerRevealMeta}
          canSeeAnswerReveal={
            question.isSurvey || question.type === 'Poll' ? false : canSeeAnswerReveal
          }
          allowMultipleSelect={Boolean(question.allowMultipleSelect)}
          onSelectOption={(optionText) => onSelectOption(question.id, optionText)}
        />
      )}

      {question.type === 'Rating' && (
        <RatingOptions
          question={question}
          currentResponse={currentResponse}
          inputsLocked={inputsLocked}
          onSelectRating={(rating) => onSelectRating(question.id, rating)}
        />
      )}

      {question.type === 'Text' && (
        <TextResponse
          currentResponse={currentResponse}
          inputsLocked={inputsLocked}
          onTextChange={(text) => onTextChange(question.id, text)}
        />
      )}

      {question.type === 'Ranking' && (
        <RankingOptions
          question={question}
          currentResponse={currentResponse}
          inputsLocked={inputsLocked}
          onRankingChange={(rankingOrder) => onRankingChange(question.id, rankingOrder)}
        />
      )}

      {question.type === 'Match' && (
        <MatchOptions
          question={question}
          currentResponse={currentResponse}
          inputsLocked={inputsLocked}
          canSeeAnswerReveal={canSeeAnswerReveal}
          correctMatchingPairs={
            answerRevealMeta?.correctMatchingPairs || question.correctMatchingPairs
          }
          onMatchingChange={(matchingPairs) => onMatchingChange(question.id, matchingPairs)}
        />
      )}

      {question.type === 'Emoji Reaction' && (
        <EmojiReactionOptions
          question={question}
          currentResponse={currentResponse}
          inputsLocked={inputsLocked}
          hasSubmitted={hasSubmittedQuestion}
          onToggleOption={(emoji) => onToggleEmojiOption(question.id, emoji)}
        />
      )}

      {question.type === 'Word Cloud' && (
        <WordCloudInput
          tagsInput={tagsInput}
          currentResponse={currentResponse}
          inputsLocked={wordCloudInputsLocked}
          onTagsInputChange={onTagsInputChange}
          onAddTag={() => onAddTag(question.id)}
        />
      )}

      {question.type === 'True/False' && (
        <TrueFalseOptions
          question={question}
          currentResponse={currentResponse}
          inputsLocked={inputsLocked}
          answerRevealMeta={answerRevealMeta}
          canSeeAnswerReveal={canSeeAnswerReveal}
          onSelectOption={(optionText) => onSelectOption(question.id, optionText)}
        />
      )}

      <div
        ref={actionsRef}
        className={`mt-3 flex items-center gap-2 ${
          navigationEnabled ? 'justify-between' : 'justify-center'
        }`}
      >
        {navigationEnabled && canShowPreviousQuestion ? (
          <button
            type="button"
            aria-label="Previous question"
            disabled={displayQuestionIndex <= 0}
            onClick={onPrevious}
            className="participant-btn-secondary h-11 rounded-xl border border-blue-200/70 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
        ) : (
          <span className="h-11 w-0 shrink-0" aria-hidden />
        )}
        <div
          className={`flex flex-wrap items-center gap-2 ${navigationEnabled ? 'justify-end' : 'justify-center'}`}
        >
          {navigationEnabled && isLastDisplayedQuestion && submitted && !hasCountdown && onGoToQa ? (
            <button
              type="button"
              onClick={onGoToQa}
              className="h-11 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-100"
            >
              Go to Q&A
            </button>
          ) : null}
          {/* Q&A feature disabled — pass onGoToQa from parent to re-enable the button above */}
          {question.type !== 'Emoji Reaction' ||
          hasFinalizePayload ||
          useNextNav ||
          useLockstepSubmit ? (
          <button
            type="button"
            aria-label={
              useLockstepSubmit
                ? 'Submit answer'
                : useNextNav
                  ? 'Next question'
                  : question.type === 'Emoji Reaction'
                    ? 'Submit reaction'
                    : 'Submit answer'
            }
            disabled={
              sessionEnded ||
              isSubmitting ||
              (useLockstepSubmit
                ? hasQuestionCountdown && !canGoToNextQuestion
                : useNextNav
                  ? hasQuestionCountdown && !canGoToNextQuestion
                  : (submissionsClosed && !question?.openForReattempt) ||
                    (allQuestionsClosedByHost && !question?.openForReattempt) ||
                    inputsLocked ||
                    !hasFinalizePayload ||
                    (hasQuestionCountdown && !canGoToNextQuestion))
            }
            title={
              sessionEnded
                ? 'Session has ended'
                : useLockstepSubmit
                  ? hasQuestionCountdown && !canGoToNextQuestion
                    ? 'Wait for the question timer to finish'
                    : undefined
                  : useNextNav
                    ? hasQuestionCountdown && !canGoToNextQuestion
                      ? 'Answer this question or wait for the question timer'
                      : undefined
                    : allQuestionsClosedByHost && !question?.openForReattempt
                      ? 'All questions are closed by the host'
                      : submissionsClosed && !question?.openForReattempt
                        ? 'This question was closed by the host'
                        : hasQuestionCountdown && !canGoToNextQuestion
                          ? 'Answer this question or wait for the question timer'
                          : !hasFinalizePayload
                            ? 'Answer this question before submitting'
                            : undefined
            }
            onClick={onNextOrSubmit}
            className={`participant-btn-primary h-11 rounded-xl bg-linear-to-r from-navy-900 via-navy-700 to-navy-600 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-900/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 ${
              highlightNextButton && useNextNav ? 'participant-next-highlight' : ''
            }`}
          >
            {isSubmitting
              ? 'Submitting...'
              : useLockstepSubmit
                ? 'Submit'
                : useNextNav
                  ? 'Next'
                  : question.type === 'Emoji Reaction'
                    ? 'Submit reaction'
                    : 'Submit'}
          </button>
          ) : null}
        </div>
      </div>

      {navigationEnabled &&
        lastQuestionFinalized &&
        !sessionEnded &&
        !sessionQuizTotalTimeEnabled && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-emerald-900">
            {question?.isSurvey ? 'Survey submitted' : 'Quiz submitted'}
          </p>
          <p className="mt-1 text-xs text-emerald-800">
            Your answers are final. You can browse questions with Previous and Next, or open Q&amp;A
            when ready.
          </p>
        </div>
      )}

      {navigationEnabled && submitted && !hasCountdown && !sessionEnded && !lastQuestionFinalized && (
        <div className="flex gap-3 rounded-2xl border border-sky-200 bg-sky-50/90 p-4">
          <Pencil className="mt-0.5 size-5 shrink-0 text-sky-700" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-navy-900">Modify your responses anytime</p>
            <p className="mt-1 text-xs text-slate-600">
              There is no timer on this question. Change your answer above and use Submit when you
              are on the last question to update your submission.
            </p>
          </div>
        </div>
      )}

      {sessionEnded && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-800">Session ended by host</p>
          <p className="mt-1 text-xs text-slate-600">
            This session was ended by the host. You can review your answers but cannot submit new
            responses.
          </p>
        </div>
      )}

      {(question.type === 'Poll' || question.type === 'Emoji Reaction' || question.isSurvey) &&
        hasSubmittedQuestion &&
        (!navigationEnabled || isLastDisplayedQuestion) &&
        question.type !== 'Emoji Reaction' && (
        <div className="quiz-banner-in rounded-2xl border border-violet-200 bg-violet-50 p-4 text-center">
          <p className="text-sm font-semibold text-violet-800">Thanks for your response!</p>
        </div>
      )}

      {canSeeAnswerReveal &&
        hasSubmittedQuestion &&
        !question.isSurvey &&
        (question.type === 'MCQ' || question.type === 'True/False' || question.type === 'Match') &&
        participantAnswerIsCorrect !== null && (
          <div
            className={`rounded-2xl border p-4 ${
              participantAnswerIsCorrect
                ? 'quiz-banner-in border-emerald-200 bg-emerald-50'
                : 'quiz-banner-wrong border-red-200 bg-red-50'
            }`}
          >
            <p
              className={`text-sm font-semibold ${
                participantAnswerIsCorrect ? 'text-emerald-800' : 'text-red-800'
              }`}
            >
              {participantAnswerIsCorrect
                ? question.type === 'Match'
                  ? 'All pairs correct'
                  : 'Correct Answer'
                : question.type === 'Match'
                  ? 'Some pairs were incorrect'
                  : 'Incorrect Answer'}
            </p>
          </div>
        )}

      {showCurrentQuestionLeaderboard && (
        <QuestionLeaderboard entries={currentQuestionLeaderboard} />
      )}

      {showCurrentSurveyResults && (
        <QuestionSurveyResults
          question={question}
          results={surveyResults}
          isLoading={surveyResultsLoading}
        />
      )}
    </section>
    </ParticipantFitProvider>
  )
}
