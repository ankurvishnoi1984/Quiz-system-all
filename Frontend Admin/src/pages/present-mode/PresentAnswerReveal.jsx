import { Check } from 'lucide-react'
import { questionSupportsAnswerReveal } from '../../utils/answerReveal'
import { getCorrectOptionsForQuestion, getPresentOptionColor } from '../../utils/livePresentation'

export const CORRECT_STROKE = '#047857'

export function PresentAnswerRevealBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[clamp(0.7rem,1.2vw,0.8rem)] font-semibold text-emerald-800">
      <span className="grid size-5 place-items-center rounded-full bg-emerald-500 text-white">
        <Check className="size-3" strokeWidth={3} aria-hidden />
      </span>
      Key shown
    </span>
  )
}

export function PresentMatchKey({ question }) {
  if (!question?.answerRevealed) return null
  const options = question.options || []
  const left = options
    .filter((o) => o.match_side === 'left' || o.matchSide === 'left')
    .sort(
      (a, b) =>
        Number(a.display_order ?? a.displayOrder ?? 0) -
        Number(b.display_order ?? b.displayOrder ?? 0),
    )
  const rightByKey = new Map(
    options
      .filter((o) => o.match_side === 'right' || o.matchSide === 'right')
      .map((o) => [String(o.match_key ?? o.matchKey ?? ''), o]),
  )
  const pairsFromCorrect = question.correctMatchingPairs
  const rows = left.map((leftOpt) => {
    const key = String(leftOpt.match_key ?? leftOpt.matchKey ?? '')
    const fromMap = key ? rightByKey.get(key) : null
    const fromCorrectId = pairsFromCorrect
      ? Number(pairsFromCorrect[String(leftOpt.option_id)])
      : 0
    const fromCorrect = fromCorrectId
      ? options.find((o) => Number(o.option_id) === fromCorrectId)
      : null
    return {
      left: leftOpt.option_text,
      right: (fromMap || fromCorrect)?.option_text || '—',
      id: leftOpt.option_id,
    }
  })

  if (!rows.length) return null

  return (
    <div className="quiz-banner-in mt-4 border-t border-slate-200/80 pt-4">
      <p className="mb-3 text-center text-[clamp(0.7rem,1.2vw,0.8rem)] font-semibold uppercase tracking-wider text-slate-500">
        Correct matches
      </p>
      <div className="space-y-2">
        {rows.map((row, idx) => (
          <div
            key={row.id ?? idx}
            className="quiz-row-in flex flex-wrap items-center gap-3 rounded-xl border border-emerald-300/90 bg-emerald-50/90 px-4 py-3"
            style={{ animationDelay: `${idx * 70}ms` }}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-600 text-white shadow-sm">
              <Check className="size-5" strokeWidth={3} />
            </span>
            <p className="min-w-0 flex-1 text-[clamp(0.95rem,1.6vw,1.15rem)] font-semibold text-navy-900">
              {row.left}
            </p>
            <span className="text-emerald-600" aria-hidden>
              →
            </span>
            <p className="min-w-0 flex-1 text-[clamp(0.95rem,1.6vw,1.15rem)] font-semibold text-emerald-900">
              {row.right}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function buildPresentOptionRows(question, chartData = []) {
  const correctIds = new Set((question?.correctOptionIds || []).map(Number))
  const options =
    question?.options?.length > 0
      ? question.options
      : chartData.map((row, idx) => ({
          option_id: row.optionId ?? idx,
          option_text: row.name,
        }))

  return options.map((opt, idx) => {
    const chartRow =
      chartData.find(
        (d) =>
          (opt.option_id != null && Number(d.optionId) === Number(opt.option_id)) ||
          String(d.name).trim() === String(opt.option_text).trim(),
      ) || chartData[idx]
    const isCorrect =
      correctIds.size > 0
        ? correctIds.has(Number(opt.option_id))
        : Boolean(opt.is_correct) || Boolean(chartRow?.isCorrect)
    return {
      key: opt.option_id ?? idx,
      letter: chartRow?.letter || String.fromCharCode(65 + idx),
      text: opt.option_text,
      count: chartRow?.value ?? 0,
      isCorrect,
      color:
        chartRow?.color ?? getPresentOptionColor(opt.option_text, idx, question?.rawType),
    }
  })
}

function PresentOptionRows({
  question,
  chartData = [],
  answerRevealed = false,
  stacked = false,
}) {
  const rows = buildPresentOptionRows(question, chartData)
  if (!rows.length) return null

  return (
    <div className={stacked ? 'space-y-2' : 'grid gap-2 sm:grid-cols-2'}>
      {rows.map((row, idx) => {
        const highlight = answerRevealed && row.isCorrect
        return (
          <div
            key={row.key}
            className={`quiz-row-in flex items-start gap-3 rounded-xl border px-4 py-3 transition-colors ${
              highlight
                ? 'border-emerald-400/90 bg-emerald-50/90'
                : 'border-slate-200/90 bg-white/80'
            }`}
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            <span
              className="grid size-9 shrink-0 place-items-center rounded-lg text-sm font-bold text-white shadow-sm"
              style={{ backgroundColor: highlight ? '#059669' : row.color }}
              aria-hidden
            >
              {highlight ? <Check className="size-5" strokeWidth={3} /> : row.letter}
            </span>
            <div className="min-w-0 flex-1">
              <p
                className={`break-words text-[clamp(0.95rem,1.6vw,1.15rem)] font-semibold leading-snug ${
                  highlight ? 'text-emerald-900' : 'text-slate-700'
                }`}
              >
                {row.text}
              </p>
              {row.count > 0 ? (
                <p className="mt-0.5 text-[clamp(0.75rem,1.2vw,0.85rem)] text-slate-500">
                  {row.count} response{row.count === 1 ? '' : 's'}
                </p>
              ) : null}
            </div>
            {highlight ? (
              <span className="shrink-0 pt-1 text-[clamp(0.65rem,1vw,0.75rem)] font-bold uppercase tracking-wide text-emerald-600">
                Correct
              </span>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

/**
 * Side panel: full option list beside Results when responses are hidden.
 */
export function PresentOptionsPanel({
  question,
  chartData = [],
  answerRevealed = false,
}) {
  if (
    question?.rawType === 'match' ||
    question?.type === 'Match' ||
    question?.chartRawType === 'match'
  ) {
    return null
  }

  const rows = buildPresentOptionRows(question, chartData)
  if (!rows.length) return null

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-blue-200/70 bg-white/90 shadow-xl shadow-navy-900/10">
      <div className="shrink-0 border-b border-blue-100/80 px-[clamp(0.85rem,2vw,1.25rem)] py-[clamp(0.65rem,1.5vh,0.85rem)]">
        <p className="text-[clamp(0.65rem,1.2vw,0.75rem)] font-semibold uppercase tracking-wider text-slate-500">
          Options
        </p>
        <p className="text-[clamp(0.9rem,1.6vw,1rem)] font-semibold text-navy-800">
          {rows.length} choice{rows.length === 1 ? '' : 's'}
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-[clamp(0.65rem,1.5vw,1rem)]">
        <PresentOptionRows
          question={question}
          chartData={chartData}
          answerRevealed={answerRevealed}
          stacked
        />
      </div>
    </div>
  )
}

/** All options in a scannable list — correct ones get a green tick badge. */
export function PresentOptionsKey({ question, chartData = [] }) {
  if (!question?.answerRevealed) return null

  if (question.rawType === 'match' || question.type === 'Match' || question.chartRawType === 'match') {
    return <PresentMatchKey question={question} />
  }

  const rows = buildPresentOptionRows(question, chartData)
  if (!rows.length) return null

  return (
    <div className="quiz-banner-in mt-4 border-t border-slate-200/80 pt-4">
      <p className="mb-3 text-center text-[clamp(0.7rem,1.2vw,0.8rem)] font-semibold uppercase tracking-wider text-slate-500">
        Answer key
      </p>
      <PresentOptionRows question={question} chartData={chartData} answerRevealed stacked={false} />
    </div>
  )
}

export function getPresentBarFill(entry) {
  return entry.color ?? getPresentOptionColor(entry.name, entry.optionIndex ?? 0)
}

export function shouldShowAnswerRevealUi(question) {
  if (!question?.answerRevealed) return false
  if (!questionSupportsAnswerReveal(question.type, question.isQuizMode)) return false
  if (
    question.rawType === 'match' ||
    question.type === 'Match' ||
    question.chartRawType === 'match'
  ) {
    const opts = question.options || []
    return opts.some((o) => o.match_side === 'left' || o.matchSide === 'left')
  }
  return getCorrectOptionsForQuestion(question).length > 0
}

/** Green tick badge above the correct bar(s), including zero-response bars. */
export function PresentCorrectBarLabel(props) {
  const { x, y, width, viewBox, value, answerRevealed } = props
  // value is the chart row from LabelList valueAccessor (Recharts 3 strips payload).
  const entry = value && typeof value === 'object' ? value : null
  if (!answerRevealed || !entry?.isCorrect) return null

  const barX = Number(viewBox?.x ?? x)
  const barY = Number(viewBox?.y ?? y)
  const barWidth = Number(viewBox?.width ?? width)
  if (!Number.isFinite(barX) || !Number.isFinite(barY)) return null

  const w = Number.isFinite(barWidth) && barWidth > 0 ? barWidth : 28
  const cx = barX + w / 2
  const cy = barY - 14
  const r = 11

  return (
    <g aria-hidden>
      <circle cx={cx} cy={cy} r={r} fill="#059669" stroke="#fff" strokeWidth={2} />
      <path
        d={`M ${cx - 4} ${cy} L ${cx - 1} ${cy + 4} L ${cx + 5} ${cy - 4}`}
        fill="none"
        stroke="#fff"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  )
}

/** Option label only on axis — correct mark stays on the bar top to avoid overlap. */
export function PresentXAxisTick({ x, y, payload, chartData }) {
  const entry = chartData?.find((d) => d.name === payload?.value)
  const fill = entry?.color ?? '#475569'
  const label = String(payload?.value ?? '')
  const maxLen = 14
  const display =
    label.length > maxLen ? `${label.slice(0, maxLen - 1)}…` : label

  return (
    <text
      x={x}
      y={y}
      dy={20}
      textAnchor="middle"
      fill={fill}
      fontSize={15}
      fontWeight={entry?.isCorrect ? 700 : 600}
    >
      {display}
      {entry?.isCorrect ? ' ✓' : ''}
    </text>
  )
}
