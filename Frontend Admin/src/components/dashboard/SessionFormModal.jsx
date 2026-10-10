import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Download, FileUp, Loader2, X } from 'lucide-react'
import Modal from '../ui/Modal'
import { uploadQuestionMediaApi } from '../../services/mediaApi'
import { compressQuestionImage } from '../../utils/compressQuestionImage'
import {
  QUESTION_MEDIA_SUPPORTED_IMAGE_TYPES,
  normalizeQuestionMediaUrlForStorage,
  resolveQuestionMediaUrl,
} from '../../utils/questionMedia'

import {
  buildScoreBandsForTimer,
} from '../../utils/advancedScoreBands'
import {
  DEFAULT_PRESENT_MODE_SETTINGS,
  normalizePresentModeSettings,
  toPresentModeSettingsApi,
} from '../../utils/presentModeSettings'
import {
  DEFAULT_CUSTOM_THEME_COLORS,
  DEFAULT_PARTICIPANT_THEME,
  normalizeCustomThemeColors,
  normalizeParticipantTheme,
  toCustomThemeColorsApi,
} from '../../utils/participantTheme'
import { ParticipantThemePicker } from '../session/ParticipantThemePicker'
import {
  MAX_ALLOWLIST_ENTRIES,
  allowlistEntryCount,
  isJoinAllowlistOverLimit,
  parseJoinAllowlistExcel,
  parseJoinAllowlistText,
  summarizeJoinAllowlist,
} from '../../utils/joinAllowlist'
import { downloadJoinAllowlistSample } from '../../utils/joinAllowlistSample'

const QUIZ_TOTAL_TIME_MINUTES = [15, 30, 45, 60]
const LOGO_ACCEPT = QUESTION_MEDIA_SUPPORTED_IMAGE_TYPES.join(',')
const LOGO_MAX_BYTES = 5 * 1024 * 1024
const ALLOWLIST_FILE_ACCEPT =
  '.xlsx,.csv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain'

const CONTACT_JOIN_TYPES = new Set(['name_email', 'name_mobile', 'name_email_mobile'])

const DEFAULT_SCORE_BANDS = buildScoreBandsForTimer(30, 6)

const PRESENT_MODE_SETTING_OPTIONS = [
  {
    key: 'showGraphs',
    label: 'Show graphs',
    description: 'Results charts (bars, word cloud, emoji, etc.) on question slides.',
  },
  {
    key: 'showResponses',
    label: 'Show responses',
    description: 'Live list of participant answers beside the results.',
  },
  {
    key: 'showSessionInfo',
    label: 'Show session info',
    description: 'Join code, QR, and schedule panel on the present screen.',
  },
  {
    key: 'showParticipantStats',
    label: 'Show participant counts',
    description: 'Joined / live participant stats in the present header.',
  },
]

const defaultInitial = {
  title: '',
  description: '',
  scheduledDate: '',
  scheduledTime: '',
  autoEndEnabled: false,
  autoEndDate: '',
  autoEndTime: '',
  departmentId: '',
  joinRequirement: 'name',
  joinOtpRequired: true,
  joinAllowlistEnabled: false,
  joinAllowlist: null,
  customerMatchEnabled: false,
  customerMatchWcCode: '',
  customerMatchZone: '',
  enableNavigation: false,
  randomQuestionOrder: false,
  quizTotalTimeEnabled: false,
  quizTotalTimeMinutes: 30,
  overallLeaderboard: false,
  showParticipantCount: false,
  logoUrl: '',
  participantTheme: DEFAULT_PARTICIPANT_THEME,
  participantThemeCustom: { ...DEFAULT_CUSTOM_THEME_COLORS },
  builderMode: 'normal',
  questionsPerParticipant: 10,
  advancedSelectionMode: 'random_all',
  presentModeSettings: { ...DEFAULT_PRESENT_MODE_SETTINGS },
}

function SessionFormModal({
  open,
  modalTitle,
  mode = 'create',
  departments = [],
  allowDepartmentSelection = true,
  defaultDepartmentId = '',
  initialValues = defaultInitial,
  liveSettingsOnly = false,
  departmentLabel = '',
  workspaceClientLabel = '',
  useWorkspaceDepartment = false,
  hideDepartment = false,
  onClose,
  onSubmit,
  isSubmitting = false,
}) {
  const logoInputRef = useRef(null)
  const allowlistInputRef = useRef(null)
  const [joinRequirement, setJoinRequirement] = useState(defaultInitial.joinRequirement)
  const [joinOtpRequired, setJoinOtpRequired] = useState(defaultInitial.joinOtpRequired)
  const [joinAllowlistEnabled, setJoinAllowlistEnabled] = useState(false)
  const [joinAllowlist, setJoinAllowlist] = useState(null)
  const [customerMatchEnabled, setCustomerMatchEnabled] = useState(false)
  const [customerMatchWcCode, setCustomerMatchWcCode] = useState('')
  const [customerMatchZone, setCustomerMatchZone] = useState('')
  const [customerMatchConfigError, setCustomerMatchConfigError] = useState('')
  const CUSTOMER_MATCH_ZONES = ['East', 'West', 'North', 'South']
  const [allowlistFileName, setAllowlistFileName] = useState('')
  const [allowlistError, setAllowlistError] = useState('')
  const [allowlistSampleDownloading, setAllowlistSampleDownloading] = useState(false)
  const [enableNavigation, setEnableNavigation] = useState(defaultInitial.enableNavigation)
  const [randomQuestionOrder, setRandomQuestionOrder] = useState(defaultInitial.randomQuestionOrder)
  const [quizTotalTimeEnabled, setQuizTotalTimeEnabled] = useState(defaultInitial.quizTotalTimeEnabled)
  const [quizTotalTimeMinutes, setQuizTotalTimeMinutes] = useState(defaultInitial.quizTotalTimeMinutes)
  const [overallLeaderboard, setOverallLeaderboard] = useState(defaultInitial.overallLeaderboard)
  const [showParticipantCount, setShowParticipantCount] = useState(
    defaultInitial.showParticipantCount,
  )
  const [autoEndEnabled, setAutoEndEnabled] = useState(defaultInitial.autoEndEnabled)
  const [logoUrl, setLogoUrl] = useState('')
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoError, setLogoError] = useState('')
  const [participantTheme, setParticipantTheme] = useState(DEFAULT_PARTICIPANT_THEME)
  const [participantThemeCustom, setParticipantThemeCustom] = useState(() => ({
    ...DEFAULT_CUSTOM_THEME_COLORS,
  }))
  const [builderMode, setBuilderMode] = useState(defaultInitial.builderMode)
  const [questionsPerParticipant, setQuestionsPerParticipant] = useState(
    defaultInitial.questionsPerParticipant,
  )
  const [advancedSelectionMode, setAdvancedSelectionMode] = useState(
    defaultInitial.advancedSelectionMode,
  )
  const [presentModeSettings, setPresentModeSettings] = useState(() => ({
    ...DEFAULT_PRESENT_MODE_SETTINGS,
  }))
  const [presentSettingsOpen, setPresentSettingsOpen] = useState(false)

  const uploadDeptId = useWorkspaceDepartment
    ? String(defaultDepartmentId || '')
    : String(initialValues.departmentId || defaultDepartmentId || '')

  useEffect(() => {
    if (!open) return
    setJoinRequirement(initialValues.joinRequirement ?? defaultInitial.joinRequirement)
    setJoinOtpRequired(
      CONTACT_JOIN_TYPES.has(initialValues.joinRequirement ?? defaultInitial.joinRequirement)
        ? initialValues.joinOtpRequired !== false
        : false,
    )
    const nextJoinType = initialValues.joinRequirement ?? defaultInitial.joinRequirement
    const nextAllowlistEnabled =
      CONTACT_JOIN_TYPES.has(nextJoinType) && Boolean(initialValues.joinAllowlistEnabled)
    setJoinAllowlistEnabled(nextAllowlistEnabled)
    setJoinAllowlist(
      nextAllowlistEnabled && initialValues.joinAllowlist
        ? {
            emails: Array.isArray(initialValues.joinAllowlist.emails)
              ? [...initialValues.joinAllowlist.emails]
              : [],
            mobiles: Array.isArray(initialValues.joinAllowlist.mobiles)
              ? [...initialValues.joinAllowlist.mobiles]
              : [],
          }
        : null,
    )
    setCustomerMatchEnabled(Boolean(initialValues.customerMatchEnabled))
    setCustomerMatchWcCode(String(initialValues.customerMatchWcCode ?? '').trim())
    setCustomerMatchZone(String(initialValues.customerMatchZone ?? '').trim())
    setCustomerMatchConfigError('')
    setAllowlistFileName('')
    setAllowlistError('')
    setEnableNavigation(Boolean(initialValues.enableNavigation))
    setRandomQuestionOrder(Boolean(initialValues.randomQuestionOrder))
    setQuizTotalTimeEnabled(Boolean(initialValues.quizTotalTimeEnabled))
    setQuizTotalTimeMinutes(
      QUIZ_TOTAL_TIME_MINUTES.includes(Number(initialValues.quizTotalTimeMinutes))
        ? Number(initialValues.quizTotalTimeMinutes)
        : 30,
    )
    setOverallLeaderboard(initialValues.overallLeaderboard === true)
    setShowParticipantCount(initialValues.showParticipantCount === true)
    setAutoEndEnabled(Boolean(initialValues.autoEndEnabled))
    setLogoUrl(initialValues.logoUrl || '')
    setLogoError('')
    setLogoUploading(false)
    setParticipantTheme(normalizeParticipantTheme(initialValues.participantTheme))
    setParticipantThemeCustom(
      normalizeCustomThemeColors(initialValues.participantThemeCustom),
    )
    setBuilderMode(initialValues.builderMode === 'advanced' ? 'advanced' : 'normal')
    setQuestionsPerParticipant(
      Number(initialValues.questionsPerParticipant) > 0
        ? Number(initialValues.questionsPerParticipant)
        : 10,
    )
    setAdvancedSelectionMode(
      initialValues.advancedSelectionMode === 'random_from_selected'
        ? 'random_from_selected'
        : 'random_all',
    )
    setPresentModeSettings(normalizePresentModeSettings(initialValues.presentModeSettings))
    setPresentSettingsOpen(false)
  }, [open, initialValues])

  const handleBuilderModeChange = (mode) => {
    setBuilderMode(mode)
    if (mode === 'advanced') {
      // Advanced sessions need multi-question navigation so each participant can take their K.
      setEnableNavigation(true)
    }
  }

  const handleNavigationChange = (enabled) => {
    if (builderMode === 'advanced' && !enabled) {
      window.alert('Advanced sessions require multiple active questions so participants can answer their assigned set.')
      return
    }
    setEnableNavigation(enabled)
    if (!enabled) {
      setQuizTotalTimeEnabled(false)
      setRandomQuestionOrder(false)
    }
  }

  const handleLogoUpload = async (file) => {
    if (!file || logoUploading) return

    if (!QUESTION_MEDIA_SUPPORTED_IMAGE_TYPES.includes(file.type)) {
      setLogoError('Please upload a PNG, JPG, WebP, or GIF logo.')
      return
    }
    if (file.size > LOGO_MAX_BYTES) {
      setLogoError('Logo must be 5 MB or smaller.')
      return
    }
    if (!uploadDeptId) {
      setLogoError('Select a department before uploading a logo.')
      return
    }

    setLogoError('')
    setLogoUploading(true)
    try {
      const prepared =
        file.type !== 'image/gif' ? await compressQuestionImage(file) : file
      const { fileUrl } = await uploadQuestionMediaApi(uploadDeptId, prepared)
      if (!fileUrl) throw new Error('Upload succeeded but no file URL was returned')
      setLogoUrl(normalizeQuestionMediaUrlForStorage(fileUrl) || fileUrl)
    } catch (err) {
      setLogoError(err.message || 'Failed to upload logo')
    } finally {
      setLogoUploading(false)
      if (logoInputRef.current) logoInputRef.current.value = ''
    }
  }

  const clearJoinAllowlist = () => {
    setJoinAllowlist(null)
    setAllowlistFileName('')
    setAllowlistError('')
    if (allowlistInputRef.current) allowlistInputRef.current.value = ''
  }

  const applyParsedAllowlist = (parsed, fileName = '') => {
    const count = allowlistEntryCount(parsed)
    if (count === 0) {
      setAllowlistError('No valid emails or mobile numbers found in that file.')
      setJoinAllowlist(null)
      setAllowlistFileName('')
      return
    }
    if (isJoinAllowlistOverLimit(parsed)) {
      setAllowlistError(`Participant list supports at most ${MAX_ALLOWLIST_ENTRIES} contacts.`)
      return
    }
    setJoinAllowlist(parsed)
    setAllowlistFileName(fileName)
    setAllowlistError('')
    setJoinAllowlistEnabled(true)
  }

  const handleAllowlistFile = async (file) => {
    if (!file) return
    const name = String(file.name || '').toLowerCase()
    const isExcel = name.endsWith('.xlsx')
    const isText = name.endsWith('.csv') || name.endsWith('.txt') || file.type?.startsWith('text/')

    if (!isExcel && !isText) {
      setAllowlistError('Please upload an Excel (.xlsx), CSV, or TXT file.')
      if (allowlistInputRef.current) allowlistInputRef.current.value = ''
      return
    }

    try {
      if (isExcel) {
        const parsed = await parseJoinAllowlistExcel(file)
        applyParsedAllowlist(parsed, file.name || 'participants.xlsx')
      } else {
        const text = await file.text()
        applyParsedAllowlist(parseJoinAllowlistText(text), file.name || 'participants.csv')
      }
    } catch (err) {
      setAllowlistError(err.message || 'Could not read that file.')
    } finally {
      if (allowlistInputRef.current) allowlistInputRef.current.value = ''
    }
  }

  const handleDownloadAllowlistSample = async () => {
    if (allowlistSampleDownloading) return
    setAllowlistSampleDownloading(true)
    setAllowlistError('')
    try {
      await downloadJoinAllowlistSample(joinRequirement)
    } catch (err) {
      setAllowlistError(err.message || 'Could not download the sample file.')
    } finally {
      setAllowlistSampleDownloading(false)
    }
  }

  const handleJoinRequirementChange = (next) => {
    setJoinRequirement(next)
    if (CONTACT_JOIN_TYPES.has(next)) {
      setJoinOtpRequired(true)
    } else {
      setJoinOtpRequired(false)
      setJoinAllowlistEnabled(false)
      clearJoinAllowlist()
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const scheduledDate = String(form.get('scheduledDate') ?? '').trim()
    const scheduledTime = String(form.get('scheduledTime') ?? '').trim()
    const autoEndDate = String(form.get('autoEndDate') ?? '').trim()
    const autoEndTime = String(form.get('autoEndTime') ?? '').trim()

    if (!liveSettingsOnly && autoEndEnabled) {
      if (!autoEndDate || !autoEndTime) {
        window.alert('Please enter both an end date and end time for automatic session end.')
        return
      }

      const endAt = new Date(`${autoEndDate}T${autoEndTime}`)
      if (Number.isNaN(endAt.getTime())) {
        window.alert('Automatic end date and time are not valid.')
        return
      }
      if (endAt.getTime() <= Date.now()) {
        window.alert('Automatic end must be scheduled in the future.')
        return
      }
      if (scheduledDate && scheduledTime) {
        const startAt = new Date(`${scheduledDate}T${scheduledTime}`)
        if (!Number.isNaN(startAt.getTime()) && endAt.getTime() <= startAt.getTime()) {
          window.alert('Automatic end must be after the planned session start.')
          return
        }
      }
    }

    if (logoUploading) {
      window.alert('Please wait for the logo upload to finish.')
      return
    }

    if (!liveSettingsOnly && builderMode === 'advanced') {
      const k = Number(questionsPerParticipant)
      if (!Number.isInteger(k) || k < 1) {
        window.alert('Questions per participant must be a positive whole number.')
        return
      }
    }

    const contactJoin = CONTACT_JOIN_TYPES.has(joinRequirement)
    const allowlistOn = contactJoin && joinAllowlistEnabled
    if (allowlistOn && allowlistEntryCount(joinAllowlist) === 0) {
      window.alert('Upload a participant list with at least one email or mobile number, or turn off restrict join.')
      return
    }

    if (customerMatchEnabled) {
      const wc = String(customerMatchWcCode ?? '').trim()
      const zone = String(customerMatchZone ?? '').trim()
      if (!/^\d+$/.test(wc) || !CUSTOMER_MATCH_ZONES.includes(zone)) {
        setCustomerMatchConfigError(
          'Enter a numeric WC code and select a zone when customer match is enabled.',
        )
        return
      }
      setCustomerMatchConfigError('')
    } else {
      setCustomerMatchConfigError('')
    }

    onSubmit({
      title: String(form.get('title') ?? '').trim(),
      description: String(form.get('description') ?? '').trim(),
      scheduledDate,
      scheduledTime,
      departmentId: useWorkspaceDepartment
        ? String(defaultDepartmentId || '')
        : String(form.get('department') || defaultDepartmentId || ''),
      joinRequirement,
      joinOtpRequired: contactJoin ? Boolean(joinOtpRequired) : false,
      joinAllowlistEnabled: allowlistOn,
      joinAllowlist: allowlistOn ? joinAllowlist : null,
      customerMatchEnabled: Boolean(customerMatchEnabled),
      customerMatchWcCode: customerMatchEnabled ? String(customerMatchWcCode ?? '').trim() : '',
      customerMatchZone: customerMatchEnabled ? String(customerMatchZone ?? '').trim() : '',
      enableNavigation: builderMode === 'advanced' ? true : enableNavigation,
      randomQuestionOrder: enableNavigation && randomQuestionOrder,
      quizTotalTimeEnabled: enableNavigation && quizTotalTimeEnabled,
      quizTotalTimeMinutes: enableNavigation && quizTotalTimeEnabled ? quizTotalTimeMinutes : null,
      overallLeaderboard,
      showParticipantCount,
      autoEndEnabled: !liveSettingsOnly && autoEndEnabled,
      autoEndDate: !liveSettingsOnly && autoEndEnabled ? autoEndDate : '',
      autoEndTime: !liveSettingsOnly && autoEndEnabled ? autoEndTime : '',
      logoUrl: logoUrl
        ? normalizeQuestionMediaUrlForStorage(logoUrl) || logoUrl
        : null,
      participantTheme: normalizeParticipantTheme(participantTheme),
      participantThemeCustom: toCustomThemeColorsApi(participantThemeCustom),
      builderMode: liveSettingsOnly ? undefined : builderMode,
      questionsPerParticipant:
        !liveSettingsOnly && builderMode === 'advanced' ? Number(questionsPerParticipant) : null,
      advancedSelectionMode:
        !liveSettingsOnly && builderMode === 'advanced' ? advancedSelectionMode : 'random_all',
      responseTimeScoreBands:
        !liveSettingsOnly && builderMode === 'advanced' ? DEFAULT_SCORE_BANDS : null,
      presentModeSettings: toPresentModeSettingsApi(presentModeSettings),
    })
  }

  const logoPreviewSrc = resolveQuestionMediaUrl(logoUrl)

  return (
    <Modal open={open} title={modalTitle} onClose={onClose}>
      <form data-tour={mode === 'create' ? 'session-form' : undefined} onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto overscroll-contain pr-1 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="text-sm font-semibold text-slate-700">Title</label>
            <input
              name="title"
              data-tour="session-title"
              key={`title-${initialValues.title}-${open}`}
              defaultValue={initialValues.title ?? ''}
              className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
              placeholder="e.g., Weekly Pulse Check"
              required
            />
          </div>
          {!liveSettingsOnly ? (
            <div className="md:col-span-2 rounded-xl border border-blue-200/70 bg-slate-50/80 p-3">
              <label className="text-sm font-semibold text-slate-700">Question builder</label>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleBuilderModeChange('normal')}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${
                    builderMode === 'normal'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-slate-700 ring-1 ring-slate-200'
                  }`}
                >
                  Normal
                </button>
                <button
                  type="button"
                  onClick={() => handleBuilderModeChange('advanced')}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${
                    builderMode === 'advanced'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-slate-700 ring-1 ring-slate-200'
                  }`}
                >
                  Advanced
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {builderMode === 'advanced'
                  ? 'Build a large pool; each participant gets a random subset scored by response-time bands.'
                  : 'Classic builder — everyone can see the same questions (or Sets A/B).'}
              </p>
              {builderMode === 'advanced' ? (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-600">
                      Questions per participant (K)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={questionsPerParticipant}
                      onChange={(e) => setQuestionsPerParticipant(Number(e.target.value) || 1)}
                      className="mt-1 h-10 w-full rounded-lg border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Selection mode</label>
                    <select
                      value={advancedSelectionMode}
                      onChange={(e) => setAdvancedSelectionMode(e.target.value)}
                      className="mt-1 h-10 w-full rounded-lg border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400"
                    >
                      <option value="random_all">Random K from entire pool</option>
                      <option value="random_from_selected">Random K from marked eligible</option>
                    </select>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
          {!liveSettingsOnly ? (
            <>
              {mode === 'create' && useWorkspaceDepartment && !hideDepartment ? (
                <div className="md:col-span-2 grid gap-4 md:grid-cols-2">
                  {workspaceClientLabel ? (
                    <div>
                      <label className="text-sm font-semibold text-slate-700">Client</label>
                      <p className="mt-1 flex h-11 items-center rounded-xl border border-blue-200/70 bg-slate-50 px-3 text-sm text-slate-700">
                        {workspaceClientLabel}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">From Host Workspace</p>
                    </div>
                  ) : null}
                  <div className={workspaceClientLabel ? '' : 'md:col-span-2'}>
                    <label className="text-sm font-semibold text-slate-700">Department</label>
                    <p className="mt-1 flex h-11 items-center rounded-xl border border-blue-200/70 bg-slate-50 px-3 text-sm text-slate-700">
                      {departmentLabel || '—'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">From Host Workspace</p>
                  </div>
                </div>
              ) : null}
              {mode === 'create' && allowDepartmentSelection && !useWorkspaceDepartment && !hideDepartment ? (
                <div className="md:col-span-2">
                  <label className="text-sm font-semibold text-slate-700">Department</label>
                  <select
                    name="department"
                    key={`department-${defaultDepartmentId}-${open}`}
                    defaultValue={defaultDepartmentId || ''}
                    className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                    required
                  >
                    <option value="">Select department</option>
                    {departments.map((dept) => (
                      <option key={dept.dept_id} value={dept.dept_id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <div>
                <label className="text-sm font-semibold text-slate-700">Session date</label>
                <input
                  type="date"
                  name="scheduledDate"
                  key={`scheduledDate-${initialValues.scheduledDate}-${open}`}
                  defaultValue={initialValues.scheduledDate ?? ''}
                  className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Planned session date shown to participants before the session goes live.
                </p>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Session time</label>
                <input
                  type="time"
                  name="scheduledTime"
                  key={`scheduledTime-${initialValues.scheduledTime}-${open}`}
                  defaultValue={initialValues.scheduledTime ?? ''}
                  className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Planned start time for participants waiting to join.
                </p>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-slate-700">Description</label>
                <input
                  name="description"
                  key={`description-${initialValues.description}-${open}`}
                  defaultValue={initialValues.description ?? ''}
                  className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                  placeholder="e.g., Friday live polling session"
                />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center justify-between gap-3 rounded-xl border border-blue-200/70 bg-white px-3 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Schedule automatic end</p>
                    <p className="text-xs text-slate-500">
                      End this session automatically at the date and time below once it is live.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoEndEnabled}
                    onChange={(event) => setAutoEndEnabled(event.target.checked)}
                    className="h-5 w-5 rounded border-slate-300 text-navy-700 focus:ring-blue-500/40"
                  />
                </label>
              </div>
              {autoEndEnabled ? (
                <>
                  <div>
                    <label className="text-sm font-semibold text-slate-700">End date</label>
                    <input
                      type="date"
                      name="autoEndDate"
                      key={`autoEndDate-${initialValues.autoEndDate}-${open}`}
                      defaultValue={initialValues.autoEndDate ?? ''}
                      required={autoEndEnabled}
                      className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-700">End time</label>
                    <input
                      type="time"
                      name="autoEndTime"
                      key={`autoEndTime-${initialValues.autoEndTime}-${open}`}
                      defaultValue={initialValues.autoEndTime ?? ''}
                      required={autoEndEnabled}
                      className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      The session will move to completed when this time is reached.
                    </p>
                  </div>
                </>
              ) : null}
            </>
          ) : null}
          {mode === 'edit' && !hideDepartment ? (
            <div className={liveSettingsOnly ? 'md:col-span-2' : ''}>
              <label className="text-sm font-semibold text-slate-700">Department</label>
              <p className="mt-1 flex h-11 items-center rounded-xl border border-blue-200/70 bg-slate-50 px-3 text-sm text-slate-700">
                {departmentLabel || '—'}
              </p>
            </div>
          ) : null}
          {!liveSettingsOnly ? (
            <>
              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-slate-700">Join requirements</label>
                <select
                  value={joinRequirement}
                  onChange={(e) => handleJoinRequirementChange(e.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                >
                  <option value="anonymous">Anonymous (no name/email)</option>
                  <option value="name">Name only</option>
                  <option value="name_email">Name + Email</option>
                  <option value="name_mobile">Name + Mobile</option>
                  <option value="name_email_mobile">Name + Email + Mobile</option>
                </select>
              </div>
              {CONTACT_JOIN_TYPES.has(joinRequirement) ? (
                <div className="md:col-span-2">
                  <label className="flex items-center justify-between gap-3 rounded-xl border border-blue-200/70 bg-white px-3 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-700">Require OTP to join</p>
                      <p className="text-xs text-slate-500">
                        Participants must verify their email or mobile with a code before joining.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={joinOtpRequired}
                      onChange={(event) => setJoinOtpRequired(event.target.checked)}
                      className="h-5 w-5 rounded border-slate-300 text-navy-700 focus:ring-blue-500/40"
                    />
                  </label>
                </div>
              ) : null}
              <div className="md:col-span-2">
                <label className="flex items-center justify-between gap-3 rounded-xl border border-blue-200/70 bg-white px-3 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">
                      Require customer match verification
                    </p>
                    <p className="text-xs text-slate-500">
                      Participants must provide an email (in the join link or form). WC code and zone
                      are set here and checked against the customer match API before join.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={customerMatchEnabled}
                    onChange={(event) => {
                      setCustomerMatchEnabled(event.target.checked)
                      setCustomerMatchConfigError('')
                    }}
                    className="h-5 w-5 rounded border-slate-300 text-navy-700 focus:ring-blue-500/40"
                  />
                </label>
                {customerMatchEnabled ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-xs font-semibold text-slate-600">Zone</span>
                      <select
                        value={customerMatchZone}
                        onChange={(event) => {
                          setCustomerMatchZone(event.target.value)
                          setCustomerMatchConfigError('')
                        }}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      >
                        <option value="">Select zone…</option>
                        {CUSTOMER_MATCH_ZONES.map((z) => (
                          <option key={z} value={z}>
                            {z}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-slate-600">WC code</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        value={customerMatchWcCode}
                        onChange={(event) => {
                          setCustomerMatchWcCode(event.target.value)
                          setCustomerMatchConfigError('')
                        }}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        placeholder="e.g. 10020301"
                      />
                    </label>
                    {customerMatchConfigError ? (
                      <p className="sm:col-span-2 text-xs text-red-600">{customerMatchConfigError}</p>
                    ) : null}
                  </div>
                ) : null}
              </div>
              {CONTACT_JOIN_TYPES.has(joinRequirement) ? (
                <div className="md:col-span-2 space-y-3 rounded-xl border border-blue-200/70 bg-white px-3 py-3">
                  <label className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        Restrict join to uploaded list
                      </p>
                      <p className="text-xs text-slate-500">
                        Only people whose{' '}
                        {joinRequirement === 'name_mobile'
                          ? 'mobile number'
                          : joinRequirement === 'name_email'
                            ? 'email'
                            : 'email or mobile'}{' '}
                        is on the list can join this session.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={joinAllowlistEnabled}
                      onChange={(event) => {
                        const next = event.target.checked
                        setJoinAllowlistEnabled(next)
                        if (!next) {
                          clearJoinAllowlist()
                        }
                      }}
                      className="h-5 w-5 rounded border-slate-300 text-navy-700 focus:ring-blue-500/40"
                    />
                  </label>
                  {joinAllowlistEnabled ? (
                    <div className="space-y-2 border-t border-slate-100 pt-3">
                      <input
                        ref={allowlistInputRef}
                        type="file"
                        accept={ALLOWLIST_FILE_ACCEPT}
                        className="hidden"
                        onChange={(event) => handleAllowlistFile(event.target.files?.[0])}
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => allowlistInputRef.current?.click()}
                          className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-blue-200 bg-slate-50 px-3 text-sm font-semibold text-navy-800 transition hover:bg-blue-50"
                        >
                          <FileUp className="size-4" />
                          {allowlistEntryCount(joinAllowlist) > 0
                            ? 'Replace list'
                            : 'Upload Excel / CSV'}
                        </button>
                        <button
                          type="button"
                          disabled={allowlistSampleDownloading}
                          onClick={() => void handleDownloadAllowlistSample()}
                          className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                        >
                          {allowlistSampleDownloading ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Download className="size-4" />
                          )}
                          Download sample
                        </button>
                        {allowlistEntryCount(joinAllowlist) > 0 ? (
                          <button
                            type="button"
                            onClick={clearJoinAllowlist}
                            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                          >
                            <X className="size-4" />
                            Clear list
                          </button>
                        ) : null}
                      </div>
                      <p className="text-xs text-slate-500">
                        Download the sample Excel for column format, then replace rows with your
                        participants (.xlsx, .csv, or .txt also work).
                      </p>
                      {allowlistEntryCount(joinAllowlist) > 0 ? (
                        <p className="text-xs font-semibold text-emerald-700">
                          {summarizeJoinAllowlist(joinAllowlist)}
                          {allowlistFileName ? ` from ${allowlistFileName}` : ''} loaded.
                        </p>
                      ) : (
                        <p className="text-xs font-semibold text-amber-800">
                          Upload a participant list to enable restricted join.
                        </p>
                      )}
                      {allowlistError ? (
                        <p className="text-xs font-semibold text-red-700">{allowlistError}</p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div className="md:col-span-2">
                <label className="flex items-center justify-between gap-3 rounded-xl border border-blue-200/70 bg-white px-3 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">
                      Show participant count to joiners
                    </p>
                    <p className="text-xs text-slate-500">
                      When enabled, participants see how many people have joined (count only, no
                      names).
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={showParticipantCount}
                    onChange={(event) => setShowParticipantCount(event.target.checked)}
                    className="h-5 w-5 rounded border-slate-300 text-navy-700 focus:ring-blue-500/40"
                  />
                </label>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-slate-700" htmlFor="question-availability">
                  Question availability
                </label>
                <select
                  id="question-availability"
                  value={enableNavigation ? 'enabled' : 'disabled'}
                  onChange={(e) => handleNavigationChange(e.target.value === 'enabled')}
                  className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                >
                  <option value="disabled">
                    Single active question — one live question at a time, host-led pacing
                  </option>
                  <option value="enabled">
                    Multiple active questions — participants can access all live questions
                  </option>
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  Multiple mode lets you activate several questions at once; participants browse between
                  them. Single mode shows only the current live question until the host advances. Timed
                  questions in single mode use a shared host countdown — late joiners get only remaining
                  time.
                </p>
              </div>
              {enableNavigation ? (
                <>
                  <div className="md:col-span-2">
                    <label className="text-sm font-semibold text-slate-700" htmlFor="quiz-total-time">
                      Quiz total time
                    </label>
                    <select
                      id="quiz-total-time"
                      value={quizTotalTimeEnabled ? 'yes' : 'no'}
                      onChange={(e) => setQuizTotalTimeEnabled(e.target.value === 'yes')}
                      className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                    >
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                    <p className="mt-1 text-xs text-slate-500">
                      Limit how long participants have to complete the full quiz in multiple-question
                      mode.
                    </p>
                  </div>
                  {quizTotalTimeEnabled ? (
                    <div className="md:col-span-2">
                      <label
                        className="text-sm font-semibold text-slate-700"
                        htmlFor="quiz-total-duration"
                      >
                        Total quiz duration
                      </label>
                      <select
                        id="quiz-total-duration"
                        value={String(quizTotalTimeMinutes)}
                        onChange={(e) => setQuizTotalTimeMinutes(Number(e.target.value))}
                        className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                      >
                        {QUIZ_TOTAL_TIME_MINUTES.map((minutes) => (
                          <option key={minutes} value={minutes}>
                            {minutes} minutes
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                  <div className="md:col-span-2">
                    <label className="text-sm font-semibold text-slate-700" htmlFor="question-order">
                      Question order
                    </label>
                    <select
                      id="question-order"
                      value={randomQuestionOrder ? 'random' : 'fixed'}
                      onChange={(e) => setRandomQuestionOrder(e.target.value === 'random')}
                      className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                    >
                      <option value="fixed">
                        Fixed order — participants browse questions in builder order
                      </option>
                      <option value="random">
                        Random order — each participant gets a shuffled sequence; use Activate all
                      </option>
                    </select>
                    <p className="mt-1 text-xs text-slate-500">
                      Random order activates every question together. Per-question Activate is hidden
                      in host controls.
                    </p>
                  </div>
                </>
              ) : null}
            </>
          ) : (
            <p className="md:col-span-2 rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              This session is live or completed. You can still update the title and session logo.
            </p>
          )}

          <div className="md:col-span-2">
            <label className="text-sm font-semibold text-slate-700">Session logo</label>
            <p className="mt-1 text-xs text-slate-500">
              When set, this logo appears in Present Mode and on participant screens.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3 rounded-xl border border-blue-200/70 bg-white px-3 py-3">
              <div className="flex h-16 w-28 items-center justify-center overflow-hidden rounded-lg border border-blue-100 bg-slate-50">
                {logoPreviewSrc ? (
                  <img
                    src={logoPreviewSrc}
                    alt="Session logo preview"
                    className="max-h-full max-w-full object-contain p-1.5"
                  />
                ) : (
                  <span className="px-2 text-center text-[0.7rem] text-slate-400">No logo</span>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept={LOGO_ACCEPT}
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) void handleLogoUpload(file)
                  }}
                />
                <button
                  type="button"
                  disabled={logoUploading || !uploadDeptId}
                  onClick={() => logoInputRef.current?.click()}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-blue-200/70 bg-white px-3 text-sm font-semibold text-navy-800 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {logoUploading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <FileUp className="size-4" />
                  )}
                  {logoUploading
                    ? 'Uploading…'
                    : logoPreviewSrc
                      ? 'Replace logo'
                      : 'Upload logo'}
                </button>
                {logoPreviewSrc ? (
                  <button
                    type="button"
                    disabled={logoUploading}
                    onClick={() => {
                      setLogoUrl('')
                      setLogoError('')
                    }}
                    className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                  >
                    <X className="size-4" />
                    Remove
                  </button>
                ) : null}
              </div>
            </div>
            {logoError ? (
              <p className="mt-1.5 text-xs font-semibold text-red-700">{logoError}</p>
            ) : null}
            {!uploadDeptId ? (
              <p className="mt-1.5 text-xs text-amber-800">
                Choose a department first so the logo can be uploaded.
              </p>
            ) : null}
          </div>

          <div className="md:col-span-2 rounded-xl border border-blue-200/70 bg-white p-3">
            <ParticipantThemePicker
              value={participantTheme}
              customColors={participantThemeCustom}
              deptId={uploadDeptId}
              onChange={(themeId, custom) => {
                setParticipantTheme(normalizeParticipantTheme(themeId))
                if (custom) setParticipantThemeCustom(normalizeCustomThemeColors(custom))
              }}
            />
          </div>

          <div className="md:col-span-2 rounded-xl border border-blue-200/70 bg-white">
            <button
              type="button"
              onClick={() => setPresentSettingsOpen((open) => !open)}
              aria-expanded={presentSettingsOpen}
              className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left"
            >
              <div>
                <p className="text-sm font-semibold text-slate-700">Present mode settings</p>
                <p className="text-xs text-slate-500">
                  Choose what appears on the fullscreen present display.
                </p>
              </div>
              <ChevronDown
                className={`size-4 shrink-0 text-slate-400 transition ${
                  presentSettingsOpen ? 'rotate-180' : ''
                }`}
                aria-hidden
              />
            </button>
            {presentSettingsOpen ? (
              <div className="space-y-2 border-t border-slate-100 px-3 py-3">
                {PRESENT_MODE_SETTING_OPTIONS.map((option) => (
                  <label
                    key={option.key}
                    className="flex items-center justify-between gap-3 rounded-xl border border-blue-100 bg-slate-50/80 px-3 py-2.5"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{option.label}</p>
                      <p className="text-xs text-slate-500">{option.description}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(presentModeSettings[option.key])}
                      onChange={(event) =>
                        setPresentModeSettings((prev) => ({
                          ...prev,
                          [option.key]: event.target.checked,
                        }))
                      }
                      className="h-5 w-5 rounded border-slate-300 text-navy-700 focus:ring-blue-500/40"
                    />
                  </label>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <div className="mt-4 flex shrink-0 items-end gap-2 border-t border-blue-100/80 pt-4 md:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-xl border border-blue-200/70 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-blue-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            data-tour="create-session-submit"
            disabled={isSubmitting || logoUploading}
            className="h-11 rounded-xl bg-navy-900 px-4 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Saving…' : mode === 'create' ? 'Create session' : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default SessionFormModal
