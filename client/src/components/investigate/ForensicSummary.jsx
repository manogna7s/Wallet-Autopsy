import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatNumber } from '../../lib/format'

export function ForensicSummary({ summary }) {
  if (!summary) return null
  return (
    <section>
      <p className="wa-kicker">Forensic summary</p>
      <h2 className="wa-display mt-2 text-3xl">What the relationships show</h2>
      <div className="mt-8 grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <ul className="grid gap-6 sm:grid-cols-3">
          {summary.items.map((item) => (
            <li key={item.key} className="border-y border-line py-5">
              <p className="wa-display text-5xl tabular-nums">{formatNumber(item.value)}</p>
              <p className="mt-2 text-[13px] text-quiet">{item.label}</p>
            </li>
          ))}
        </ul>
        <div>
          <p className="wa-kicker mb-3">Visible graph mix</p>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.mix} barCategoryGap="28%">
                <XAxis dataKey="name" tick={{ fill: '#5b5853', fontSize: 11 }} axisLine={false} tickLine={false} />
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
                <Bar dataKey="count" fill="#6e9a94" maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  )
}
