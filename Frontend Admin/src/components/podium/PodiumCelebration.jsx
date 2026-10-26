import { useEffect, useState } from 'react'
import { Trophy } from 'lucide-react'
import { normalizeLeaderboardEntries } from '../../utils/leaderboard'

const PODIUM_ORDER = [
  { rank: 2, place: 'silver' },
  { rank: 1, place: 'gold' },
  { rank: 3, place: 'bronze' },
]

const CONFETTI_PIECES = Array.from({ length: 64 }, (_, i) => i)

/** Fixed burst positions; density class toggles how many are active. */
const FIREWORK_BURSTS = [
  { top: '10%', left: '12%', color: 1, delay: '0s' },
  { top: '18%', left: '78%', color: 2, delay: '0.4s' },
  { top: '8%', left: '48%', color: 3, delay: '0.8s' },
  { top: '28%', left: '28%', color: 4, delay: '1.1s' },
  { top: '22%', left: '62%', color: 5, delay: '1.5s' },
  { top: '14%', left: '88%', color: 6, delay: '0.2s' },
  { top: '32%', left: '8%', color: 1, delay: '1.8s' },
  { top: '6%', left: '32%', color: 2, delay: '0.6s' },
  { top: '26%', left: '92%', color: 3, delay: '1.3s' },
  { top: '12%', left: '58%', color: 4, delay: '2s' },
  { top: '36%', left: '42%', color: 5, delay: '0.9s' },
  { top: '16%', left: '18%', color: 6, delay: '1.6s' },
]

const FIREWORK_SPARKS = Array.from({ length: 12 }, (_, i) => i)

function PodiumMascot() {
  return (
    <svg
      className="present-podium-mascot"
      viewBox="-24 0 208 170"
      width="208"
      height="170"
      overflow="visible"
      aria-hidden
    >
      <ellipse cx="80" cy="88" rx="58" ry="52" fill="#fef3c7" opacity="0.45" />
      <ellipse cx="80" cy="158" rx="36" ry="7" fill="rgba(15, 23, 42, 0.14)" />

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

      <path d="M52 42 L80 8 L108 42 Z" fill="#7c3aed" />
      <path d="M52 42 L80 8 L90 42 Z" fill="#a78bfa" opacity="0.55" />
      <circle cx="80" cy="10" r="7" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1.5" />
      <circle cx="80" cy="10" r="3" fill="#fff7ed" />
      <ellipse cx="80" cy="42" rx="30" ry="6" fill="#4c1d95" />
      <circle cx="62" cy="30" r="3" fill="#f472b6" />
      <circle cx="95" cy="26" r="2.5" fill="#38bdf8" />
      <circle cx="72" cy="22" r="2" fill="#fde68a" />

      <circle cx="80" cy="68" r="32" fill="#fcd34d" />
      <circle cx="80" cy="68" r="32" fill="url(#mascotHeadShine)" />
      <ellipse cx="68" cy="62" rx="10" ry="7" fill="#fef9c3" opacity="0.55" />

      <ellipse cx="58" cy="76" rx="7" ry="4.5" fill="#fb7185" opacity="0.45" />
      <ellipse cx="102" cy="76" rx="7" ry="4.5" fill="#fb7185" opacity="0.45" />

      <ellipse cx="68" cy="64" rx="5.5" ry="6.5" fill="#1e3a5f" />
      <ellipse cx="92" cy="64" rx="5.5" ry="6.5" fill="#1e3a5f" />
      <circle cx="70" cy="62" r="2" fill="#fff" />
      <circle cx="94" cy="62" r="2" fill="#fff" />

      <path
        d="M66 78 Q80 92 94 78"
        fill="none"
        stroke="#1e3a5f"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path d="M72 82 Q80 88 88 82" fill="#fb7185" opacity="0.35" />

      <path
        d="M52 98 Q52 92 80 90 Q108 92 108 98 L112 128 Q80 138 48 128 Z"
        fill="#2563eb"
      />
      <path d="M60 98 Q80 94 100 98 L102 122 Q80 128 58 122 Z" fill="#3b82f6" />
      <path d="M80 94 L80 128" stroke="#1d4ed8" strokeWidth="2" opacity="0.35" />
      <path d="M74 108 L80 102 L86 108 L86 116 L74 116 Z" fill="#fbbf24" />
      <rect x="76" y="116" width="8" height="3" rx="1" fill="#f59e0b" />
      <rect x="73" y="119" width="14" height="3" rx="1.5" fill="#d97706" />

      <g className="present-podium-mascot-arm present-podium-mascot-arm--left">
        <animateTransform
          attributeName="transform"
          type="rotate"
          values="0 54 104; -20 54 104; 0 54 104"
          keyTimes="0; 0.5; 1"
          dur="1.2s"
          repeatCount="indefinite"
          calcMode="spline"
          keySplines="0.42 0 0.58 1; 0.42 0 0.58 1"
        />
        <path
          d="M54 104 Q34 88 28 64"
          fill="none"
          stroke="#fcd34d"
          strokeWidth="11"
          strokeLinecap="round"
        />
        <ellipse cx="24" cy="54" rx="12" ry="14" transform="rotate(-28 24 54)" fill="#fbbf24" />
        <ellipse
          cx="24"
          cy="54"
          rx="12"
          ry="14"
          transform="rotate(-28 24 54)"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="1.1"
        />
        <ellipse cx="34" cy="48" rx="5.5" ry="8" transform="rotate(18 34 48)" fill="#fcd34d" />
        <ellipse
          cx="34"
          cy="48"
          rx="5.5"
          ry="8"
          transform="rotate(18 34 48)"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="0.9"
        />
        <ellipse
          cx="21"
          cy="48"
          rx="4.5"
          ry="3"
          transform="rotate(-28 21 48)"
          fill="#fde68a"
          opacity="0.55"
        />
        <path
          d="M4 36 L5.6 40.4 L10 42 L5.6 43.6 L4 48 L2.4 43.6 L-2 42 L2.4 40.4 Z"
          fill="#f472b6"
        />
      </g>
      <g className="present-podium-mascot-arm present-podium-mascot-arm--right">
        <animateTransform
          attributeName="transform"
          type="rotate"
          values="0 106 104; 20 106 104; 0 106 104"
          keyTimes="0; 0.5; 1"
          dur="1.2s"
          repeatCount="indefinite"
          calcMode="spline"
          keySplines="0.42 0 0.58 1; 0.42 0 0.58 1"
        />
        <path
          d="M106 104 Q126 88 132 64"
          fill="none"
          stroke="#fcd34d"
          strokeWidth="11"
          strokeLinecap="round"
        />
        <ellipse cx="136" cy="54" rx="12" ry="14" transform="rotate(28 136 54)" fill="#fbbf24" />
        <ellipse
          cx="136"
          cy="54"
          rx="12"
          ry="14"
          transform="rotate(28 136 54)"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="1.1"
        />
        <ellipse cx="126" cy="48" rx="5.5" ry="8" transform="rotate(-18 126 48)" fill="#fcd34d" />
        <ellipse
          cx="126"
          cy="48"
          rx="5.5"
          ry="8"
          transform="rotate(-18 126 48)"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="0.9"
        />
        <ellipse
          cx="139"
          cy="48"
          rx="4.5"
          ry="3"
          transform="rotate(28 139 48)"
          fill="#fde68a"
          opacity="0.55"
        />
        <path
          d="M156 36 L157.6 40.4 L162 42 L157.6 43.6 L156 48 L154.4 43.6 L150 42 L154.4 40.4 Z"
          fill="#38bdf8"
        />
      </g>

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

/**
 * Shared Top 3 celebration stage used by Present Mode and participant ending screens.
 */
export function PodiumCelebration({ leaderboard, showTitle = true, className = '' }) {
  const [fireworksHigh, setFireworksHigh] = useState(true)
  const top3 = normalizeLeaderboardEntries(leaderboard).slice(0, 3)
  const byRank = {
    1: top3[0] || null,
    2: top3[1] || null,
    3: top3[2] || null,
  }

  useEffect(() => {
    const id = window.setInterval(() => {
      setFireworksHigh((prev) => !prev)
    }, 3500)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div
      className={`present-podium flex min-h-0 flex-1 flex-col ${
        fireworksHigh ? 'present-podium--fireworks-high' : 'present-podium--fireworks-low'
      } ${className}`.trim()}
    >
      {showTitle ? (
        <div className="present-podium-heading mb-[clamp(0.35rem,1.2vh,0.85rem)] flex shrink-0 flex-col items-center justify-center gap-0.5 px-2 text-center">
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            <Trophy
              className="size-[clamp(1.75rem,4vw,2.75rem)] text-amber-500 present-podium-title-icon"
              aria-hidden
            />
            <h2 className="present-podium-title text-[clamp(1.75rem,5.5vw,3.25rem)] font-extrabold leading-tight tracking-tight">
              Congratulations
            </h2>
          </div>
          <p className="present-podium-subtitle text-[clamp(0.95rem,2.2vw,1.35rem)] font-bold uppercase tracking-[0.18em]">
            Top 3
          </p>
        </div>
      ) : null}

      <div className="present-podium-stage relative flex min-h-0 flex-1 flex-col items-center justify-end overflow-visible px-[clamp(0.35rem,1.5vw,1.25rem)] pb-[clamp(0.35rem,1.5vh,1rem)] pt-[clamp(0.25rem,1vh,0.75rem)]">
        <div className="present-podium-glow" aria-hidden />

        <div className="present-podium-fireworks" aria-hidden>
          {FIREWORK_BURSTS.map((burst, idx) => (
            <span
              key={idx}
              className={`present-podium-firework present-podium-firework--${burst.color} ${
                idx >= 6 ? 'present-podium-firework--extra' : ''
              }`}
              style={{
                top: burst.top,
                left: burst.left,
                animationDelay: burst.delay,
              }}
            >
              <span className="present-podium-firework-core" />
              {FIREWORK_SPARKS.map((spark) => (
                <span
                  key={spark}
                  className="present-podium-firework-spark"
                  style={{
                    '--spark-angle': `${spark * 30}deg`,
                    animationDelay: burst.delay,
                  }}
                />
              ))}
            </span>
          ))}
        </div>

        <div className="present-podium-confetti" aria-hidden>
          {CONFETTI_PIECES.map((i) => (
            <span
              key={i}
              className={`present-podium-confetti-piece present-podium-confetti-piece--${(i % 12) + 1} ${
                i % 5 === 0 ? 'present-podium-confetti-piece--round' : ''
              } ${i % 7 === 0 ? 'present-podium-confetti-piece--ribbon' : ''}`}
              style={{
                left: `${2 + ((i * 11) % 96)}%`,
                animationDelay: `${(i % 16) * 0.12}s`,
                animationDuration: `${2.1 + (i % 7) * 0.35}s`,
              }}
            />
          ))}
        </div>

        <div className="present-podium-mascot-wrap mb-[clamp(-0.5rem,0.5vh,0.25rem)]">
          <PodiumMascot />
        </div>

        <div className="present-podium-row flex w-full max-w-6xl items-end justify-center gap-[clamp(0.35rem,2.5vw,2rem)]">
          {PODIUM_ORDER.map(({ rank, place }) => {
            const entry = byRank[rank]
            return (
              <div
                key={rank}
                className={`present-podium-seat present-podium-seat--${place} present-podium-seat--rank-${rank}`}
                style={{
                  animationDelay: `${rank === 1 ? 0.15 : rank === 2 ? 0.05 : 0.28}s`,
                }}
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
