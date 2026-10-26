import { Users } from 'lucide-react'
import { BrandLogoPair } from '../../../components/branding/BrandLogoPair'
import { HeaderQuizTimer } from './HeaderQuizTimer'

export function SessionHeader({
  session,
  joinedUser,
  hasQuizCountdown = false,
  quizTimer = 0,
  quizTimeLimit = 0,
}) {
  const showParticipantCount = Boolean(session?.show_participant_count)
  const showSessionTitle = session?.show_session_title !== false
  const showAppLogo = session?.show_app_logo !== false
  const liveCount = Number(session?.live_participants_count)
  const fallbackCount = Number(session?.participants_count)
  const participantCount = Number.isFinite(liveCount) && liveCount >= 0 ? liveCount : fallbackCount
  const hasParticipantCount =
    showParticipantCount && Number.isFinite(participantCount) && participantCount >= 0
  const showRightCluster = hasParticipantCount || hasQuizCountdown

  return (
    <div className="participant-topbar flex flex-col gap-3 rounded-2xl border border-blue-200/70 bg-white p-4 shadow-sm shadow-navy-900/5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0 flex-1">
        <BrandLogoPair
          variant="header"
          sessionLogoUrl={session?.logo_url}
          sessionTitle={session?.title || 'Session'}
          showAppLogo={showAppLogo}
          className="mb-2"
        />
        {showSessionTitle ? (
          <h1
            className="participant-heading line-clamp-2 text-xl font-bold text-navy-900"
            title={session?.title || ''}
          >
            {session.title}
          </h1>
        ) : null}
        <p className="participant-muted truncate text-sm text-slate-600">
          {joinedUser?.name
            ? `${joinedUser.name}${!joinedUser.anonymous && joinedUser.email ? ` • ${joinedUser.email}` : ''}`
            : joinedUser?.anonymous
              ? 'Anonymous participant'
              : ''}
        </p>
      </div>

      {showRightCluster ? (
        <div className="flex w-full flex-wrap items-stretch gap-2 sm:w-auto sm:shrink-0 sm:justify-end">
          {hasQuizCountdown ? (
            <HeaderQuizTimer timer={quizTimer} timeLimit={quizTimeLimit} />
          ) : null}
          {hasParticipantCount ? (
            <div
              className="inline-flex items-center gap-2 rounded-xl border border-indigo-200/80 bg-indigo-50/80 px-3 py-2 text-sm font-semibold text-indigo-950"
              title="Participants currently connected"
            >
              <Users className="size-4 shrink-0 text-indigo-700" aria-hidden />
              <span className="tabular-nums">{participantCount}</span>
              <span className="text-xs font-medium text-indigo-800/80">
                participant{participantCount === 1 ? '' : 's'}
              </span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
