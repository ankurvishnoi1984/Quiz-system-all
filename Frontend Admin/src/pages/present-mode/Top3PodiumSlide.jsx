import { Trophy } from 'lucide-react'
import { normalizeLeaderboardEntries } from '../../utils/leaderboard'
import { PresentSlideHeader } from './PresentShell'

const PODIUM_ORDER = [
  { rank: 2, place: 'silver' },
  { rank: 1, place: 'gold' },
  { rank: 3, place: 'bronze' },
]

const CONFETTI_PIECES = Array.from({ length: 42 }, (_, i) => i)

function PodiumMascot() {
  return (
    <svg
      className="present-podium-mascot"
      viewBox="0 0 160 170"
      width="160"
      height="170"
      aria-hidden
    >
      {/* Soft glow aura */}
      <ellipse cx="80" cy="88" rx="58" ry="52" fill="#fef3c7" opacity="0.45" />
      <ellipse cx="80" cy="158" rx="36" ry="7" fill="rgba(15, 23, 42, 0.14)" />

      {/* Party streamers behind */}
      <g className="present-podium-streamer present-podium-streamer--left" opacity="0.9">
        <path
          d="M28 28 Q18 55 32 78 Q12 95 24 118"
          fill="none"
          stroke="#f472b6"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M40 22 Q22 48 38 72"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <circle cx="24" cy="118" r="5" fill="#f472b6" />
        <circle cx="38" cy="72" r="4" fill="#38bdf8" />
      </g>
      <g className="present-podium-streamer present-podium-streamer--right" opacity="0.9">
        <path
          d="M132 28 Q142 55 128 78 Q148 95 136 118"
          fill="none"
          stroke="#34d399"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M120 22 Q138 48 122 72"
          fill="none"
          stroke="#a78bfa"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <circle cx="136" cy="118" r="5" fill="#34d399" />
        <circle cx="122" cy="72" r="4" fill="#a78bfa" />
      </g>

      {/* Party hat */}
      <path d="M52 42 L80 8 L108 42 Z" fill="#7c3aed" />
      <path d="M52 42 L80 8 L90 42 Z" fill="#a78bfa" opacity="0.55" />
      <circle cx="80" cy="10" r="7" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1.5" />
      <circle cx="80" cy="10" r="3" fill="#fff7ed" />
      <ellipse cx="80" cy="42" rx="30" ry="6" fill="#4c1d95" />
      <circle cx="62" cy="30" r="3" fill="#f472b6" />
      <circle cx="95" cy="26" r="2.5" fill="#38bdf8" />
      <circle cx="72" cy="22" r="2" fill="#fde68a" />

      {/* Head */}
      <circle cx="80" cy="68" r="32" fill="#fcd34d" />
      <circle cx="80" cy="68" r="32" fill="url(#mascotHeadShine)" />
      <ellipse cx="68" cy="62" rx="10" ry="7" fill="#fef9c3" opacity="0.55" />

      {/* Cheeks */}
      <ellipse cx="58" cy="76" rx="7" ry="4.5" fill="#fb7185" opacity="0.45" />
      <ellipse cx="102" cy="76" rx="7" ry="4.5" fill="#fb7185" opacity="0.45" />

      {/* Eyes */}
      <ellipse cx="68" cy="64" rx="5.5" ry="6.5" fill="#1e3a5f" />
      <ellipse cx="92" cy="64" rx="5.5" ry="6.5" fill="#1e3a5f" />
      <circle cx="70" cy="62" r="2" fill="#fff" />
      <circle cx="94" cy="62" r="2" fill="#fff" />

      {/* Big smile */}
      <path
        d="M66 78 Q80 92 94 78"
        fill="none"
        stroke="#1e3a5f"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path d="M72 82 Q80 88 88 82" fill="#fb7185" opacity="0.35" />

      {/* Body / jersey */}
      <path
        d="M52 98 Q52 92 80 90 Q108 92 108 98 L112 128 Q80 138 48 128 Z"
        fill="#2563eb"
      />
      <path
        d="M60 98 Q80 94 100 98 L102 122 Q80 128 58 122 Z"
        fill="#3b82f6"
      />
      <path d="M80 94 L80 128" stroke="#1d4ed8" strokeWidth="2" opacity="0.35" />
      {/* Trophy emblem on chest */}
      <path d="M74 108 L80 102 L86 108 L86 116 L74 116 Z" fill="#fbbf24" />
      <rect x="76" y="116" width="8" height="3" rx="1" fill="#f59e0b" />
      <rect x="73" y="119" width="14" height="3" rx="1.5" fill="#d97706" />

      {/* Arms waving */}
      <g className="present-podium-mascot-arm present-podium-mascot-arm--left">
        <path
          d="M54 104 Q28 88 22 58"
          fill="none"
          stroke="#fcd34d"
          strokeWidth="11"
          strokeLinecap="round"
        />
        <circle cx="22" cy="54" r="10" fill="#fbbf24" />
        <circle cx="18" cy="50" r="2.5" fill="#fde68a" />
        {/* Sparkle in hand */}
        <path d="M10 42 L12 48 L18 50 L12 52 L10 58 L8 52 L2 50 L8 48 Z" fill="#f472b6" />
      </g>
      <g className="present-podium-mascot-arm present-podium-mascot-arm--right">
        <path
          d="M106 104 Q132 88 138 58"
          fill="none"
          stroke="#fcd34d"
          strokeWidth="11"
          strokeLinecap="round"
        />
        <circle cx="138" cy="54" r="10" fill="#fbbf24" />
        <circle cx="142" cy="50" r="2.5" fill="#fde68a" />
        <path d="M150 42 L152 48 L158 50 L152 52 L150 58 L148 52 L142 50 L148 48 Z" fill="#38bdf8" />
      </g>

      {/* Legs */}
      <path d="M64 128 L60 152" stroke="#1e40af" strokeWidth="10" strokeLinecap="round" />
      <path d="M96 128 L100 152" stroke="#1e40af" strokeWidth="10" strokeLinecap="round" />
      <ellipse cx="58" cy="154" rx="12" ry="5" fill="#0f172a" />
      <ellipse cx="102" cy="154" rx="12" ry="5" fill="#0f172a" />

      <defs>
        <radialGradient id="mascotHeadShine" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#fef9c3" stopOpacity="0.55" />
          <stop offset="55%" stopColor="#fcd34d" stopOpacity="0" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.25" />
        </radialGradient>
      </defs>
    </svg>
  )
}

function RankBadge({ rank }) {
  const labels = { 1: '1st', 2: '2nd', 3: '3rd' }
  return (
    <span className={`present-podium-badge present-podium-badge--${rank}`} aria-hidden>
      {labels[rank] || rank}
    </span>
  )
}

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
  const top3 = normalizeLeaderboardEntries(leaderboard).slice(0, 3)
  const byRank = {
    1: top3[0] || null,
    2: top3[1] || null,
    3: top3[2] || null,
  }

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

      <div className="mb-[clamp(0.5rem,1.5vh,1rem)] flex shrink-0 flex-col items-center justify-center gap-1">
        <div className="flex items-center justify-center gap-3">
          <Trophy className="size-[clamp(2rem,5vw,3rem)] text-amber-500 present-podium-title-icon" aria-hidden />
          <h2 className="present-podium-title text-[clamp(2rem,6vw,3.5rem)] font-bold">
            Top 3
          </h2>
        </div>
        {/* <p className="text-[clamp(0.85rem,1.8vw,1rem)] font-semibold text-amber-700/80">
          Celebration podium
        </p> */}
      </div>

      <div className="present-podium-stage relative flex min-h-0 flex-1 flex-col items-center justify-end overflow-hidden px-[clamp(0.5rem,2vw,1.5rem)] pb-[clamp(0.5rem,2vh,1.25rem)]">
        <div className="present-podium-glow" aria-hidden />

        <div className="present-podium-confetti" aria-hidden>
          {CONFETTI_PIECES.map((i) => (
            <span
              key={i}
              className={`present-podium-confetti-piece present-podium-confetti-piece--${(i % 8) + 1} ${
                i % 5 === 0 ? 'present-podium-confetti-piece--round' : ''
              } ${i % 7 === 0 ? 'present-podium-confetti-piece--ribbon' : ''}`}
              style={{
                left: `${3 + ((i * 13) % 94)}%`,
                animationDelay: `${(i % 12) * 0.07}s`,
                animationDuration: `${1.6 + (i % 6) * 0.28}s`,
              }}
            />
          ))}
        </div>

        <div className="present-podium-mascot-wrap mb-[clamp(-0.25rem,1vh,0.5rem)]">
          <PodiumMascot />
        </div>

        <div className="present-podium-row flex w-full max-w-4xl items-end justify-center gap-[clamp(0.5rem,2vw,1.5rem)]">
          {PODIUM_ORDER.map(({ rank, place }) => {
            const entry = byRank[rank]
            return (
              <div
                key={rank}
                className={`present-podium-seat present-podium-seat--${place} present-podium-seat--rank-${rank}`}
                style={{ animationDelay: `${rank === 1 ? 0.15 : rank === 2 ? 0.05 : 0.28}s` }}
              >
                <div className="present-podium-info">
                  {entry ? (
                    <>
                      <p className="present-podium-name truncate" title={entry.name}>
                        {entry.name}
                      </p>
                      <p className="present-podium-score tabular-nums">
                        {entry.score}
                        <span className="present-podium-pts"> pts</span>
                      </p>
                    </>
                  ) : (
                    <p className="present-podium-empty">—</p>
                  )}
                </div>
                <div className="present-podium-pedestal">
                  <RankBadge rank={rank} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
