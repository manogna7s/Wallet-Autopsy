import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export function ActivityChart({ data }) {
  return (
    <div className="h-36" role="img" aria-label="Monthly transaction counts in the fetched window">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barCategoryGap="28%">
          <XAxis dataKey="month" tick={{ fill: '#9a958a', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis hide />
          <Tooltip
            cursor={{ fill: '#101318' }}
            contentStyle={{
              background: '#0b0d10',
              border: '1px solid #232830',
              borderRadius: 0,
              fontSize: 12,
              color: '#ece8e0',
            }}
          />
          <Bar dataKey="txs" fill="#6d9a93" maxBarSize={18} isAnimationActive animationDuration={650} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
