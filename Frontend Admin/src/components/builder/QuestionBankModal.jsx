import { Check, Eye, Library, LoaderCircle, Search, Shuffle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import Modal from '../ui/Modal'
import { QuestionMedia } from '../participant-session/QuestionMedia'
import { mapApiMediaToQuestionMedia } from '../../utils/questionMedia'
import {
  addQuestionBankQuestionsToSessionApi,
  addRandomQuestionBankQuestionsApi,
  listQuestionBankQuestionsApi,
  listQuestionBankTopicsApi,
} from '../../services/questionBankApi'

const TYPES = [
  { api: 'mcq', ui: 'MCQ' },
  { api: 'poll', ui: 'Poll' },
  { api: 'survey', ui: 'Survey' },
  { api: 'word_cloud', ui: 'Word Cloud' },
  { api: 'rating', ui: 'Rating' },
  { api: 'open_text', ui: 'Text' },
  { api: 'true_false', ui: 'True/False' },
  { api: 'ranking', ui: 'Ranking' },
  { api: 'emoji_reaction', ui: 'Emoji Reaction' },
]

function apiTypeFromUi(value) {
  return TYPES.find((type) => type.ui === value)?.api || ''
}

function distributeDifficultyCounts(total) {
  const safeTotal = Math.max(1, Number(total) || 10)
  const base = Math.floor(safeTotal / 3)
  const remainder = safeTotal % 3
  return {
    easy: base + (remainder > 0 ? 1 : 0),
    medium: base + (remainder > 1 ? 1 : 0),
    hard: base,
  }
}

export function QuestionBankModal({
  open,
  onClose,
  accessToken,
  sessionId,
  lockedType,
  remainingSlots,
  onAdded,
}) {
  const lockedApiType = apiTypeFromUi(lockedType)
  const [topicId, setTopicId] = useState('')
  const [difficulty, setDifficulty] = useState('mixed')
  const [questionType, setQuestionType] = useState(lockedApiType || 'mcq')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(() => new Set())
  const [mediaPreviewId, setMediaPreviewId] = useState(null)
  const [randomCount, setRandomCount] = useState(10)
  const [difficultyCounts, setDifficultyCounts] = useState(() =>
    distributeDifficultyCounts(10),
  )
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setTopicId('')
    setDifficulty('mixed')
    setQuestionType(lockedApiType || 'mcq')
    setSearch('')
    setSelected(new Set())
    setMediaPreviewId(null)
    const initialRandomCount = Math.max(1, Math.min(10, remainingSlots ?? 10))
    setRandomCount(initialRandomCount)
    setDifficultyCounts(distributeDifficultyCounts(initialRandomCount))
    setError('')
  }, [open, lockedApiType, remainingSlots])

  const topicsQuery = useQuery({
    queryKey: ['question-bank-topics', 'host-select'],
    queryFn: () => listQuestionBankTopicsApi(accessToken),
    enabled: Boolean(open && accessToken),
  })
  const topics = topicsQuery.data || []

  const questionsQuery = useQuery({
    queryKey: ['question-bank-approved', topicId, difficulty, questionType, search],
    queryFn: () =>
      listQuestionBankQuestionsApi(accessToken, {
        topic_id: topicId,
        difficulty,
        question_type: questionType,
        search,
        limit: 100,
      }),
    enabled: Boolean(open && accessToken && topicId && questionType),
  })
  const questions = questionsQuery.data?.questions || []

  const maxSelectable = remainingSlots == null ? 100 : Math.max(0, remainingSlots)
  const selectedIds = useMemo(() => [...selected].map(Number), [selected])

  const addMutation = useMutation({
    mutationFn: () =>
      addQuestionBankQuestionsToSessionApi(
        accessToken,
        sessionId,
        selectedIds,
      ),
    onSuccess: (result) => {
      onAdded?.(result)
      onClose()
    },
    onError: (err) => setError(err.message || 'Unable to add selected questions'),
  })

  const randomMutation = useMutation({
    mutationFn: () =>
      addRandomQuestionBankQuestionsApi(accessToken, sessionId, {
        topic_id: Number(topicId),
        difficulty,
        difficulty_counts: difficulty === 'mixed' ? difficultyCounts : undefined,
        question_type: questionType,
        count:
          difficulty === 'mixed'
            ? undefined
            : Math.max(1, Math.min(Number(randomCount) || 10, maxSelectable)),
      }),
    onSuccess: (result) => {
      onAdded?.(result)
      onClose()
    },
    onError: (err) => setError(err.message || 'Unable to add random questions'),
  })

  const toggle = (id) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
      } else if (next.size < maxSelectable) {
        next.add(id)
      } else {
        setError(`Your plan allows only ${maxSelectable} more question${maxSelectable === 1 ? '' : 's'}.`)
      }
      return next
    })
  }

  const busy = addMutation.isPending || randomMutation.isPending
  const mixedTotal = Object.values(difficultyCounts).reduce(
    (sum, value) => sum + (Number(value) || 0),
    0,
  )
  const randomRequested = difficulty === 'mixed' ? mixedTotal : Number(randomCount) || 0

  return (
    <Modal open={open} title="Select from Question Bank" onClose={onClose} size="xl">
      <div className="space-y-5">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="space-y-1 text-sm font-semibold text-slate-700">
            Topic
            <select value={topicId} onChange={(e) => { setTopicId(e.target.value); setSelected(new Set()) }} className="input-modern">
              <option value="">Select topic</option>
              {topics.map((topic) => (
                <option key={topic.topic_id} value={topic.topic_id}>
                  {topic.name} ({topic.approved_question_count || 0})
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm font-semibold text-slate-700">
            Difficulty
            <select value={difficulty} onChange={(e) => { setDifficulty(e.target.value); setSelected(new Set()) }} className="input-modern">
              <option value="mixed">Mixed</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </label>
          <label className="space-y-1 text-sm font-semibold text-slate-700">
            Type
            <select
              value={questionType}
              disabled={Boolean(lockedApiType)}
              onChange={(e) => { setQuestionType(e.target.value); setSelected(new Set()) }}
              className="input-modern"
            >
              {TYPES.map((type) => (
                <option key={type.api} value={type.api}>
                  {type.ui}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm font-semibold text-slate-700">
            Search
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} className="input-modern pl-9" placeholder="Question text" />
            </div>
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-violet-200 bg-linear-to-r from-violet-50 to-blue-50 p-4">
          <div>
            <p className="font-semibold text-violet-950">Add random questions</p>
            <p className="text-sm text-violet-700">Uses the selected topic, difficulty and type; existing bank questions are excluded.</p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            {difficulty === 'mixed' ? (
              <>
                {['easy', 'medium', 'hard'].map((level) => (
                  <label key={level} className="space-y-1 text-xs font-bold capitalize text-slate-700">
                    {level}
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={difficultyCounts[level]}
                      onChange={(event) =>
                        setDifficultyCounts((current) => ({
                          ...current,
                          [level]: Math.max(0, Number(event.target.value) || 0),
                        }))
                      }
                      className="input-modern block w-20"
                      aria-label={`${level} random question count`}
                    />
                  </label>
                ))}
                <div className="px-2 pb-2 text-sm font-bold text-violet-900">
                  Total: {mixedTotal}
                </div>
              </>
            ) : (
              <label className="space-y-1 text-xs font-bold text-slate-700">
                Quantity
                <input
                  type="number"
                  min="1"
                  max={Math.min(50, maxSelectable || 1)}
                  value={randomCount}
                  onChange={(e) => setRandomCount(e.target.value)}
                  className="input-modern block w-24"
                  aria-label="Random question count"
                />
              </label>
            )}
            <button
              type="button"
              disabled={
                !topicId ||
                !questionType ||
                busy ||
                maxSelectable <= 0 ||
                randomRequested < 1 ||
                randomRequested > Math.min(50, maxSelectable)
              }
              onClick={() => randomMutation.mutate()}
              className="inline-flex min-w-32 items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-violet-700/20 transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {randomMutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Shuffle className="size-4" />}
              Add random
            </button>
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        {!topicId ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
            Select a topic to browse approved questions.
          </div>
        ) : questionsQuery.isLoading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-slate-600">
            <LoaderCircle className="size-5 animate-spin" /> Loading approved questions…
          </div>
        ) : questions.length ? (
          <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
            {questions.map((question) => {
              const active = selected.has(question.bank_question_id)
              return (
                <div
                  role="button"
                  tabIndex={0}
                  key={question.bank_question_id}
                  onClick={() => toggle(question.bank_question_id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      toggle(question.bank_question_id)
                    }
                  }}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    active
                      ? 'border-blue-400 bg-blue-50'
                      : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded border ${active ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'}`}>
                      {active ? <Check className="size-3.5" /> : null}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap gap-2 text-xs font-semibold">
                        <span className="rounded-full bg-violet-50 px-2 py-0.5 text-violet-700">{question.difficulty}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{question.question_type.replaceAll('_', ' ')}</span>
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">
                          v{question.version || 1}
                        </span>
                      </div>
                      <p className="mt-2 font-semibold text-navy-950">{question.question_text}</p>
                      {question.options?.length ? (
                        <p className="mt-1 truncate text-sm text-slate-500">
                          {question.options.map((option) => option.option_text).join(' · ')}
                        </p>
                      ) : null}
                      {question.media_url ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            setMediaPreviewId((current) =>
                              current === question.bank_question_id
                                ? null
                                : question.bank_question_id,
                            )
                          }}
                          className="mt-3 inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-50"
                        >
                          <Eye className="size-4" />
                          {mediaPreviewId === question.bank_question_id
                            ? 'Hide media'
                            : 'View media'}
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {question.media_url &&
                  mediaPreviewId === question.bank_question_id ? (
                    <div
                      className="mt-4 border-t border-blue-100 pt-4"
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                      role="presentation"
                    >
                      <QuestionMedia
                        media={mapApiMediaToQuestionMedia(question)}
                        maxHeightClass="max-h-80"
                      />
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
            No approved questions match these filters.
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-4">
          <p className="text-sm text-slate-600">
            <strong className="font-bold text-slate-800">{selected.size}</strong> selected
            <span className="mx-2 text-slate-300">•</span>
            {remainingSlots == null
              ? 'Unlimited questions available'
              : `${remainingSlots} question ${remainingSlots === 1 ? 'slot' : 'slots'} available`}
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!selected.size || busy}
              onClick={() => addMutation.mutate()}
              className="inline-flex min-w-36 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-700 to-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-700/20 transition hover:from-blue-800 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {addMutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Library className="size-4" />}
              Add selected
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
