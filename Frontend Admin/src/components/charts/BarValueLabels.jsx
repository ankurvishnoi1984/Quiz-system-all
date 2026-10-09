/** Shared Recharts LabelList renderers for option/rating bars. */

function resolveBarGeometry(props) {
  const { x, y, width, viewBox } = props
  const barX = Number(viewBox?.x ?? x)
  const barY = Number(viewBox?.y ?? y)
  const barWidth = Number(viewBox?.width ?? width)
  if (!Number.isFinite(barX) || !Number.isFinite(barY)) return null
  const w = Number.isFinite(barWidth) && barWidth > 0 ? barWidth : 28
  return { barX, barY, w, cx: barX + w / 2 }
}

function resolveRow(props) {
  const { value } = props
  if (value && typeof value === 'object') return value
  return null
}

/**
 * Permanent percent above a bar. Omits zero-height / zero-count bars.
 * Stack with BarCorrectTickLabel: percent sits closer to the bar top.
 */
export function BarPercentLabel(props) {
  const { total = 0, fontSize = 12, answerRevealed = false } = props
  const entry = resolveRow(props)
  const count = entry != null ? Number(entry.value) : Number(props.value)
  if (!Number.isFinite(count) || count <= 0) return null
  if (!Number.isFinite(total) || total <= 0) return null

  const geo = resolveBarGeometry(props)
  if (!geo) return null

  const pct = Math.round((count / total) * 100)
  const isCorrect = Boolean(answerRevealed && entry?.isCorrect)
  const fill = isCorrect ? '#047857' : '#334155'

  return (
    <text
      x={geo.cx}
      y={geo.barY - 8}
      textAnchor="middle"
      dominantBaseline="auto"
      fill={fill}
      fontSize={fontSize}
      fontWeight={700}
      style={{ pointerEvents: 'none' }}
    >
      {pct}%
    </text>
  )
}

/**
 * Green tick above the correct bar — sits above the percent label when both show.
 */
export function BarCorrectTickLabel(props) {
  const { answerRevealed } = props
  const entry = resolveRow(props)
  if (!answerRevealed || !entry?.isCorrect) return null

  const geo = resolveBarGeometry(props)
  if (!geo) return null

  const cx = geo.cx
  const cy = geo.barY - 28
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
