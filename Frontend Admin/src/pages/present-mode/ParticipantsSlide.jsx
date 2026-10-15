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
  hasQuizCountdown = false,
  quizTimer = 0,
  quizTimeLimit = 0,
}) {
  const sessionTitle = session?.title || 'Live session'
  const presentSettings = getPresentModeSettings(session)
  const showSessionInfo = presentSettings.showSessionInfo
  const customInstructions = presentSettings.customInstructions || []
  const showInstructions =
    presentSettings.showCustomInstructions && customInstructions.length > 0

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
        hasQuizCountdown={hasQuizCountdown}
        quizTimer={quizTimer}
        quizTimeLimit={quizTimeLimit}
      />

      {showSessionInfo ? (
        <PresentJoinPanel
          session={session}
          showInstructions={showInstructions}
          instructions={customInstructions}
        />
      ) : (
        <PresentSessionReadyLobby
          session={session}
          participantCount={participantCount}
          liveParticipantCount={liveParticipantCount}
          showParticipantStats={showParticipantStats}
          showInstructions={showInstructions}
          instructions={customInstructions}
          readOnly={readOnly}
          isSessionLive={isSessionLive}
        />
      )}
    </div>
  )
}
