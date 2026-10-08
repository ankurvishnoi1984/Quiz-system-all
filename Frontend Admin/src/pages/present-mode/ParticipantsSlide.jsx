import { PresentSlideHeader } from './PresentShell'
import { PresentJoinPanel } from './PresentJoinInfo'
import { PresentSessionReadyLobby } from './PresentSessionReadyLobby'
import { getPresentModeSettings } from '../../utils/presentModeSettings'

export function ParticipantsSlide({
  session,
  participantCount,
  liveParticipantCount = 0,
  qaCount,
  isSessionLive,
  onParticipantsClick,
  onOverallRankingsClick,
  overallRankingsActive = false,
  onQaClick,
  readOnly = false,
  showParticipantStats = true,
}) {
  const sessionTitle = session?.title || 'Live session'
  const showSessionInfo = getPresentModeSettings(session).showSessionInfo

  return (
    <div className="quiz-slide-in flex min-h-0 flex-1 flex-col">
      <PresentSlideHeader
        sessionTitle={sessionTitle}
        sessionLogoUrl={session?.logo_url}
        participantCount={participantCount}
        liveParticipantCount={liveParticipantCount}
        qaCount={qaCount}
        isSessionLive={isSessionLive}
        onParticipantsClick={onParticipantsClick}
        onOverallRankingsClick={onOverallRankingsClick}
        overallRankingsActive={overallRankingsActive}
        onQaClick={onQaClick}
        readOnly={readOnly}
        showParticipantStats={showParticipantStats}
      />

      {showSessionInfo ? (
        <PresentJoinPanel session={session} />
      ) : (
        <PresentSessionReadyLobby
          session={session}
          participantCount={participantCount}
          liveParticipantCount={liveParticipantCount}
          showParticipantStats={showParticipantStats}
          readOnly={readOnly}
          isSessionLive={isSessionLive}
        />
      )}
    </div>
  )
}
