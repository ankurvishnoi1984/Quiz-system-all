import { Calendar, Clock3, Users } from 'lucide-react'
import { BrandLogoPair } from '../../components/branding/BrandLogoPair'
import {
  formatScheduledDateForDisplay,
  formatScheduledTimeForDisplay,
} from '../../utils/sessionSchedule'
import { SessionMetaRow } from './PresentJoinInfo'

function resolveStatusLabel(session, isSessionLive) {
  const status = String(session?.status || '').toLowerCase()
  if (status === 'live' || isSessionLive) return 'Live'
  if (status === 'paused') return 'Paused'
  if (status === 'completed' || status === 'archived') return 'Ended'
  return 'Not started'
}

/**
 * Lobby body for the first Present slide when join/session info is hidden.
 * Branding + status + optional schedule + audience counts — no QR/code/links.
 */
export function PresentSessionReadyLobby({
  session,
  participantCount = 0,
  liveParticipantCount = 0,
  showParticipantStats = true,
  readOnly = false,
  isSessionLive = false,
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

  return (
    <div
      className={`flex min-h-0 w-full min-w-0 flex-1 flex-col items-center justify-center overflow-x-hidden px-[clamp(0.5rem,2vw,1.5rem)] ${className}`}
    >
      <div className="quiz-enter w-full min-w-0 max-w-4xl">
        <div className="mb-[clamp(1rem,3vh,1.75rem)] text-center">
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
          {/* <h2 className="mt-2 text-[clamp(1.75rem,5vw,3.25rem)] font-bold leading-tight text-navy-900">
            {sessionTitle}
          </h2> */}
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

        {hasSchedule ? (
          <div className="mb-[clamp(0.75rem,2vh,1.25rem)] grid min-w-0 gap-[clamp(0.65rem,1.5vh,0.85rem)] sm:grid-cols-2">
            <SessionMetaRow icon={Calendar} label="Date" value={dateLabel} />
            <SessionMetaRow icon={Clock3} label="Time" value={timeLabel} />
          </div>
        ) : null}

        {showParticipantStats ? (
          <div className="mb-[clamp(1rem,2.5vh,1.5rem)] rounded-[2rem] border border-blue-200/70 bg-white/95 px-[clamp(1.25rem,3vw,2rem)] py-[clamp(1.25rem,3vh,2rem)] shadow-xl shadow-navy-900/10">
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
        ) : null}

        <p className="text-center text-[clamp(0.95rem,1.8vw,1.2rem)] leading-relaxed text-slate-600">
          {readOnly
            ? 'Waiting for the host to continue.'
            : "Advance when you're ready to show the first question."}
        </p>
      </div>
    </div>
  )
}

export default PresentSessionReadyLobby
