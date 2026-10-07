import { Trophy } from 'lucide-react'
import { ParticipantRankingList } from './ParticipantRankingList'

export function OverallLeaderboardPanel({
  leaderboard,
  sessionStatus,
  isLoading = false,
  title = 'Overall Rankings',
  viewerEntry = null,
  highlightParticipantId = null,
  topN = 10,
}) {
  return (
    <section className="participant-surface quiz-enter space-y-4 rounded-2xl border border-blue-200/70 bg-white/92 p-5 shadow-sm shadow-navy-900/5 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <Trophy className="size-5 text-amber-600" aria-hidden />
        <h2 className="text-xl font-bold text-navy-900">{title}</h2>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-600">Loading rankings…</p>
      ) : (
        <ParticipantRankingList
          entries={leaderboard}
          timeMode="session"
          limit={topN}
          highlightParticipantId={highlightParticipantId}
          viewerEntry={viewerEntry}
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
