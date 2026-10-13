import { PodiumCelebration } from '../../components/podium/PodiumCelebration'
import { PresentSlideHeader } from './PresentShell'

export function Top3PodiumSlide({
  sessionTitle,
  sessionLogoUrl,
  leaderboard,
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
  return (
    <div className="quiz-slide-in present-podium flex min-h-0 flex-1 flex-col">
      <PresentSlideHeader
        sessionTitle={sessionTitle}
        sessionLogoUrl={sessionLogoUrl}
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

      <PodiumCelebration leaderboard={leaderboard} />
    </div>
  )
}
