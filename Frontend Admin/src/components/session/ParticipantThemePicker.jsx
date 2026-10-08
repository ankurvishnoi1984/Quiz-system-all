import { Check, Eye, FileUp, Loader2, Palette, SlidersHorizontal, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Modal from '../ui/Modal'
import { QuestionTimer } from '../../pages/participant-session/components/question/QuestionTimer'
import { uploadQuestionMediaApi } from '../../services/mediaApi'
import { compressQuestionImage } from '../../utils/compressQuestionImage'
import {
  QUESTION_MEDIA_SUPPORTED_IMAGE_TYPES,
  normalizeQuestionMediaUrlForStorage,
  resolveQuestionMediaUrl,
} from '../../utils/questionMedia'
import {
  CUSTOM_PARTICIPANT_THEME,
  CUSTOM_THEME_ACCENT_FIELDS,
  CUSTOM_THEME_META,
  CUSTOM_THEME_SURFACE_FIELDS,
  DEFAULT_CUSTOM_THEME_COLORS,
  DEFAULT_PARTICIPANT_THEME,
  PARTICIPANT_THEMES,
  buildParticipantThemeStyle,
  getParticipantThemeMeta,
  isCustomParticipantTheme,
  normalizeCustomThemeColors,
  normalizeHexColor,
  normalizeParticipantTheme,
} from '../../utils/participantTheme'

const THEME_IMAGE_ACCEPT = QUESTION_MEDIA_SUPPORTED_IMAGE_TYPES.join(',')
const THEME_IMAGE_MAX_BYTES = 5 * 1024 * 1024

const PREVIEW_TIMER_SECONDS = 45
const PREVIEW_TIME_LIMIT = 60

const PREVIEW_OPTIONS = [
  { key: 'A', label: 'Paris', selected: true },
  { key: 'B', label: 'London', selected: false },
  { key: 'C', label: 'Berlin', selected: false },
  { key: 'D', label: 'Madrid', selected: false },
]

function ThemePreviewQuestion({ compact = false }) {
  return (
    <section
      className={`participant-surface quiz-fade-in space-y-4 rounded-2xl border border-blue-200/70 bg-white/92 shadow-sm shadow-navy-900/5 backdrop-blur-sm ${
        compact ? 'p-4' : 'p-5'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="participant-accent-text min-w-0 truncate text-xs font-semibold uppercase tracking-wider text-navy-700">
          Question 1 / 10
        </p>
        {!compact ? (
          <p className="max-w-[min(100%,20rem)] text-right text-[11px] font-medium leading-snug text-slate-500">
            Answer this question or wait for the timer to use Next.
          </p>
        ) : null}
      </div>

      <h2
        className={`participant-heading font-bold text-navy-900 ${
          compact ? 'text-lg' : 'text-2xl'
        }`}
      >
        What is the capital of France?
      </h2>

      <QuestionTimer
        timer={PREVIEW_TIMER_SECONDS}
        timeLimit={PREVIEW_TIME_LIMIT}
        soundEnabled={false}
      />

      <div className={`grid gap-2 ${compact ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
        {PREVIEW_OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            tabIndex={-1}
            className={`quiz-option rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
              option.selected ? 'quiz-option-selected' : ''
            }`}
          >
            <span className="flex items-start gap-2">
              <span className="participant-option-badge inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs">
                {option.key}
              </span>
              <span className="min-w-0 flex-1">{option.label}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          tabIndex={-1}
          className="participant-btn-secondary rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600"
        >
          Previous
        </button>
        <button
          type="button"
          tabIndex={-1}
          className="participant-btn-primary ml-auto rounded-xl bg-navy-700 px-5 py-2.5 text-sm font-semibold text-white"
        >
          Submit answer
        </button>
      </div>
    </section>
  )
}

function FullscreenThemePreview({
  themeId,
  customColors,
  selectedThemeId,
  disabled,
  onClose,
  onApply,
}) {
  const theme = getParticipantThemeMeta(themeId, customColors)
  const isSelected = selectedThemeId === theme.id
  const themeStyle = buildParticipantThemeStyle(themeId, customColors)

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  return createPortal(
    <div
      className="host-print-hide participant-theme-stage participant-session-bg fixed inset-0 z-[200] flex flex-col"
      data-participant-theme={theme.id}
      style={themeStyle}
      role="dialog"
      aria-modal="true"
      aria-labelledby="participant-theme-preview-title"
    >
      <header className="participant-topbar relative z-10 flex shrink-0 items-center justify-between gap-3 border-b border-white/50 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-md sm:px-6">
        <div className="min-w-0">
          <p
            id="participant-theme-preview-title"
            className="participant-heading truncate text-base font-bold text-navy-900 sm:text-lg"
          >
            {theme.label} theme preview
          </p>
          <p className="truncate text-xs text-slate-600 sm:text-sm">{theme.description}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="participant-btn-secondary shrink-0 rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50"
          aria-label="Close preview"
        >
          <X className="size-4" />
        </button>
      </header>

      <div className="relative z-10 flex min-h-0 flex-1 items-start justify-center overflow-y-auto p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-4xl space-y-4">
          <ThemePreviewQuestion />
          <p className="text-center text-xs font-medium uppercase tracking-wide text-slate-500">
            Dummy question · Preview only · {theme.label}
          </p>
        </div>
      </div>

      <footer className="participant-topbar relative z-10 flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-white/50 bg-white/90 px-4 py-3 backdrop-blur-md sm:px-6">
        <button
          type="button"
          onClick={onClose}
          className="participant-btn-secondary rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Close
        </button>
        {!disabled ? (
          <button
            type="button"
            onClick={onApply}
            className="participant-btn-primary rounded-xl bg-navy-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800"
          >
            {isSelected ? 'Keep selected' : `Use ${theme.label}`}
          </button>
        ) : null}
      </footer>
    </div>,
    document.body,
  )
}

function ColorField({ field, value, disabled, onChange }) {
  const hex = normalizeHexColor(value, DEFAULT_CUSTOM_THEME_COLORS[field.key])

  return (
    <label className="flex items-start gap-3 rounded-xl border border-blue-100 bg-white p-3">
      <input
        type="color"
        disabled={disabled}
        value={hex}
        onChange={(e) => onChange(field.key, e.target.value)}
        className="mt-0.5 size-10 shrink-0 cursor-pointer rounded-lg border border-slate-200 bg-transparent p-0.5 disabled:cursor-not-allowed"
        aria-label={field.label}
      />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-navy-900">{field.label}</span>
          <input
            type="text"
            disabled={disabled}
            value={hex}
            onChange={(e) => {
              const next = e.target.value.trim()
              if (/^#[0-9a-fA-F]{0,6}$/.test(next)) onChange(field.key, next)
            }}
            onBlur={() => onChange(field.key, normalizeHexColor(hex, hex))}
            className="w-[5.5rem] rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] uppercase text-slate-700 outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500/20 disabled:cursor-not-allowed"
            spellCheck={false}
          />
        </span>
        <span className="mt-0.5 block text-xs leading-snug text-slate-500">
          {field.description}
        </span>
      </span>
    </label>
  )
}

function SurfaceField({
  field,
  color,
  imageUrl,
  disabled,
  deptId,
  onColorChange,
  onImageChange,
}) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const hex = normalizeHexColor(color, DEFAULT_CUSTOM_THEME_COLORS[field.key])
  const previewSrc = resolveQuestionMediaUrl(imageUrl)

  const handleUpload = async (file) => {
    if (!file || uploading || disabled) return
    setError('')
    if (!QUESTION_MEDIA_SUPPORTED_IMAGE_TYPES.includes(file.type)) {
      setError('Use JPEG, PNG, WebP, or GIF.')
      return
    }
    if (file.size > THEME_IMAGE_MAX_BYTES * 2) {
      setError('Image is too large (max ~5 MB after compression).')
      return
    }
    if (!deptId) {
      setError('Choose a department first so images can be uploaded.')
      return
    }
    setUploading(true)
    try {
      const prepared = await compressQuestionImage(file)
      const { fileUrl } = await uploadQuestionMediaApi(deptId, prepared)
      const stored = normalizeQuestionMediaUrlForStorage(fileUrl) || fileUrl
      onImageChange(field.imageKey, stored)
    } catch (err) {
      setError(err?.message || 'Upload failed.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2 rounded-xl border border-blue-100 bg-white p-3">
      <label className="flex items-start gap-3">
        <input
          type="color"
          disabled={disabled}
          value={hex}
          onChange={(e) => onColorChange(field.key, e.target.value)}
          className="mt-0.5 size-10 shrink-0 cursor-pointer rounded-lg border border-slate-200 bg-transparent p-0.5 disabled:cursor-not-allowed"
          aria-label={`${field.label} color`}
        />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-navy-900">{field.label}</span>
            <input
              type="text"
              disabled={disabled}
              value={hex}
              onChange={(e) => {
                const next = e.target.value.trim()
                if (/^#[0-9a-fA-F]{0,6}$/.test(next)) onColorChange(field.key, next)
              }}
              onBlur={() => onColorChange(field.key, normalizeHexColor(hex, hex))}
              className="w-[5.5rem] rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] uppercase text-slate-700 outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500/20 disabled:cursor-not-allowed"
              spellCheck={false}
            />
          </span>
          <span className="mt-0.5 block text-xs leading-snug text-slate-500">
            {previewSrc
              ? `${field.description} Color sits behind the image (good for transparent PNGs).`
              : field.description}
          </span>
        </span>
      </label>

      <div className="flex items-center gap-2">
        <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          {previewSrc ? (
            <img src={previewSrc} alt="" className="size-full object-cover" />
          ) : (
            <span className="text-[9px] font-medium text-slate-400">IMG</span>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={THEME_IMAGE_ACCEPT}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleUpload(file)
          }}
        />
        <button
          type="button"
          disabled={disabled || uploading || !deptId}
          onClick={() => inputRef.current?.click()}
          className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-blue-200/80 bg-slate-50 px-2.5 text-[11px] font-semibold text-navy-800 transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {uploading ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <FileUp className="size-3.5" aria-hidden />
          )}
          {uploading ? 'Uploading…' : previewSrc ? 'Replace image' : 'Upload image'}
        </button>
        {previewSrc ? (
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => onImageChange(field.imageKey, null)}
            className="inline-flex h-9 items-center rounded-lg border border-red-200 bg-white px-2 text-[11px] font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
          >
            Remove
          </button>
        ) : null}
      </div>
      {error ? <p className="text-[11px] font-semibold text-red-700">{error}</p> : null}
      {!deptId ? (
        <p className="text-[11px] text-amber-800">Department required to upload images.</p>
      ) : null}
    </div>
  )
}

function CustomThemeEditor({
  open,
  initialColors,
  disabled,
  deptId,
  onClose,
  onSave,
}) {
  const [draft, setDraft] = useState(() => normalizeCustomThemeColors(initialColors))

  useEffect(() => {
    if (!open) return
    setDraft(normalizeCustomThemeColors(initialColors))
  }, [open, initialColors])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      onClose()
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [open, onClose])

  if (!open) return null

  const themeStyle = buildParticipantThemeStyle(CUSTOM_PARTICIPANT_THEME, draft)

  const setColor = (key, value) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  const setImage = (key, value) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  return createPortal(
    <div
      className="host-print-hide fixed inset-0 z-[180] flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="custom-theme-editor-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-navy-950/30 backdrop-blur-sm"
        aria-label="Close customizer"
        onClick={onClose}
      />
      <div className="relative flex max-h-[calc(100dvh-1.5rem)] w-[min(96vw,1040px)] flex-col overflow-hidden rounded-2xl border border-blue-200/70 bg-white shadow-2xl shadow-blue-900/20">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h3
              id="custom-theme-editor-title"
              className="text-lg font-bold text-navy-900 sm:text-xl"
            >
              Customize your theme
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Set color and optional image for page, top bar, and cards — preview updates live.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50"
            aria-label="Close customizer"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-0 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]">
          <div
            className="participant-theme-stage participant-session-bg relative min-h-[18rem] p-4 sm:p-5"
            data-participant-theme={CUSTOM_PARTICIPANT_THEME}
            style={themeStyle}
          >
            <div className="participant-topbar mb-3 rounded-xl border border-blue-200/70 bg-white/92 px-3 py-2.5 shadow-sm backdrop-blur-sm">
              <p className="participant-heading text-sm font-bold">Session header</p>
              <p className="participant-muted text-[11px] text-slate-500">
                Top bar color / image / text
              </p>
            </div>
            <ThemePreviewQuestion compact />
            <p className="mt-3 text-center text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Live preview
            </p>
          </div>

          <div className="space-y-2.5 border-t border-slate-100 bg-slate-50/80 p-4 lg:border-l lg:border-t-0 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Surfaces
            </p>
            {CUSTOM_THEME_SURFACE_FIELDS.map((field) => (
              <SurfaceField
                key={field.key}
                field={field}
                color={draft[field.key]}
                imageUrl={draft[field.imageKey]}
                disabled={disabled}
                deptId={deptId}
                onColorChange={setColor}
                onImageChange={setImage}
              />
            ))}
            <p className="pt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Accents
            </p>
            {CUSTOM_THEME_ACCENT_FIELDS.map((field) => (
              <ColorField
                key={field.key}
                field={field}
                value={draft[field.key]}
                disabled={disabled}
                onChange={setColor}
              />
            ))}
            <button
              type="button"
              disabled={disabled}
              onClick={() => setDraft({ ...DEFAULT_CUSTOM_THEME_COLORS })}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Reset to Harbor defaults
            </button>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-100 px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onSave(normalizeCustomThemeColors(draft))}
            className="rounded-xl bg-navy-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Use custom theme
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function ThemeOptionRow({
  theme,
  isActive,
  disabled,
  onSelect,
  onPreview,
  onCustomize,
}) {
  const isDefault = theme.id === DEFAULT_PARTICIPANT_THEME
  const isCustom = theme.id === CUSTOM_PARTICIPANT_THEME
  const themeStyle = buildParticipantThemeStyle(theme.id, theme.colors)

  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border bg-white p-2.5 transition sm:flex-row sm:items-center sm:gap-3 sm:p-3 ${
        isActive
          ? 'border-navy-600 shadow-sm ring-2 ring-navy-600/20'
          : 'border-blue-200/80 hover:border-blue-300'
      } ${disabled ? 'opacity-60' : ''}`}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => (isCustom ? onCustomize?.() : onSelect(theme.id))}
        aria-pressed={isActive}
        className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-not-allowed"
      >
        <div
          className="participant-theme-preview participant-theme-preview--row participant-session-bg relative shrink-0 overflow-hidden rounded-lg"
          data-participant-theme={theme.id}
          style={themeStyle}
          aria-hidden
        >
          {isActive ? (
            <span className="absolute right-1.5 top-1.5 inline-flex size-5 items-center justify-center rounded-full bg-navy-700 text-white shadow-sm">
              <Check className="size-3" strokeWidth={3} aria-hidden />
            </span>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-navy-900">{theme.label}</p>
            {isDefault ? (
              <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                Default
              </span>
            ) : null}
            {isCustom ? (
              <span className="rounded-md bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-700">
                Yours
              </span>
            ) : null}
            <span className="flex gap-1" aria-hidden>
              {theme.swatch.map((color) => (
                <span
                  key={color}
                  className="size-2.5 rounded-full border border-black/10"
                  style={{ backgroundColor: color }}
                />
              ))}
            </span>
          </div>
          <p className="mt-0.5 text-xs leading-snug text-slate-500">{theme.description}</p>
        </div>
      </button>

      <div className="flex shrink-0 gap-2 sm:flex-col sm:self-center">
        {isCustom ? (
          <button
            type="button"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation()
              onCustomize?.()
            }}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-blue-200/80 bg-slate-50 px-3 py-2 text-xs font-semibold text-navy-800 transition hover:bg-sky-50 disabled:cursor-not-allowed sm:flex-none"
          >
            <SlidersHorizontal className="size-3.5" aria-hidden />
            Customize
          </button>
        ) : null}
        <button
          type="button"
          disabled={disabled}
          onClick={(e) => onPreview(theme.id, e)}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-blue-200/80 bg-slate-50 px-3 py-2 text-xs font-semibold text-navy-800 transition hover:bg-sky-50 disabled:cursor-not-allowed sm:flex-none"
        >
          <Eye className="size-3.5" aria-hidden />
          Preview
        </button>
      </div>
    </div>
  )
}

/**
 * @param {{
 *   value: string,
 *   customColors?: object | null,
 *   onChange: (themeId: string, customColors?: object | null) => void,
 *   disabled?: boolean,
 *   deptId?: string | number | null,
 * }} props
 */
export function ParticipantThemePicker({
  value,
  customColors = null,
  onChange,
  disabled = false,
  deptId = null,
}) {
  const selected = normalizeParticipantTheme(value)
  const colors = normalizeCustomThemeColors(customColors)
  const selectedMeta = getParticipantThemeMeta(selected, colors)
  const selectedStyle = buildParticipantThemeStyle(selected, colors)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [previewThemeId, setPreviewThemeId] = useState(null)
  const [customizerOpen, setCustomizerOpen] = useState(false)

  const openPreview = (themeId, event) => {
    event?.stopPropagation?.()
    event?.preventDefault?.()
    setPreviewThemeId(normalizeParticipantTheme(themeId))
  }

  const closePreview = () => setPreviewThemeId(null)

  const applyFromPreview = () => {
    if (previewThemeId == null || disabled) return
    if (isCustomParticipantTheme(previewThemeId)) {
      onChange?.(CUSTOM_PARTICIPANT_THEME, colors)
    } else {
      onChange?.(normalizeParticipantTheme(previewThemeId), colors)
    }
    closePreview()
  }

  const selectTheme = (themeId) => {
    if (disabled) return
    const id = normalizeParticipantTheme(themeId)
    if (id === CUSTOM_PARTICIPANT_THEME) {
      setCustomizerOpen(true)
      return
    }
    onChange?.(id, colors)
  }

  const saveCustom = (nextColors) => {
    if (disabled) return
    onChange?.(CUSTOM_PARTICIPANT_THEME, nextColors)
    setCustomizerOpen(false)
    setPickerOpen(false)
  }

  const customRowMeta = {
    ...CUSTOM_THEME_META,
    swatch: [colors.background, colors.accent, colors.accentStrong],
    colors,
  }

  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-semibold text-slate-700">Participant screen theme</p>
        <p className="text-xs text-slate-500">
          Background for join, waiting, and quiz screens.
        </p>
      </div>

      <div className="space-y-3 rounded-xl border border-blue-200/80 bg-slate-50/80 p-3">
        <div className="flex items-start gap-3">
          <div
            className="participant-theme-preview participant-theme-preview--row participant-session-bg relative shrink-0 overflow-hidden rounded-lg"
            data-participant-theme={selectedMeta.id}
            style={selectedStyle}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-navy-900">{selectedMeta.label}</p>
              {selectedMeta.id === DEFAULT_PARTICIPANT_THEME ? (
                <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                  Default
                </span>
              ) : null}
              {isCustomParticipantTheme(selected) ? (
                <span className="rounded-md bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-700">
                  Yours
                </span>
              ) : null}
            </div>
            <span className="mt-1.5 flex gap-1" aria-hidden>
              {selectedMeta.swatch.map((color) => (
                <span
                  key={color}
                  className="size-2.5 rounded-full border border-black/10"
                  style={{ backgroundColor: color }}
                />
              ))}
            </span>
            <p className="mt-1.5 text-xs leading-snug text-slate-500">
              {selectedMeta.description}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setPickerOpen(true)}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-navy-700 px-2.5 py-2 text-xs font-semibold text-white transition hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Palette className="size-3.5 shrink-0" aria-hidden />
            Change
          </button>
          {isCustomParticipantTheme(selected) ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => setCustomizerOpen(true)}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-blue-200/80 bg-white px-2.5 py-2 text-xs font-semibold text-navy-800 transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <SlidersHorizontal className="size-3.5 shrink-0" aria-hidden />
              Customize
            </button>
          ) : (
            <button
              type="button"
              disabled={disabled}
              onClick={(e) => openPreview(selected, e)}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-blue-200/80 bg-white px-2.5 py-2 text-xs font-semibold text-navy-800 transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Eye className="size-3.5 shrink-0" aria-hidden />
              Preview
            </button>
          )}
        </div>
        {isCustomParticipantTheme(selected) ? (
          <button
            type="button"
            disabled={disabled}
            onClick={(e) => openPreview(selected, e)}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-blue-200/80 bg-white px-2.5 py-2 text-xs font-semibold text-navy-800 transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Eye className="size-3.5 shrink-0" aria-hidden />
            Fullscreen preview
          </button>
        ) : null}
      </div>

      <Modal
        open={pickerOpen}
        title="Choose participant theme"
        subtitle="Pick a preset or create your own. Use Preview to see a full participant question."
        onClose={() => setPickerOpen(false)}
        size="lg"
      >
        <div className="space-y-2.5">
          {PARTICIPANT_THEMES.map((theme) => (
            <ThemeOptionRow
              key={theme.id}
              theme={theme}
              isActive={selected === theme.id}
              disabled={disabled}
              onSelect={selectTheme}
              onPreview={openPreview}
            />
          ))}
          <ThemeOptionRow
            theme={customRowMeta}
            isActive={isCustomParticipantTheme(selected)}
            disabled={disabled}
            onSelect={selectTheme}
            onPreview={openPreview}
            onCustomize={() => setCustomizerOpen(true)}
          />
        </div>
        <div className="mt-4 flex justify-end border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={() => setPickerOpen(false)}
            className="rounded-xl bg-navy-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800"
          >
            Done
          </button>
        </div>
      </Modal>

      <CustomThemeEditor
        open={customizerOpen}
        initialColors={colors}
        disabled={disabled}
        deptId={deptId ? String(deptId) : null}
        onClose={() => setCustomizerOpen(false)}
        onSave={saveCustom}
      />

      {previewThemeId != null ? (
        <FullscreenThemePreview
          themeId={previewThemeId}
          customColors={colors}
          selectedThemeId={selected}
          disabled={disabled}
          onClose={closePreview}
          onApply={applyFromPreview}
        />
      ) : null}
    </div>
  )
}
