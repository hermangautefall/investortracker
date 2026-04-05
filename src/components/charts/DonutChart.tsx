'use client'

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const COLORS = [
  '#8b5cf6', '#a78bfa', '#7c3aed', '#c4b5fd',
  '#6d28d9', '#ddd6fe', '#5b21b6', '#ede9fe',
  '#4c1d95', '#f5f3ff',
]
const OTHERS_COLOR = '#374151'

export type DonutSlice = {
  name: string
  ticker: string | null
  value: number
}

export function DonutChart({ data }: { data: DonutSlice[] }) {
  if (data.length === 0) return null

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={65}
          outerRadius={105}
          dataKey="value"
          paddingAngle={1}
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.name === 'Others' ? OTHERS_COLOR : COLORS[index % COLORS.length]}
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => [`${value.toFixed(1)}%`, '']}
          contentStyle={{
            background: '#1a1d27',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
          itemStyle={{ color: 'rgba(255,255,255,0.7)' }}
        />
        <Legend
          layout="vertical"
          align="right"
          verticalAlign="middle"
          iconType="circle"
          iconSize={7}
          formatter={(value) => (
            <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, lineHeight: '1.8' }}>
              {value}
            </span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
