import {
  Archive,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  FileQuestion,
  LoaderCircle,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Search,
  Send,
  XCircle,
} from 'lucide-react'
import { useDeferredValue, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import Modal from '../components/ui/Modal'
import {
  archiveQuestionBankQuestionApi,
  createQuestionBankQuestionApi,
  listQuestionBankQuestionsApi,
  listQuestionBankTopicsApi,
  reviewQuestionBankQuestionApi,
  reviseQuestionBankQuestionApi,
  submitQuestionBankQuestionApi,
  updateQuestionBankQuestionApi,
} from '../services/questionBankApi'

const TYPES = [
  { value: 'mcq', label: 'Multiple Choice' },
  { value: 'poll', label: 'Poll' },
  { value: 'true_false', label: 'True / False' },
  { value: 'ranking', label: 'Ranking' },
  { value: 'word_cloud', label: 'Word Cloud' },
  { value: 'rating', label: 'Rating' },
  { value: 'open_text', label: 'Open Text' },
]
const FILTER_TYPES = [
  ...TYPES,
  { value: 'survey', label: 'Survey' },
  { value: 'emoji_reaction', label: 'Emoji Reaction' },
]

const STATUS_STYLE = {
  draft: 'bg-slate-100 text-slate-700',
  pending_review: 'bg-amber-100 text-amber-800',
  changes_requested: 'bg-orange-100 text-orange-800',
  rejected: 'bg-red-100 text-red-700',
  approved: 'bg-emerald-100 text-emerald-800',
  archived: 'bg-slate-200 text-slate-600',
}

function label(value) {
  return String(value || '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function emptyQuestion(topicId = '') {
  return {
    topic_id: topicId,
    topic_name: '',
    question_type: 'mcq',
    question_text: '',
    difficulty: 'medium',
    language: 'en',
    is_quiz_mode: true,
    allow_multiple_select: false,
    rating_min: 1,
    rating_max: 10,
    options: [
      { option_text: '', is_correct: true },
      { option_text: '', is_correct: false },
      { option_text: '', is_correct: false },
      { option_text: '', is_correct: false },
    ],
  }
}

function optionsRequired(type) {
  return ['mcq', 'poll', 'true_false', 'ranking'].includes(type)
}

function normalizeFormForType(form, nextType) {
  if (nextType === 'true_false') {
    return {
      ...form,
      question_type: nextType,
      is_quiz_mode: true,
      options: [
        { option_text: 'True', is_correct: true },
        { option_text: 'False', is_correct: false },
      ],
    }
  }
  if (optionsRequired(nextType)) {
    const options =
      form.options?.length >= 2
        ? form.options
        : [
            { option_text: '', is_correct: true },
            { option_text: '', is_correct: false },
          ]
    return {
      ...form,
      question_type: nextType,
      is_quiz_mode: nextType === 'mcq',
      options,
    }
  }
  return {
    ...form,
    question_type: nextType,
    is_quiz_mode: false,
    options: [],
  }
}

function QuestionPreview({ question }) {
  const reviews = question.reviews || []
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={`rounded-full px-2.5 py-1 font-semibold ${STATUS_STYLE[question.status] || STATUS_STYLE.draft}`}>
          {label(question.status)}
        </span>
        <span className="rounded-full bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">
          {question.topic?.name || 'No topic'}
        </span>
        <span className="rounded-full bg-violet-50 px-2.5 py-1 font-semibold text-violet-700">
          {label(question.difficulty)}
        </span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">
          {label(question.question_type)}
        </span>
        <span className="text-slate-500">v{question.version || 1}</span>
      </div>
      <p className="text-lg font-bold leading-relaxed text-navy-950">{question.question_text}</p>
      {question.options?.length ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {question.options.map((option) => (
            <div
              key={option.bank_option_id}
              className={`rounded-xl border px-3 py-2 text-sm ${
                option.is_correct
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                  : 'border-slate-200 bg-white text-slate-700'
              }`}
            >
              {option.option_text}
              {option.is_correct ? ' ✓' : ''}
            </div>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span>
          Created by <strong className="font-semibold text-slate-700">{question.author?.full_name || question.author?.email || 'Unknown'}</strong>
        </span>
        <span aria-hidden="true">•</span>
        <span>{String(question.language || 'en').toUpperCase()}</span>
      </div>
      {reviews[0]?.comments ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <strong>Latest auditor comment:</strong> {reviews[0].comments}
        </div>
      ) : null}
    </div>
  )
}

function QuestionDetailsModal({ question, onClose }) {
  if (!question) return null
  const reviews = question.reviews || []
  return (
    <Modal open title="Question details" subtitle={`Bank ID #${question.bank_question_id} · Version ${question.version || 1}`} onClose={onClose} size="lg">
      <div className="space-y-5">
        <QuestionPreview question={question} />
        <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
          <div><span className="text-slate-500">Type</span><p className="font-semibold text-slate-900">{label(question.question_type)}</p></div>
          <div><span className="text-slate-500">Status</span><p className="font-semibold text-slate-900">{label(question.status)}</p></div>
          <div><span className="text-slate-500">Created</span><p className="font-semibold text-slate-900">{question.created_at ? new Date(question.created_at).toLocaleString() : '—'}</p></div>
          <div><span className="text-slate-500">Last updated</span><p className="font-semibold text-slate-900">{question.updated_at ? new Date(question.updated_at).toLocaleString() : '—'}</p></div>
          <div><span className="text-slate-500">Submitted</span><p className="font-semibold text-slate-900">{question.submitted_at ? new Date(question.submitted_at).toLocaleString() : '—'}</p></div>
          <div><span className="text-slate-500">Approved by</span><p className="font-semibold text-slate-900">{question.approver?.full_name || '—'}</p></div>
        </div>
        <div>
          <h3 className="font-bold text-navy-950">Review history</h3>
          {reviews.length ? (
            <div className="mt-3 space-y-2">
              {reviews.map((review) => (
                <div key={review.review_id} className="rounded-xl border border-slate-200 p-3 text-sm">
                  <div className="flex flex-wrap justify-between gap-2">
                    <strong>{label(review.decision)}</strong>
                    <span className="text-slate-500">{review.reviewed_at ? new Date(review.reviewed_at).toLocaleString() : ''}</span>
                  </div>
                  <p className="mt-1 text-slate-600">
                    {review.auditor?.full_name || review.auditor?.email || 'Auditor'}
                    {review.comments ? ` — ${review.comments}` : ''}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-500">No review decision recorded yet.</p>
          )}
        </div>
      </div>
    </Modal>
  )
}

function AuthorEditor({ topics, editing, onCancel, onSaved }) {
  const accessToken = useAuthStore((state) => state.accessToken)
  const [form, setForm] = useState(() => {
    if (!editing) return emptyQuestion(topics[0]?.topic_id || '')
    return {
      ...emptyQuestion(editing.topic_id),
      ...editing,
      topic_name: editing.topic?.name || '',
      options: (editing.options || []).map((option) => ({
        option_text: option.option_text,
        is_correct: Boolean(option.is_correct),
      })),
    }
  })
  const [error, setError] = useState('')

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        topic_id: Number(form.topic_id),
        rating_min: Number(form.rating_min),
        rating_max: Number(form.rating_max),
        options: optionsRequired(form.question_type) ? form.options : [],
      }
      return editing
        ? updateQuestionBankQuestionApi(accessToken, editing.bank_question_id, payload)
        : createQuestionBankQuestionApi(accessToken, payload)
    },
    onSuccess: onSaved,
    onError: (err) => setError(err.message || 'Unable to save question'),
  })

  const setCorrect = (index) => {
    setForm((current) => ({
      ...current,
      options: current.options.map((option, optionIndex) => ({
        ...option,
        is_correct: optionIndex === index,
      })),
    }))
  }

  return (
    <div className="rounded-3xl border border-blue-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <div>
          <h2 className="text-xl font-bold text-navy-950">
            {editing ? 'Edit question' : 'Create question'}
          </h2>
          <p className="text-sm text-slate-500">Save a draft before submitting it to an Auditor.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="space-y-1.5 text-sm font-semibold text-slate-700">
          Topic
          <input
            list="question-bank-topic-options"
            value={form.topic_name}
            onChange={(event) => {
              const topicName = event.target.value
              const match = topics.find(
                (topic) => topic.name.toLowerCase() === topicName.trim().toLowerCase(),
              )
              setForm((current) => ({
                ...current,
                topic_name: topicName,
                topic_id: match?.topic_id || '',
              }))
            }}
            className="input-modern"
            placeholder="Enter or select a topic"
          />
          <datalist id="question-bank-topic-options">
            {topics.map((topic) => (
              <option key={topic.topic_id} value={topic.name} />
            ))}
          </datalist>
        </label>
        <label className="space-y-1.5 text-sm font-semibold text-slate-700">
          Difficulty
          <select
            value={form.difficulty}
            onChange={(event) => setForm((current) => ({ ...current, difficulty: event.target.value }))}
            className="input-modern"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>
        <label className="space-y-1.5 text-sm font-semibold text-slate-700">
          Question type
          <select
            value={form.question_type}
            onChange={(event) =>
              setForm((current) => normalizeFormForType(current, event.target.value))
            }
            className="input-modern"
          >
            {TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-4 block space-y-1.5 text-sm font-semibold text-slate-700">
        Question
        <textarea
          value={form.question_text}
          onChange={(event) => setForm((current) => ({ ...current, question_text: event.target.value }))}
          rows={3}
          className="input-modern min-h-24"
          placeholder="Write the complete question"
        />
      </label>

      {optionsRequired(form.question_type) ? (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-semibold text-slate-700">Answer options</p>
          {form.options.map((option, index) => (
            <div
              key={index}
              className={`rounded-2xl border p-3 transition ${
                form.is_quiz_mode && option.is_correct
                  ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-100'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center gap-3">
                {form.is_quiz_mode ? (
                  <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs font-bold text-slate-700">
                    <input
                      type="radio"
                      name="correct-option"
                      checked={Boolean(option.is_correct)}
                      onChange={() => setCorrect(index)}
                      className="size-4 accent-emerald-600"
                    />
                    {option.is_correct ? 'Correct answer' : 'Mark correct'}
                  </label>
                ) : null}
                <input
                  value={option.option_text}
                  disabled={form.question_type === 'true_false'}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      options: current.options.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, option_text: event.target.value } : item,
                      ),
                    }))
                  }
                  className="input-modern"
                  placeholder={`Option ${index + 1}`}
                />
                {form.question_type !== 'true_false' && form.options.length > 2 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        options: current.options.filter((_, itemIndex) => itemIndex !== index),
                      }))
                    }
                    className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                  >
                    <XCircle className="size-4" />
                  </button>
                ) : null}
              </div>
            </div>
          ))}
          {form.question_type !== 'true_false' && form.options.length < 10 ? (
            <button
              type="button"
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  options: [...current.options, { option_text: '', is_correct: false }],
                }))
              }
              className="text-sm font-semibold text-blue-700 hover:text-blue-900"
            >
              + Add option
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {form.question_type === 'rating' ? (
          <label className="space-y-1.5 text-sm font-semibold text-slate-700">
            Rating range
            <div className="flex gap-2">
              <input
                type="number"
                value={form.rating_min}
                onChange={(event) => setForm((current) => ({ ...current, rating_min: event.target.value }))}
                className="input-modern"
              />
              <input
                type="number"
                value={form.rating_max}
                onChange={(event) => setForm((current) => ({ ...current, rating_max: event.target.value }))}
                className="input-modern"
              />
            </div>
          </label>
        ) : null}
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
        <p className="text-xs text-slate-500">
          Your question remains private until you submit it for review.
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
            className="inline-flex min-w-36 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-700 to-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-700/20 transition hover:from-blue-800 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saveMutation.isPending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {saveMutation.isPending ? 'Saving…' : editing ? 'Save changes' : 'Save draft'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function QuestionBankPage() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const user = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [status, setStatus] = useState('')
  const [topicId, setTopicId] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [questionType, setQuestionType] = useState('')
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [detailQuestion, setDetailQuestion] = useState(null)
  const [reviewComments, setReviewComments] = useState({})
  const role = user?.role
  const canAuthor = role === 'author'
  const canAudit = role === 'auditor'
  const allowedRoles = ['author', 'auditor', 'super_admin', 'client_admin', 'dept_admin']

  const topicsQuery = useQuery({
    queryKey: ['question-bank-topics', role],
    queryFn: () =>
      listQuestionBankTopicsApi(accessToken, {
        include_inactive: role === 'super_admin' ? 'true' : '',
      }),
    enabled: Boolean(accessToken),
  })
  const topics = topicsQuery.data || []

  const questionsQuery = useQuery({
    queryKey: ['question-bank-manage', role, status, topicId, difficulty, questionType, deferredSearch],
    queryFn: () =>
      listQuestionBankQuestionsApi(accessToken, {
        status,
        topic_id: topicId,
        difficulty,
        question_type: questionType,
        search: deferredSearch,
        limit: 100,
      }),
    enabled: Boolean(accessToken && allowedRoles.includes(role)),
  })
  const questions = questionsQuery.data?.questions || []
  const statusCounts = questionsQuery.data?.status_counts || {}

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['question-bank-manage'] })
    queryClient.invalidateQueries({ queryKey: ['question-bank-topics'] })
  }

  const actionMutation = useMutation({
    mutationFn: async ({ action, question, decision }) => {
      if (action === 'submit') {
        return submitQuestionBankQuestionApi(accessToken, question.bank_question_id)
      }
      if (action === 'revise') {
        return reviseQuestionBankQuestionApi(accessToken, question.bank_question_id)
      }
      if (action === 'archive') {
        return archiveQuestionBankQuestionApi(accessToken, question.bank_question_id)
      }
      return reviewQuestionBankQuestionApi(accessToken, question.bank_question_id, {
        decision,
        comments: reviewComments[question.bank_question_id] || '',
      })
    },
    onSuccess: refresh,
  })

  const statusOptions = useMemo(() => {
    if (role === 'author') return ['', 'draft', 'pending_review', 'changes_requested', 'rejected', 'approved', 'archived']
    if (role === 'auditor') return ['', 'approved', 'changes_requested', 'rejected', 'archived']
    return ['', 'draft', 'pending_review', 'changes_requested', 'rejected', 'approved', 'archived']
  }, [role])

  if (!allowedRoles.includes(role)) {
    return (
      <section className="rounded-3xl border border-red-200 bg-red-50 p-8 text-red-800">
        This workspace is available to Question Authors, Auditors, and administrators.
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-3xl bg-linear-to-r from-navy-950 via-navy-800 to-blue-700 p-7 text-white shadow-xl shadow-blue-950/15">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/20">
              <FileQuestion className="size-6" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-200">
                {role === 'author' ? 'Author workspace' : role === 'auditor' ? 'Auditor workspace' : 'Administration'}
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                {role === 'author'
                  ? 'Create Question Bank Content'
                  : role === 'auditor'
                    ? 'Question Review Queue'
                    : role === 'super_admin'
                      ? 'Question Bank Administration'
                      : 'Question Bank Overview'}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-blue-100 sm:text-base">
            {role === 'author'
                  ? 'Create reusable questions, assign a topic, and submit completed drafts for approval.'
              : role === 'auditor'
                    ? 'Review question quality, answers and settings before content becomes available to Hosts.'
                : role === 'super_admin'
                      ? 'Monitor question quality, approval progress and the complete content review history.'
                      : 'Browse question types, approval statuses, answers, authors and review details.'}
              </p>
            </div>
          </div>
          {canAuthor ? (
            <button
              type="button"
              onClick={() => {
                setEditing(null)
                setEditorOpen(true)
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-navy-900 shadow-lg transition hover:bg-blue-50"
            >
              <Plus className="size-4" /> Create question
            </button>
          ) : null}
        </div>
      </div>

      {editorOpen ? (
        <AuthorEditor
          key={editing?.bank_question_id || 'new'}
          topics={topics.filter((topic) => topic.is_active)}
          editing={editing}
          onCancel={() => {
            setEditorOpen(false)
            setEditing(null)
          }}
          onSaved={() => {
            setEditorOpen(false)
            setEditing(null)
            refresh()
          }}
        />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {['draft', 'pending_review', 'changes_requested', 'approved', 'rejected'].map((item) => (
          <button
            type="button"
            key={item}
            onClick={() => setStatus(status === item ? '' : item)}
            className={`rounded-2xl border p-4 text-left transition ${
              status === item
                ? 'border-blue-400 bg-blue-50 shadow-sm'
                : 'border-slate-200 bg-white hover:border-blue-200'
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label(item)}</p>
            <p className="mt-1 text-2xl font-bold text-navy-950">{statusCounts[item] || 0}</p>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="relative xl:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="input-modern pl-9"
              placeholder="Search questions"
              aria-label="Search questions"
            />
          </label>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="input-modern">
            {statusOptions.map((value) => (
              <option key={value || 'all'} value={value}>
                {value ? label(value) : role === 'auditor' ? 'Pending Review' : 'All statuses'}
              </option>
            ))}
          </select>
          <select value={topicId} onChange={(event) => setTopicId(event.target.value)} className="input-modern">
            <option value="">All topics</option>
            {topics.map((topic) => (
              <option key={topic.topic_id} value={topic.topic_id}>{topic.name}</option>
            ))}
          </select>
          <select value={questionType} onChange={(event) => setQuestionType(event.target.value)} className="input-modern">
            <option value="">All question types</option>
            {FILTER_TYPES.map((type) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)} className="input-modern">
            <option value="">All difficulty levels</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm text-slate-500">{questions.length} question(s) shown</span>
          <button
            type="button"
            onClick={() => {
              setStatus('')
              setTopicId('')
              setQuestionType('')
              setDifficulty('')
              setSearch('')
            }}
            className="text-sm font-semibold text-blue-700 hover:text-blue-900"
          >
            Clear filters
          </button>
        </div>
      </div>

      {questionsQuery.isLoading ? (
        <div className="flex items-center gap-2 text-slate-600">
          <LoaderCircle className="size-5 animate-spin" /> Loading questions…
        </div>
      ) : questions.length ? (
        <div className="grid gap-4">
          {questions.map((question) => (
            <article key={question.bank_question_id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-blue-200 hover:shadow-md">
              <QuestionPreview question={question} />

              {canAudit && question.status === 'pending_review' ? (
                <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
                  <textarea
                    value={reviewComments[question.bank_question_id] || ''}
                    onChange={(event) =>
                      setReviewComments((current) => ({
                        ...current,
                        [question.bank_question_id]: event.target.value,
                      }))
                    }
                    className="input-modern min-h-20"
                    placeholder="Auditor comments (required for changes or rejection)"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => actionMutation.mutate({ action: 'review', question, decision: 'approved' })}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="size-4" /> Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => actionMutation.mutate({ action: 'review', question, decision: 'changes_requested' })}
                      className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-800 transition hover:bg-amber-100"
                    >
                      <RotateCcw className="size-4" /> Request changes
                    </button>
                    <button
                      type="button"
                      onClick={() => actionMutation.mutate({ action: 'review', question, decision: 'rejected' })}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-100"
                    >
                      <XCircle className="inline size-4" /> Reject
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="-mx-6 -mb-6 mt-5 flex flex-wrap items-center gap-2 border-t border-slate-200 bg-slate-50/80 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setDetailQuestion(question)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700"
                >
                  <Eye className="size-4" /> View details
                </button>
                {canAuthor && ['draft', 'changes_requested'].includes(question.status) ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(question)
                        setEditorOpen(true)
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                      }}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700"
                    >
                      <Pencil className="size-4" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => actionMutation.mutate({ action: 'submit', question })}
                      className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-blue-700 to-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-700/20 transition hover:from-blue-800 hover:to-blue-700"
                    >
                      <Send className="size-4" /> Submit for review
                    </button>
                  </>
                ) : null}
                {canAuthor && question.status === 'approved' ? (
                  <button
                    type="button"
                    onClick={() => actionMutation.mutate({ action: 'revise', question })}
                    className="inline-flex items-center gap-2 rounded-xl border border-violet-300 bg-violet-50 px-4 py-2.5 text-sm font-bold text-violet-700 transition hover:bg-violet-100"
                  >
                    <FileQuestion className="size-4" /> Create revision
                  </button>
                ) : null}
                {canAudit && question.status === 'approved' ? (
                  <button
                    type="button"
                    onClick={() => actionMutation.mutate({ action: 'archive', question })}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                  >
                    <Archive className="size-4" /> Archive
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-12 text-center">
          <ClipboardCheck className="mx-auto size-8 text-slate-400" />
          <p className="mt-3 font-semibold text-slate-700">No questions found</p>
        </div>
      )}

      {actionMutation.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionMutation.error.message}
        </div>
      ) : null}

      <QuestionDetailsModal
        question={detailQuestion}
        onClose={() => setDetailQuestion(null)}
      />
    </section>
  )
}
