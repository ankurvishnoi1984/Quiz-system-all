import { useEffect } from 'react'
import { PodiumCelebration } from '../../../components/podium/PodiumCelebration'
import { playPodiumCelebration } from '../../../utils/timerSounds'

export function ParticipantPodiumPanel({ leaderboard }) {
  useEffect(() => {
    playPodiumCelebration()
  }, [])

  return (
    <section
      className="present-podium quiz-enter flex min-h-[min(85dvh,720px)] flex-1 flex-col"
      aria-label="Top 3 celebration podium"
    >
      <PodiumCelebration leaderboard={leaderboard} />
    </section>
  )
}
