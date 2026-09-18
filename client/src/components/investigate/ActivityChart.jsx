import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export function ActivityChart({ data }) {
  return (
    <div className="h-36">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barCategoryGap="28%">
          <XAxis dataKey="month" tick={{ fill: '#5b5853', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis hide />
          <Tooltip
            cursor={{ fill: '#101318' }}
            contentStyle={{
              background: '#0b0d10',
              border: '1px solid #1c2026',
              borderRadius: 0,
              fontSize: 12,
              color: '#e7e3db',
            }}
          />
          <Bar dataKey="txs" fill="#6e9a94" maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
