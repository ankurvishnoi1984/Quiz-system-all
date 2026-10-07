import { Check, Eye, Palette, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Modal from '../ui/Modal'
import { QuestionTimer } from '../../pages/participant-session/components/question/QuestionTimer'
import {
  DEFAULT_PARTICIPANT_THEME,
  PARTICIPANT_THEMES,
  getParticipantThemeMeta,
  normalizeParticipantTheme,
} from '../../utils/participantTheme'

const PREVIEW_TIMER_SECONDS = 45
const PREVIEW_TIME_LIMIT = 60

const PREVIEW_OPTIONS = [
  { key: 'A', label: 'Paris', selected: true },
  { key: 'B', label: 'London', selected: false },
  { key: 'C', label: 'Berlin', selected: false },
  { key: 'D', label: 'Madrid', selected: false },
]

function FullscreenThemePreview({
  themeId,
  selectedThemeId,
  disabled,
  onClose,
  onApply,
}) {
  const theme = getParticipantThemeMeta(themeId)
  const isSelected = selectedThemeId === theme.id

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
      role="dialog"
      aria-modal="true"
      aria-labelledby="participant-theme-preview-title"
    >
      <header className="relative z-10 flex shrink-0 items-center justify-between gap-3 border-b border-white/50 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-md sm:px-6">
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
          <section className="participant-surface quiz-fade-in space-y-4 rounded-2xl border border-blue-200/70 bg-white/92 p-5 shadow-sm shadow-navy-900/5 backdrop-blur-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="participant-accent-text min-w-0 truncate text-xs font-semibold uppercase tracking-wider text-navy-700">
                Question 1 / 10
              </p>
              <p className="max-w-[min(100%,20rem)] text-right text-[11px] font-medium leading-snug text-slate-500">
                Answer this question or wait for the timer to use Next.
              </p>
            </div>

            <h2 className="participant-heading text-2xl font-bold text-navy-900">
              What is the capital of France?
            </h2>

            <QuestionTimer
              timer={PREVIEW_TIMER_SECONDS}
              timeLimit={PREVIEW_TIME_LIMIT}
              soundEnabled={false}
            />

            <div className="grid gap-2 md:grid-cols-2">
              {PREVIEW_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  tabIndex={-1}
                  className={`quiz-option rounded-2xl border px-4 py-4 text-left text-sm font-semibold transition ${
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

          <p className="text-center text-xs font-medium uppercase tracking-wide text-slate-500">
            Dummy question · Preview only · {theme.label}
          </p>
        </div>
      </div>

      <footer className="relative z-10 flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-white/50 bg-white/90 px-4 py-3 backdrop-blur-md sm:px-6">
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

function ThemeOptionRow({
  theme,
  isActive,
  disabled,
  onSelect,
  onPreview,
}) {
  const isDefault = theme.id === DEFAULT_PARTICIPANT_THEME

  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border bg-white p-2.5 transition sm:flex-row sm:items-center sm:gap-3 sm:p-3 ${
        isActive
          ? 'border-navy-600 ring-2 ring-navy-600/20 shadow-sm'
          : 'border-blue-200/80 hover:border-blue-300'
      } ${disabled ? 'opacity-60' : ''}`}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSelect(theme.id)}
        aria-pressed={isActive}
        className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-not-allowed"
      >
        <div
          className="participant-theme-preview participant-theme-preview--row participant-session-bg relative shrink-0 overflow-hidden rounded-lg"
          data-participant-theme={theme.id}
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

      <button
        type="button"
        disabled={disabled}
        onClick={(e) => onPreview(theme.id, e)}
        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-blue-200/80 bg-slate-50 px-3 py-2 text-xs font-semibold text-navy-800 transition hover:bg-sky-50 disabled:cursor-not-allowed sm:self-center"
      >
        <Eye className="size-3.5" aria-hidden />
        Preview
      </button>
    </div>
  )
}

export function ParticipantThemePicker({
  value,
  onChange,
  disabled = false,
}) {
  const selected = normalizeParticipantTheme(value)
  const selectedMeta = getParticipantThemeMeta(selected)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [previewThemeId, setPreviewThemeId] = useState(null)

  const openPreview = (themeId, event) => {
    event?.stopPropagation?.()
    event?.preventDefault?.()
    setPreviewThemeId(normalizeParticipantTheme(themeId))
  }

  const closePreview = () => setPreviewThemeId(null)

  const applyFromPreview = () => {
    if (previewThemeId == null || disabled) return
    onChange?.(normalizeParticipantTheme(previewThemeId))
    closePreview()
  }

  const selectTheme = (themeId) => {
    if (disabled) return
    onChange?.(normalizeParticipantTheme(themeId))
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
            <p className="mt-1.5 text-xs leading-snug text-slate-500">{selectedMeta.description}</p>
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
          <button
            type="button"
            disabled={disabled}
            onClick={(e) => openPreview(selected, e)}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-blue-200/80 bg-white px-2.5 py-2 text-xs font-semibold text-navy-800 transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Eye className="size-3.5 shrink-0" aria-hidden />
            Preview
          </button>
        </div>
      </div>

      <Modal
        open={pickerOpen}
        title="Choose participant theme"
        subtitle="Pick a background for join, waiting, and quiz screens. Use Preview to see a full participant question."
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

      {previewThemeId != null ? (
        <FullscreenThemePreview
          themeId={previewThemeId}
          selectedThemeId={selected}
          disabled={disabled}
          onClose={closePreview}
          onApply={applyFromPreview}
        />
      ) : null}
    </div>
  )
}
