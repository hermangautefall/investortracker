'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export type QuarterPoint = {
  displayQuarter: string
  value: number // in billions
}

export function PortfolioValueChart({ data }: { data: QuarterPoint[] }) {
  if (data.length === 0) return null

  const maxVal = Math.max(...data.map((d) => d.value))
  const useMillions = maxVal < 1

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 4 }}>
        <defs>
          <linearGradient id="portfolioFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis
          dataKey="displayQuarter"
          tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) =>
            useMillions ? `$${(v * 1000).toFixed(0)}M` : `$${v.toFixed(1)}B`
          }
          width={58}
        />
        <Tooltip
          formatter={(value: number) => [
            useMillions ? `$${(value * 1000).toFixed(0)}M` : `$${value.toFixed(2)}B`,
            'Portfolio Value',
          ]}
          contentStyle={{
            background: '#1a1d27',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
          itemStyle={{ color: '#a78bfa' }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="#8b5cf6"
          strokeWidth={2}
          fill="url(#portfolioFill)"
          dot={false}
          activeDot={{ r: 4, fill: '#8b5cf6' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
