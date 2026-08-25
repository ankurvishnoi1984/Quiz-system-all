import { Trophy } from 'lucide-react'
import { ParticipantRankingList } from '../ParticipantRankingList'

export function QuestionLeaderboard({ entries }) {
  const rankedEntries = (entries || []).filter((entry) => Number(entry?.score ?? 0) > 0)

  return (
    <div className="quiz-enter rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-bold text-amber-900">
        <Trophy className="mr-2 inline size-4" />
        Question rankings
      </p>
      <div className="mt-3">
        <ParticipantRankingList
          entries={rankedEntries}
          timeMode="question"
          limit={5}
          compact
          emptyMessage={
            (entries || []).length > 0
              ? 'No one gave a correct answer'
              : 'Rankings will appear as participants answer this question.'
          }
        />
      </div>
    </div>
  )
}
