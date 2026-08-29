import { Trophy } from 'lucide-react'
import { ParticipantRankingList } from './ParticipantRankingList'

export function OverallLeaderboardPanel({
  leaderboard,
  sessionStatus,
  isLoading = false,
}) {
  return (
    <section className="quiz-enter space-y-4 rounded-2xl border border-blue-200/70 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Trophy className="size-5 text-amber-600" aria-hidden />
        <h2 className="text-xl font-bold text-navy-900">Overall Rankings</h2>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-600">Loading rankings…</p>
      ) : (
        <ParticipantRankingList
          entries={leaderboard}
          timeMode="session"
          emptyMessage={
            sessionStatus === 'completed'
              ? 'No scores were recorded for this session.'
              : 'No scores yet. Rankings update as participants answer quiz questions.'
          }
        />
      )}
    </section>
  )
}
