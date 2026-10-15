import { Calendar, Clock3, Play, Users } from 'lucide-react'
import { BrandLogoPair } from '../../components/branding/BrandLogoPair'
import {
  formatScheduledDateForDisplay,
  formatScheduledTimeForDisplay,
} from '../../utils/sessionSchedule'
import { SessionMetaRow } from './PresentJoinInfo'
import { PresentInstructionsPanel } from './PresentInstructionsPanel'

function resolveStatusLabel(session, isSessionLive) {
  const status = String(session?.status || '').toLowerCase()
  if (status === 'live' || isSessionLive) return 'Live'
  if (status === 'paused') return 'Paused'
  if (status === 'completed' || status === 'archived') return 'Ended'
  return 'Not started'
}

function AudienceCard({ joined, live }) {
  return (
    <div className="rounded-[2rem] border border-blue-200/70 bg-white/95 px-[clamp(1.25rem,3vw,2rem)] py-[clamp(1.25rem,3vh,2rem)] shadow-xl shadow-navy-900/10">
      <div className="flex items-center justify-center gap-2 text-slate-500">
        <Users className="size-[clamp(1rem,2vw,1.25rem)]" aria-hidden />
        <p className="text-[clamp(0.7rem,1.3vw,0.85rem)] font-semibold uppercase tracking-wider">
          Audience
        </p>
      </div>
      <div className="mt-[clamp(0.75rem,2vh,1.25rem)] grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-blue-100 bg-slate-50/80 px-4 py-4 text-center">
          <p className="text-[clamp(0.65rem,1.2vw,0.75rem)] font-semibold uppercase tracking-wider text-slate-500">
            Joined
          </p>
          <p className="mt-1 text-[clamp(2rem,6vw,3.5rem)] font-bold tabular-nums leading-none text-navy-900">
            {joined}
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-4 text-center">
          <p className="text-[clamp(0.65rem,1.2vw,0.75rem)] font-semibold uppercase tracking-wider text-emerald-800/80">
            Live
          </p>
          <p className="mt-1 inline-flex items-center justify-center gap-2 text-[clamp(2rem,6vw,3.5rem)] font-bold tabular-nums leading-none text-emerald-800">
            <span className="relative flex size-3 shrink-0" aria-hidden>
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-3 rounded-full bg-emerald-500" />
            </span>
            {live}
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * Lobby body for the first Present slide when join/session info is hidden.
 * Branding + status + optional schedule + audience counts — no QR/code/links.
 * When instructions are on: left = schedule/audience, right = instructions panel.
 */
export function PresentSessionReadyLobby({
  session,
  participantCount = 0,
  liveParticipantCount = 0,
  showParticipantStats = true,
  showInstructions = false,
  instructions = [],
  readOnly = false,
  isSessionLive = false,
  showActivateAll = false,
  activateAllPending = false,
  onActivateAll,
  className = '',
}) {
  const sessionTitle = session?.title || 'Live session'
  const statusLabel = resolveStatusLabel(session, isSessionLive)
  const hasSchedule = Boolean(session?.scheduled_date || session?.scheduled_time)
  const dateLabel =
    formatScheduledDateForDisplay(session?.scheduled_date) ||
    (session?.created_at
      ? formatScheduledDateForDisplay(String(session.created_at).slice(0, 10))
      : null) ||
    'Not scheduled'
  const timeLabel = formatScheduledTimeForDisplay(session?.scheduled_time) || '—'
  const joined = Number(participantCount) || 0
  const live = Number(liveParticipantCount) || 0

  const hasLeftContent = hasSchedule || showParticipantStats
  const useSplit = showInstructions && hasLeftContent

  const scheduleBlock = hasSchedule ? (
    <div className="grid min-w-0 gap-[clamp(0.65rem,1.5vh,0.85rem)] sm:grid-cols-2">
      <SessionMetaRow icon={Calendar} label="Date" value={dateLabel} />
      <SessionMetaRow icon={Clock3} label="Time" value={timeLabel} />
    </div>
  ) : null

  const audienceBlock = showParticipantStats ? (
    <AudienceCard joined={joined} live={live} />
  ) : null

  const leftStack = (
    <div className="flex h-full min-w-0 flex-col gap-[clamp(0.75rem,2vh,1.25rem)]">
      {scheduleBlock}
      {audienceBlock}
    </div>
  )

  return (
    <div
      className={`flex min-h-0 w-full min-w-0 flex-1 flex-col items-center justify-center overflow-x-hidden px-[clamp(0.5rem,2vw,1.5rem)] ${className}`}
    >
      <div
        className={`quiz-enter flex w-full min-w-0 flex-1 flex-col ${
          showInstructions ? 'max-w-[min(100%,96rem)]' : 'max-w-5xl'
        }`}
      >
        <div className="mb-[clamp(1rem,3vh,1.75rem)] shrink-0 text-center">
          {session?.logo_url ? (
            <BrandLogoPair
              variant="present"
              sessionLogoUrl={session.logo_url}
              sessionTitle={sessionTitle}
              className="mb-4 justify-center"
            />
          ) : null}
          <p className="text-[clamp(0.75rem,1.4vw,0.95rem)] font-semibold uppercase tracking-[0.3em] text-navy-600/80">
            Session ready
          </p>
          <p className="mt-3 inline-flex items-center gap-2 text-[clamp(0.95rem,1.8vw,1.2rem)] font-semibold text-slate-700">
            {statusLabel === 'Live' ? (
              <span className="relative flex size-2.5 shrink-0" aria-hidden>
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
              </span>
            ) : null}
            <span>{statusLabel}</span>
          </p>
        </div>

        {useSplit ? (
          <div className="mb-[clamp(1rem,2.5vh,1.5rem)] grid min-h-0 min-w-0 flex-1 items-stretch gap-[clamp(1rem,2.5vw,1.75rem)] lg:grid-cols-[minmax(26rem,32rem)_minmax(0,1fr)]">
            {leftStack}
            <PresentInstructionsPanel
              instructions={instructions}
              className="h-full min-h-0"
            />
          </div>
        ) : null}

        {!useSplit && hasLeftContent ? (
          <div className="mb-[clamp(1rem,2.5vh,1.5rem)] space-y-[clamp(0.75rem,2vh,1.25rem)]">
            {scheduleBlock}
            {audienceBlock}
          </div>
        ) : null}

        {!useSplit && showInstructions ? (
          <div className="mb-[clamp(1rem,2.5vh,1.5rem)] mx-auto w-full max-w-3xl">
            <PresentInstructionsPanel instructions={instructions} />
          </div>
        ) : null}

        {showActivateAll && !readOnly ? (
          <div className="mt-auto shrink-0 pb-[clamp(0.75rem,2vh,1.25rem)] text-center">
            <button
              type="button"
              disabled={activateAllPending || typeof onActivateAll !== 'function'}
              onClick={() => onActivateAll?.()}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-[clamp(1.25rem,3vw,1.75rem)] py-[clamp(0.75rem,1.8vh,1rem)] text-[clamp(0.95rem,1.8vw,1.15rem)] font-semibold text-white shadow-lg shadow-emerald-900/25 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Play className="size-5" aria-hidden />
              {activateAllPending ? 'Activating…' : 'Activate All'}
            </button>
            <p className="mt-2 text-[clamp(0.75rem,1.3vw,0.9rem)] text-slate-500">
              Starts the quiz for all participants and begins the quiz clock.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default PresentSessionReadyLobby
