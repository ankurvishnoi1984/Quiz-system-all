import {
  Archive,
  Check,
  CheckCircle2,
  ChevronDown,
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
  Upload,
  XCircle,
} from 'lucide-react'
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import Modal from '../components/ui/Modal'
import { QuestionMediaUpload } from '../components/builder/QuestionMediaUpload'
import { QuestionBankImportModal } from '../components/builder/QuestionBankImportModal'
import { QuestionMedia } from '../components/participant-session/QuestionMedia'
import { HostAlertModal } from '../components/live/HostAlertModal'
import {
  buildQuestionMediaPayload,
  mapApiMediaToQuestionMedia,
  normalizeEmbedUrl,
} from '../utils/questionMedia'
import {
  archiveQuestionBankQuestionApi,
  createQuestionBankQuestionApi,
  listQuestionBankOwnersApi,
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

function friendlyValidationMessage(message) {
  const normalized = String(message || '').toLowerCase()
  if (normalized.includes('option text values must be unique')) {
    return 'Each answer option must be different. Please remove or rename duplicate answers.'
  }
  if (
    normalized.includes('exactly one correct option') ||
    normalized.includes('exactly one correct answer')
  ) {
    return 'Select exactly one correct answer.'
  }
  if (normalized.includes('must include option_text')) {
    return 'Every answer option must contain text.'
  }
  if (normalized.includes('topic is required')) {
    return 'Enter or select a topic.'
  }
  if (normalized.includes('question_text is required')) {
    return 'Enter the question text.'
  }
  if (normalized.includes('select a host account')) {
    return 'Select the Host account that will own this question.'
  }
  if (
    normalized.includes('comments are required') ||
    normalized.includes('comment explaining')
  ) {
    return 'Add a short comment explaining what needs to change or why you are rejecting this question.'
  }
  if (normalized.includes('not ready for review')) {
    return 'This question is not ready for review. Fix the listed issues and try again.'
  }
  return String(message || 'Please check the question details and try again.')
}

function actionErrorTitle(variables) {
  if (variables?.action === 'review') {
    if (variables.decision === 'approved') return 'Could not approve question'
    if (variables.decision === 'changes_requested') return 'Could not request changes'
    if (variables.decision === 'rejected') return 'Could not reject question'
    return 'Could not complete review'
  }
  if (variables?.action === 'submit') return 'Could not submit for review'
  if (variables?.action === 'revise') return 'Could not create revision'
  if (variables?.action === 'archive') return 'Could not archive question'
  return 'Action could not be completed'
}

function formatActionErrorMessages(error) {
  const details = Array.isArray(error?.details)
    ? error.details.filter(Boolean)
    : []
  const messages = details.length
    ? details
    : [error?.message || 'Something went wrong. Please try again.']
  return messages.map((message) => `• ${friendlyValidationMessage(message)}`).join('\n')
}

function HostAccountSelect({
  owners,
  value,
  onChange,
  allowAll = false,
  disabled = false,
}) {
  const rootRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const selected = owners.find((owner) => Number(owner.user_id) === Number(value))
  const filteredOwners = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return owners
    return owners.filter(
      (owner) =>
        owner.full_name?.toLowerCase().includes(term) ||
        owner.email?.toLowerCase().includes(term),
    )
  }, [owners, search])

  useEffect(() => {
    if (!open) return undefined
    const closeOnOutsideClick = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setSearch('')
          setOpen((current) => !current)
        }}
        className="input-modern flex w-full items-center justify-between gap-2 text-left disabled:bg-slate-100"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`truncate ${selected ? 'text-slate-900' : 'text-slate-500'}`}>
          {selected
            ? `${selected.full_name} (${selected.email})`
            : allowAll
              ? 'All Host accounts'
              : 'Select Host account'}
        </span>
        <ChevronDown className="size-4 shrink-0 text-slate-400" />
      </button>
      {open ? (
        <div className="absolute z-50 mt-2 w-full min-w-80 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setOpen(false)
              }}
              className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-blue-400"
              placeholder="Search Host name or email"
            />
          </div>
          <div className="mt-2 max-h-64 overflow-y-auto" role="listbox">
            {allowAll && !search ? (
              <button
                type="button"
                onClick={() => {
                  onChange('')
                  setOpen(false)
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                All Host accounts
                {!value ? <Check className="size-4 text-blue-600" /> : null}
              </button>
            ) : null}
            {filteredOwners.map((owner) => (
              <button
                type="button"
                key={owner.user_id}
                onClick={() => {
                  onChange(String(owner.user_id))
                  setOpen(false)
                }}
                className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-blue-50"
                role="option"
                aria-selected={Number(owner.user_id) === Number(value)}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-slate-900">{owner.full_name}</span>
                  <span className="block truncate text-xs text-slate-500">{owner.email}</span>
                </span>
                {Number(owner.user_id) === Number(value) ? (
                  <Check className="size-4 shrink-0 text-blue-600" />
                ) : null}
              </button>
            ))}
            {!filteredOwners.length ? (
              <p className="px-3 py-5 text-center text-sm text-slate-500">No Hosts found</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function emptyQuestion(topicId = '') {
  return {
    owner_id: '',
    topic_id: topicId,
    topic_name: '',
    question_type: 'mcq',
    question_text: '',
    difficulty: 'medium',
    language: 'en',
    is_quiz_mode: true,
    media: null,
    allow_multiple_select: false,
    rating_min: 1,
    rating_max: 10,
    options: [
      { option_text: '', is_correct: false },
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
        { option_text: 'True', is_correct: false },
        { option_text: 'False', is_correct: false },
      ],
    }
  }
  if (nextType === 'mcq' && form.question_type !== 'mcq') {
    return {
      ...form,
      question_type: nextType,
      is_quiz_mode: true,
      options: Array.from({ length: 4 }, () => ({
        option_text: '',
        is_correct: false,
      })),
    }
  }
  if (optionsRequired(nextType)) {
    const options =
      form.options?.length >= 2
        ? form.options
        : [
            { option_text: '', is_correct: false },
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
      {question.media_url ? (
        <QuestionMedia
          media={mapApiMediaToQuestionMedia(question)}
          maxHeightClass="max-h-72"
        />
      ) : null}
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
        {question.owner ? (
          <>
            <span aria-hidden="true">•</span>
            <span>
              Host account: <strong className="font-semibold text-slate-700">{question.owner.full_name}</strong>
            </span>
          </>
        ) : null}
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
          <div><span className="text-slate-500">Difficulty</span><p className="font-semibold text-slate-900">{label(question.difficulty)}</p></div>
          <div><span className="text-slate-500">Topic</span><p className="font-semibold text-slate-900">{question.topic?.name || '—'}</p></div>
          <div><span className="text-slate-500">Points</span><p className="font-semibold text-slate-900">{question.is_quiz_mode ? question.points_value ?? '—' : 'N/A'}</p></div>
          <div><span className="text-slate-500">Time limit</span><p className="font-semibold text-slate-900">{question.time_limit_seconds ? `${question.time_limit_seconds}s` : '—'}</p></div>
          <div><span className="text-slate-500">Created</span><p className="font-semibold text-slate-900">{question.created_at ? new Date(question.created_at).toLocaleString() : '—'}</p></div>
          <div><span className="text-slate-500">Last updated</span><p className="font-semibold text-slate-900">{question.updated_at ? new Date(question.updated_at).toLocaleString() : '—'}</p></div>
          <div><span className="text-slate-500">Submitted</span><p className="font-semibold text-slate-900">{question.submitted_at ? new Date(question.submitted_at).toLocaleString() : '—'}</p></div>
          <div><span className="text-slate-500">Approved by</span><p className="font-semibold text-slate-900">{question.approver?.full_name || question.approver?.email || '—'}</p></div>
          <div><span className="text-slate-500">Approved at</span><p className="font-semibold text-slate-900">{question.approved_at ? new Date(question.approved_at).toLocaleString() : '—'}</p></div>
          <div><span className="text-slate-500">Author</span><p className="font-semibold text-slate-900">{question.author?.full_name || question.author?.email || '—'}</p></div>
          {question.status === 'archived' ? (
            <>
              <div><span className="text-slate-500">Archived by</span><p className="font-semibold text-slate-900">{question.archiver?.full_name || question.archiver?.email || '—'}</p></div>
              <div><span className="text-slate-500">Archived at</span><p className="font-semibold text-slate-900">{question.archived_at ? new Date(question.archived_at).toLocaleString() : '—'}</p></div>
              <div className="sm:col-span-2">
                <span className="text-slate-500">Archive reason</span>
                <p className="font-semibold text-slate-900">{question.archived_reason || '—'}</p>
              </div>
            </>
          ) : null}
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

function ArchiveReasonModal({ open, question, busy, onClose, onConfirm }) {
  const [reason, setReason] = useState('')
  useEffect(() => {
    if (open) setReason('')
  }, [open, question?.bank_question_id])
  if (!open || !question) return null
  const trimmed = reason.trim()
  return (
    <Modal
      open
      title="Archive question"
      subtitle="This removes the question from Host selection. Existing session copies stay unchanged."
      onClose={busy ? undefined : onClose}
      size="md"
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600 line-clamp-3">{question.question_text}</p>
        <label className="block text-sm font-semibold text-slate-800">
          Reason for archiving
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={4}
            maxLength={5000}
            placeholder="Explain why this question is being archived…"
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-800 outline-none focus:border-blue-400"
          />
        </label>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || !trimmed}
            onClick={() => onConfirm(trimmed)}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Archive className="size-4" />}
            Archive
          </button>
        </div>
      </div>
    </Modal>
  )
}

function AuthorEditor({
  topics,
  owners,
  role,
  currentUser,
  editing,
  onCancel,
  onSaved,
}) {
  const accessToken = useAuthStore((state) => state.accessToken)
  const [form, setForm] = useState(() => {
    if (!editing) return emptyQuestion(topics[0]?.topic_id || '')
    return {
      ...emptyQuestion(editing.topic_id),
      ...editing,
      owner_id: editing.owner_id || '',
      topic_name: editing.topic?.name || '',
      media: mapApiMediaToQuestionMedia(editing),
      options: (editing.options || []).map((option) => ({
        option_text: option.option_text,
        is_correct: Boolean(option.is_correct),
      })),
    }
  })
  const [embedUrl, setEmbedUrl] = useState(
    editing?.media_type === 'video_embed' ? editing.media_url || '' : '',
  )
  const [mediaMode, setMediaMode] = useState(
    editing?.media_type === 'video_embed'
      ? 'embed'
      : editing?.media_url
        ? 'upload'
        : 'none',
  )
  const [error, setError] = useState('')

  const saveMutation = useMutation({
    mutationFn: () => {
      if (mediaMode === 'embed' && !embedUrl.trim()) {
        throw new Error('Enter an embed URL or choose No media')
      }
      if (mediaMode === 'upload' && !form.media?.url) {
        throw new Error('Upload a media file or choose No media')
      }
      const normalizedEmbedUrl = mediaMode === 'embed' && embedUrl.trim()
        ? normalizeEmbedUrl(embedUrl)
        : ''
      if (mediaMode === 'embed' && embedUrl.trim() && !normalizedEmbedUrl) {
        throw new Error('Enter a valid HTTP or HTTPS embed URL')
      }
      const media = normalizedEmbedUrl
        ? {
            url: normalizedEmbedUrl,
            kind: 'video',
            mediaType: 'video_embed',
          }
        : mediaMode === 'upload'
          ? form.media
          : null
      const payload = {
        ...form,
        owner_id: Number(form.owner_id) || undefined,
        topic_id: Number(form.topic_id),
        rating_min: Number(form.rating_min),
        rating_max: Number(form.rating_max),
        options: optionsRequired(form.question_type) ? form.options : [],
        ...buildQuestionMediaPayload(media),
      }
      return editing
        ? updateQuestionBankQuestionApi(accessToken, editing.bank_question_id, payload)
        : createQuestionBankQuestionApi(accessToken, payload)
    },
    onMutate: () => setError(''),
    onSuccess: onSaved,
    onError: (err) => {
      const details = Array.isArray(err.details)
        ? err.details.filter(Boolean)
        : []
      setError(
        details.length
          ? details.map(friendlyValidationMessage)
          : [friendlyValidationMessage(err.message || 'Unable to save question')],
      )
    },
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
  const selectedOwner = owners.find(
    (owner) => Number(owner.user_id) === Number(form.owner_id),
  )
  const mediaDeptId =
    role === 'author' ? currentUser?.dept_id : selectedOwner?.dept_id

  return (
    <div className="rounded-3xl border border-blue-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <div>
          <h2 className="text-xl font-bold text-navy-950">
            {editing
              ? `Edit question v${editing.version || 1}`
              : 'Create question'}
          </h2>
          <p className="text-sm text-slate-500">
            {editing?.revision_of_id
              ? 'The previous approved version remains available to Hosts until this version is approved.'
              : 'Save a draft before submitting it to an Auditor.'}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {role !== 'author' ? (
          <div className="space-y-1.5 text-sm font-semibold text-slate-700">
            <p>Host account</p>
            <HostAccountSelect
              owners={owners}
              value={form.owner_id}
              disabled={Boolean(editing)}
              onChange={(ownerId) =>
                setForm((current) => ({
                  ...current,
                  owner_id: ownerId,
                  topic_id: '',
                  topic_name: '',
                }))
              }
            />
          </div>
        ) : null}
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
            {topics
              .filter(
                (topic) =>
                  role === 'author' ||
                  !form.owner_id ||
                  Number(topic.owner_id) === Number(form.owner_id),
              )
              .map((topic) => (
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

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-navy-950">Question media</p>
            <p className="text-xs text-slate-600">Choose one media source.</p>
          </div>
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
            {[
              { value: 'none', label: 'No media' },
              { value: 'upload', label: 'Upload file' },
              { value: 'embed', label: 'Embed link' },
            ].map((option) => (
              <button
                type="button"
                key={option.value}
                onClick={() => {
                  setMediaMode(option.value)
                  if (option.value !== 'embed') setEmbedUrl('')
                  if (option.value !== 'upload') {
                    setForm((current) => ({ ...current, media: null }))
                  }
                }}
                className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                  mediaMode === option.value
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        {mediaMode === 'upload' ? (
          <div className="mt-4">
            <QuestionMediaUpload
              media={form.media}
              deptId={mediaDeptId}
              disabled={!mediaDeptId}
              onError={setError}
              onChange={(media) =>
                setForm((current) => ({ ...current, media }))
              }
            />
          </div>
        ) : null}
        {mediaMode === 'embed' ? (
          <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50/50 p-4">
          <p className="text-sm font-bold text-navy-950">YouTube or embed link</p>
          <p className="mt-1 text-xs text-slate-600">
            Paste a YouTube, Vimeo, or HTTPS embed URL. Adding a link replaces uploaded media.
          </p>
          <input
            type="url"
            value={embedUrl}
            onChange={(event) => setEmbedUrl(event.target.value)}
            disabled={!mediaDeptId}
            className="input-modern mt-3"
            placeholder="https://www.youtube.com/watch?v=..."
          />
          {embedUrl && normalizeEmbedUrl(embedUrl) ? (
            <div className="mt-3 overflow-hidden rounded-xl border border-blue-200 bg-black">
              <iframe
                src={normalizeEmbedUrl(embedUrl)}
                title="Embed preview"
                className="aspect-video w-full"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                sandbox="allow-scripts allow-same-origin allow-presentation"
                allowFullScreen
              />
            </div>
          ) : null}
          </div>
        ) : null}
      </div>

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
            disabled={
              saveMutation.isPending ||
              (role !== 'author' && !form.owner_id)
            }
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
      <HostAlertModal
        open={Boolean(error)}
        variant="error"
        title="Question could not be saved"
        message={(Array.isArray(error) ? error : [error])
          .map((message) => `• ${friendlyValidationMessage(message)}`)
          .join('\n')}
        confirmLabel="Review question"
        onClose={() => setError('')}
      />
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
  const [ownerFilter, setOwnerFilter] = useState('')
  const [topicId, setTopicId] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [questionType, setQuestionType] = useState('')
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [detailQuestion, setDetailQuestion] = useState(null)
  const [archiveTarget, setArchiveTarget] = useState(null)
  const [reviewComments, setReviewComments] = useState({})
  const [actionAlert, setActionAlert] = useState(null)
  const [importOpen, setImportOpen] = useState(false)
  const role = user?.role
  const adminRoles = ['super_admin', 'client_admin', 'dept_admin']
  const canAuthor = role === 'author' || adminRoles.includes(role)
  const canAudit = role === 'auditor' || adminRoles.includes(role)
  const allowedRoles = ['author', 'auditor', 'super_admin', 'client_admin', 'dept_admin']

  const ownersQuery = useQuery({
    queryKey: ['question-bank-owners', role],
    queryFn: () => listQuestionBankOwnersApi(accessToken),
    enabled: Boolean(accessToken && adminRoles.includes(role)),
  })
  const owners = ownersQuery.data || []

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
    queryKey: [
      'question-bank-manage',
      role,
      ownerFilter,
      status,
      topicId,
      difficulty,
      questionType,
      deferredSearch,
    ],
    queryFn: () =>
      listQuestionBankQuestionsApi(accessToken, {
        status,
        owner_id: ownerFilter,
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
    mutationFn: async ({ action, question, decision, reason }) => {
      if (action === 'submit') {
        return submitQuestionBankQuestionApi(accessToken, question.bank_question_id)
      }
      if (action === 'revise') {
        return reviseQuestionBankQuestionApi(accessToken, question.bank_question_id)
      }
      if (action === 'archive') {
        return archiveQuestionBankQuestionApi(
          accessToken,
          question.bank_question_id,
          reason,
        )
      }
      return reviewQuestionBankQuestionApi(accessToken, question.bank_question_id, {
        decision,
        comments: reviewComments[question.bank_question_id] || '',
      })
    },
    onSuccess: (result, variables) => {
      refresh()
      if (variables.action === 'archive') {
        setArchiveTarget(null)
      }
      if (variables.action === 'revise' && result) {
        setEditing(result)
        setEditorOpen(true)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    },
    onError: (error, variables) => {
      setActionAlert({
        title: actionErrorTitle(variables),
        message: formatActionErrorMessages(error),
      })
    },
  })

  const runReviewAction = (question, decision) => {
    const comments = String(reviewComments[question.bank_question_id] || '').trim()
    if (
      (decision === 'changes_requested' || decision === 'rejected') &&
      !comments
    ) {
      setActionAlert({
        title:
          decision === 'rejected'
            ? 'Could not reject question'
            : 'Could not request changes',
        message:
          '• Add a short comment explaining what needs to change or why you are rejecting this question.',
      })
      return
    }
    actionMutation.mutate({ action: 'review', question, decision })
  }

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
                {role === 'author'
                  ? 'Private account bank · Author workspace'
                  : role === 'auditor'
                    ? 'Private account bank · Auditor workspace'
                    : 'Scoped administration'}
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
                    ? 'Review only your account’s questions before they become available to its Hosts.'
                : role === 'super_admin'
                      ? 'Create questions for a selected Host account and manage approvals across the platform.'
                      : 'Create questions for an accessible Host account and manage approvals within your scope.'}
              </p>
            </div>
          </div>
          {canAuthor ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setImportOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-white/40 bg-white/10 px-4 py-2.5 text-sm font-bold text-white shadow-lg backdrop-blur transition hover:bg-white/20"
              >
                <Upload className="size-4" /> Upload Excel
              </button>
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
            </div>
          ) : null}
        </div>
      </div>

      {editorOpen ? (
        <AuthorEditor
          key={editing?.bank_question_id || 'new'}
          topics={topics.filter((topic) => topic.is_active)}
          owners={owners}
          role={role}
          currentUser={user}
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
        <div className={`grid gap-3 md:grid-cols-2 ${adminRoles.includes(role) ? 'xl:grid-cols-6' : 'xl:grid-cols-5'}`}>
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
          {adminRoles.includes(role) ? (
            <HostAccountSelect
              owners={owners}
              value={ownerFilter}
              allowAll
              onChange={(ownerId) => {
                setOwnerFilter(ownerId)
                setTopicId('')
              }}
            />
          ) : null}
          <select value={topicId} onChange={(event) => setTopicId(event.target.value)} className="input-modern">
            <option value="">All topics</option>
            {topics
              .filter(
                (topic) =>
                  !ownerFilter ||
                  Number(topic.owner_id) === Number(ownerFilter),
              )
              .map((topic) => {
                const topicOwner = owners.find(
                  (owner) => Number(owner.user_id) === Number(topic.owner_id),
                )
                return (
                  <option key={topic.topic_id} value={topic.topic_id}>
                    {topic.name}
                    {!ownerFilter && topicOwner ? ` — ${topicOwner.full_name}` : ''}
                  </option>
                )
              })}
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
              setOwnerFilter('')
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
                      onClick={() => runReviewAction(question, 'approved')}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="size-4" /> Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => runReviewAction(question, 'changes_requested')}
                      className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-800 transition hover:bg-amber-100"
                    >
                      <RotateCcw className="size-4" /> Request changes
                    </button>
                    <button
                      type="button"
                      onClick={() => runReviewAction(question, 'rejected')}
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
                {canAuthor &&
                Number(question.author_id) === Number(user?.user_id) &&
                ['draft', 'changes_requested'].includes(question.status) ? (
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
                {canAuthor &&
                Number(question.author_id) === Number(user?.user_id) &&
                question.status === 'approved' ? (
                  <button
                    type="button"
                    onClick={() => actionMutation.mutate({ action: 'revise', question })}
                    className="inline-flex items-center gap-2 rounded-xl border border-violet-300 bg-violet-50 px-4 py-2.5 text-sm font-bold text-violet-700 transition hover:bg-violet-100"
                  >
                    <FileQuestion className="size-4" />
                    Edit as v{Number(question.version || 1) + 1}
                  </button>
                ) : null}
                {canAudit && question.status === 'approved' ? (
                  <button
                    type="button"
                    onClick={() => setArchiveTarget(question)}
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

      <QuestionDetailsModal
        question={detailQuestion}
        onClose={() => setDetailQuestion(null)}
      />

      <ArchiveReasonModal
        open={Boolean(archiveTarget)}
        question={archiveTarget}
        busy={actionMutation.isPending && actionMutation.variables?.action === 'archive'}
        onClose={() => setArchiveTarget(null)}
        onConfirm={(reason) =>
          actionMutation.mutate({ action: 'archive', question: archiveTarget, reason })
        }
      />

      <HostAlertModal
        open={Boolean(actionAlert)}
        variant={actionAlert?.variant || 'error'}
        title={actionAlert?.title || 'Action could not be completed'}
        message={actionAlert?.message || ''}
        confirmLabel="Got it"
        onClose={() => setActionAlert(null)}
      />

      <QuestionBankImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        accessToken={accessToken}
        owners={owners}
        role={role}
        onImported={(result) => {
          refresh()
          const created = Number(result?.created_count || 0)
          const skipped = Number(result?.skipped_count || 0)
          setActionAlert({
            variant: 'success',
            title: 'Questions imported',
            message: skipped
              ? `• ${created} draft${created === 1 ? '' : 's'} created.\n• ${skipped} row${skipped === 1 ? '' : 's'} skipped because of validation errors.`
              : `• ${created} draft question${created === 1 ? '' : 's'} created. Submit them for review when ready.`,
          })
        }}
      />
    </section>
  )
}
