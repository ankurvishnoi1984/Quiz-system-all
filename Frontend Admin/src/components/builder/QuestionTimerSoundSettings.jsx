import { useRef, useState } from 'react'
import { FileUp, Loader2, Play, Volume2, X } from 'lucide-react'
import { uploadQuestionMediaApi } from '../../services/mediaApi'
import { normalizeQuestionMediaUrlForStorage, resolveQuestionMediaUrl } from '../../utils/questionMedia'
import {
  DEFAULT_TIMER_SOUND_KEY,
  DEFAULT_TIMER_SOUND_START_SECONDS,
  TIMER_SOUND_PRESETS,
  normalizeTimerSoundSettings,
  previewTimerSound,
} from '../../utils/timerSoundPresets'

const AUDIO_ACCEPT =
  'audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/ogg,audio/webm,audio/mp4,audio/aac,.mp3,.wav,.ogg,.m4a,.aac'
const AUDIO_MAX_BYTES = 5 * 1024 * 1024

function buildTabs(startSeconds) {
  const n = Number(startSeconds) || DEFAULT_TIMER_SOUND_START_SECONDS
  return [
    {
      id: 'ending',
      label: `Last ${n} second${n === 1 ? '' : 's'}`,
      hint: `Played during the final ${n} second${n === 1 ? '' : 's'}. Built-in presets apply to both tabs; custom upload is for this tab only.`,
    },
    {
      id: 'timesUp',
      label: "Time's up",
      hint: "Played when the clock hits zero. Built-in presets apply to both tabs; custom upload is for this tab only.",
    },
  ]
}

function SoundOptionPanel({
  tabId,
  selectedKey,
  customUrl,
  disabled,
  deptId,
  uploading,
  onSelectPreset,
  onPreview,
  onUploadClick,
  onRemoveCustom,
  inputRef,
  onFileChange,
}) {
  const customPreviewSrc = resolveQuestionMediaUrl(customUrl)
  const radioName = `timer-sound-${tabId}`

  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2">
        {TIMER_SOUND_PRESETS.map((preset) => {
          const active = selectedKey === preset.key
          return (
            <div
              key={preset.key}
              className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 transition ${
                active
                  ? 'border-navy-400 bg-navy-50/80 ring-1 ring-navy-200'
                  : 'border-blue-200/70 bg-white hover:border-blue-300'
              }`}
            >
              <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2">
                <input
                  type="radio"
                  name={radioName}
                  className="mt-1"
                  disabled={disabled}
                  checked={active}
                  onChange={() => onSelectPreset(preset.key)}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-navy-900">
                    {preset.label}
                    {preset.key === DEFAULT_TIMER_SOUND_KEY ? (
                      <span className="ml-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Default
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">
                    {preset.description}
                  </span>
                </span>
              </label>
              <button
                type="button"
                onClick={() => onPreview(preset.key)}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-blue-200/70 bg-white text-navy-800 transition hover:bg-blue-50"
                aria-label={`Preview ${preset.label}`}
                title="Preview"
              >
                <Play className="size-3.5" />
              </button>
            </div>
          )
        })}
      </div>

      <div
        className={`rounded-xl border px-3 py-2.5 ${
          selectedKey === 'custom'
            ? 'border-navy-400 bg-navy-50/80 ring-1 ring-navy-200'
            : 'border-blue-200/70 bg-white'
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2">
            <input
              type="radio"
              name={radioName}
              className="mt-1"
              disabled={disabled || (!customUrl && selectedKey !== 'custom')}
              checked={selectedKey === 'custom'}
              onChange={() => {
                if (customUrl) onSelectPreset('custom')
              }}
            />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-navy-900">Custom upload</span>
              <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">
                {tabId === 'ending'
                  ? 'Plays during the configurable ending countdown window.'
                  : 'Plays once when time runs out.'}
              </span>
              {customPreviewSrc ? (
                <span className="mt-1 block truncate text-[11px] font-medium text-emerald-800">
                  Custom audio ready
                </span>
              ) : (
                <span className="mt-1 block text-[11px] text-slate-500">No file uploaded yet</span>
              )}
            </span>
          </label>
          <div className="flex flex-wrap items-center gap-1.5">
            {customPreviewSrc ? (
              <button
                type="button"
                onClick={() => onPreview('custom')}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-blue-200/70 bg-white text-navy-800 transition hover:bg-blue-50"
                aria-label="Preview custom audio"
                title="Preview"
              >
                <Play className="size-3.5" />
              </button>
            ) : null}
            <input
              ref={inputRef}
              type="file"
              accept={AUDIO_ACCEPT}
              className="hidden"
              onChange={onFileChange}
            />
            <button
              type="button"
              disabled={disabled || uploading || !deptId}
              onClick={onUploadClick}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-blue-200/70 bg-white px-2.5 text-xs font-semibold text-navy-800 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <FileUp className="size-3.5" />}
              {uploading ? 'Uploading…' : customPreviewSrc ? 'Replace' : 'Upload'}
            </button>
            {customPreviewSrc ? (
              <button
                type="button"
                disabled={disabled || uploading}
                onClick={onRemoveCustom}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-red-200 bg-white px-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
              >
                <X className="size-3.5" />
                Remove
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

export function QuestionTimerSoundSettings({
  timerSoundKey = DEFAULT_TIMER_SOUND_KEY,
  timerSoundUrl = null,
  timerEndingSoundKey = DEFAULT_TIMER_SOUND_KEY,
  timerEndingSoundUrl = null,
  timerSoundStartSeconds = null,
  timeLimitSeconds = 0,
  onChange,
  disabled = false,
  deptId,
}) {
  const endingInputRef = useRef(null)
  const timesUpInputRef = useRef(null)
  const [tab, setTab] = useState('ending')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const settings = normalizeTimerSoundSettings({
    timerSoundKey,
    timerSoundUrl,
    timerEndingSoundKey,
    timerEndingSoundUrl,
    timerSoundStartSeconds,
    timeLimitSeconds,
  })

  const emit = (patch) => {
    onChange?.(
      normalizeTimerSoundSettings({
        ...settings,
        timeLimitSeconds,
        ...patch,
      }),
    )
  }

  const startSeconds =
    settings.timerSoundStartSeconds ??
    Math.min(DEFAULT_TIMER_SOUND_START_SECONDS, Math.max(1, Number(timeLimitSeconds) || 1))
  const tabs = buildTabs(startSeconds)

  const handleSelectPreset = (slot, key) => {
    if (disabled) return
    setError('')
    // Built-in presets apply to both ending + times-up so participants hear the chosen style.
    if (key !== 'custom') {
      emit({
        timerSoundKey: key,
        timerSoundUrl: null,
        timerEndingSoundKey: key,
        timerEndingSoundUrl: null,
      })
      return
    }
    if (slot === 'ending') {
      emit({
        timerEndingSoundKey: 'custom',
        timerEndingSoundUrl: settings.timerEndingSoundUrl,
      })
      return
    }
    emit({
      timerSoundKey: 'custom',
      timerSoundUrl: settings.timerSoundUrl,
    })
  }

  const handlePreview = (slot, key) => {
    if (slot === 'ending') {
      previewTimerSound('ending', {
        ...settings,
        timerEndingSoundKey: key,
        timerEndingSoundUrl: key === 'custom' ? settings.timerEndingSoundUrl : null,
      })
      return
    }
    previewTimerSound('timesUp', {
      ...settings,
      timerSoundKey: key,
      timerSoundUrl: key === 'custom' ? settings.timerSoundUrl : null,
    })
  }

  const handleUpload = async (slot, file) => {
    if (!file || disabled || uploading) return
    if (!String(file.type || '').startsWith('audio/')) {
      setError('Please upload an audio file (MP3, WAV, OGG, or M4A).')
      return
    }
    if (file.size > AUDIO_MAX_BYTES) {
      setError('Audio must be 5 MB or smaller.')
      return
    }
    if (!deptId) {
      setError('Session department is not loaded yet. Try again in a moment.')
      return
    }

    setError('')
    setUploading(true)
    try {
      const { fileUrl } = await uploadQuestionMediaApi(deptId, file)
      if (!fileUrl) throw new Error('Upload succeeded but no file URL was returned')
      const stored = normalizeQuestionMediaUrlForStorage(fileUrl) || fileUrl
      if (slot === 'ending') {
        emit({ timerEndingSoundKey: 'custom', timerEndingSoundUrl: stored })
      } else {
        emit({ timerSoundKey: 'custom', timerSoundUrl: stored })
      }
    } catch (err) {
      setError(err.message || 'Failed to upload audio')
    } finally {
      setUploading(false)
      const ref = slot === 'ending' ? endingInputRef : timesUpInputRef
      if (ref.current) ref.current.value = ''
    }
  }

  const activeTab = tabs.find((item) => item.id === tab) || tabs[0]
  const limitSeconds = Math.max(1, Math.floor(Number(timeLimitSeconds) || 1))
  const remainingSeconds = Math.min(limitSeconds, Math.max(1, startSeconds))
  const maxAfterSeconds = Math.max(0, limitSeconds - 1)
  const afterSeconds = Math.min(maxAfterSeconds, Math.max(0, limitSeconds - remainingSeconds))

  return (
    <div className="mt-4 border-t border-blue-100 pt-4">
      <div className="flex items-start gap-2">
        <Volume2 className="mt-0.5 size-4 shrink-0 text-navy-700" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-navy-900">Timer audio</p>
          <p className="text-xs text-slate-600">
            Choose a style once — it applies to all timed questions, and to both the ending
            countdown and time&apos;s-up. Save the session so participants receive it.
          </p>
        </div>
      </div>

      <label className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200/70 bg-emerald-50/40 px-3 py-2.5">
        <span className="text-sm font-semibold text-navy-900">Start sound after</span>
        <input
          type="number"
          min={0}
          max={maxAfterSeconds}
          disabled={disabled}
          value={afterSeconds}
          onChange={(e) => {
            const nextAfter = Number(e.target.value)
            if (!Number.isFinite(nextAfter)) return
            const clampedAfter = Math.min(maxAfterSeconds, Math.max(0, Math.round(nextAfter)))
            emit({
              timerSoundStartSeconds: Math.min(
                limitSeconds,
                Math.max(1, limitSeconds - clampedAfter),
              ),
            })
          }}
          className="h-9 w-20 rounded-lg border border-emerald-200/80 bg-white px-2 text-sm font-semibold text-navy-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15 disabled:cursor-not-allowed disabled:bg-slate-50"
          aria-label="Seconds after question start when countdown sound begins"
        />
        <span className="text-sm text-slate-600">
          seconds
          <span className="ml-1 text-xs text-slate-500">(when {remainingSeconds}s left)</span>
        </span>
      </label>

      <div className="mt-3 flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setTab(item.id)
              setError('')
            }}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
              tab === item.id
                ? 'bg-white text-navy-900 shadow-sm'
                : 'text-slate-600 hover:text-navy-800'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-slate-500">{activeTab.hint}</p>

      <div className="mt-3">
        {tab === 'ending' ? (
          <SoundOptionPanel
            tabId="ending"
            selectedKey={settings.timerEndingSoundKey}
            customUrl={settings.timerEndingSoundUrl}
            disabled={disabled}
            deptId={deptId}
            uploading={uploading}
            onSelectPreset={(key) => handleSelectPreset('ending', key)}
            onPreview={(key) => handlePreview('ending', key)}
            onUploadClick={() => endingInputRef.current?.click()}
            onRemoveCustom={() => {
              setError('')
              emit({
                timerEndingSoundKey: DEFAULT_TIMER_SOUND_KEY,
                timerEndingSoundUrl: null,
              })
            }}
            inputRef={endingInputRef}
            onFileChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void handleUpload('ending', file)
            }}
          />
        ) : (
          <SoundOptionPanel
            tabId="timesUp"
            selectedKey={settings.timerSoundKey}
            customUrl={settings.timerSoundUrl}
            disabled={disabled}
            deptId={deptId}
            uploading={uploading}
            onSelectPreset={(key) => handleSelectPreset('timesUp', key)}
            onPreview={(key) => handlePreview('timesUp', key)}
            onUploadClick={() => timesUpInputRef.current?.click()}
            onRemoveCustom={() => {
              setError('')
              emit({
                timerSoundKey: DEFAULT_TIMER_SOUND_KEY,
                timerSoundUrl: null,
              })
            }}
            inputRef={timesUpInputRef}
            onFileChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void handleUpload('timesUp', file)
            }}
          />
        )}
      </div>

      {error ? <p className="mt-2 text-xs font-semibold text-red-700">{error}</p> : null}
    </div>
  )
}

export default QuestionTimerSoundSettings
