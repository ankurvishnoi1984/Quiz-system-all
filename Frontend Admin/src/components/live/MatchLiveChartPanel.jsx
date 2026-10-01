import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useMemo } from 'react'
import { CHART_TOOLTIP_STYLE, getChartColor } from '../../utils/chartColors'

function buildMatchChartData(pairs) {
  return (pairs || []).map((row, idx) => ({
    name: row.leftOptionText || `Pair ${idx + 1}`,
    value: Number(row.accuracyPercent) || 0,
    correctCount: row.correctCount || 0,
    totalAnswers: row.totalAnswers || 0,
    correctRight: row.correctRightOptionText || '',
  }))
}

export function MatchLiveChartPanel({ analytics, chartView = 'bar' }) {
  const pairs = analytics?.pairs || []
  const chartData = useMemo(() => buildMatchChartData(pairs), [pairs])

  if (!pairs.length) {
    return (
      <div className="grid h-full place-items-center text-sm text-slate-500">
        Waiting for match responses…
      </div>
    )
  }

  if (chartView === 'table') {
    return (
      <div className="h-full overflow-auto">
        <div className="mb-3 flex flex-wrap gap-2 px-1">
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-navy-800 ring-1 ring-blue-200/80">
            {analytics?.totalResponses || 0} responses
          </span>
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 ring-1 ring-emerald-200/80">
            {analytics?.fullyCorrectPercent || 0}% fully correct
          </span>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-white">
            <tr className="border-b border-blue-100">
              <th className="px-3 py-2 font-semibold text-slate-700">Prompt</th>
              <th className="px-3 py-2 font-semibold text-slate-700">Correct answer</th>
              <th className="px-3 py-2 font-semibold text-slate-700">Accuracy</th>
            </tr>
          </thead>
          <tbody>
            {pairs.map((row) => (
              <tr key={row.leftOptionId} className="border-b border-blue-50">
                <td className="px-3 py-2 font-medium text-navy-900">{row.leftOptionText}</td>
                <td className="px-3 py-2 text-slate-700">{row.correctRightOptionText || '—'}</td>
                <td className="px-3 py-2 font-semibold tabular-nums text-navy-900">
                  {row.accuracyPercent}%
                  <span className="ml-1 font-normal text-slate-500">
                    ({row.correctCount}/{row.totalAnswers})
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex flex-wrap gap-2 px-1">
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-navy-800 ring-1 ring-blue-200/80">
          {analytics?.totalResponses || 0} responses
        </span>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 ring-1 ring-emerald-200/80">
          {analytics?.fullyCorrectPercent || 0}% fully correct
        </span>
      </div>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
              interval={0}
              angle={-18}
              textAnchor="end"
              height={56}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 12, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
              unit="%"
            />
            <Tooltip
              cursor={{ fill: 'rgba(79, 70, 229, 0.06)' }}
              contentStyle={CHART_TOOLTIP_STYLE}
              formatter={(value, _name, props) => [
                `${value}% (${props.payload.correctCount}/${props.payload.totalAnswers})`,
                'Accuracy',
              ]}
              labelFormatter={(label, payload) => {
                const right = payload?.[0]?.payload?.correctRight
                return right ? `${label} → ${right}` : label
              }}
            />
            <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={48}>
              {chartData.map((entry, idx) => (
                <Cell key={entry.name} fill={getChartColor(entry.name, idx, 'match')} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
