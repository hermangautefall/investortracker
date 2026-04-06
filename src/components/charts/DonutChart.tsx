'use client'

import { useState } from 'react'
import { PieChart, Pie, Cell, Sector, ResponsiveContainer } from 'recharts'

const COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#ec4899', // pink
  '#f43f5e', // rose
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#3b82f6', // blue
]
const OTHERS_COLOR = '#94a3b8' // slate — always used for Others

export type DonutSlice = {
  name: string
  ticker: string | null
  value: number       // percentage
  rawValue?: number   // dollar value (optional, shown in center tooltip)
}

type ActiveShapeProps = {
  cx: number
  cy: number
  innerRadius: number
  outerRadius: number
  startAngle: number
  endAngle: number
  fill: string
}

function ExpandedSlice(props: ActiveShapeProps) {
  return (
    <Sector
      cx={props.cx}
      cy={props.cy}
      innerRadius={props.innerRadius}
      outerRadius={props.outerRadius + 8}
      startAngle={props.startAngle}
      endAngle={props.endAngle}
      fill={props.fill}
    />
  )
}

function getColor(index: number, name: string): string {
  return name === 'Others' ? OTHERS_COLOR : COLORS[index % COLORS.length]
}

function formatRawValue(v: number): string {
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M`
  return `$${v.toLocaleString('en-US')}`
}

export function DonutChart({ data }: { data: DonutSlice[] }) {
  const [activeIndex, setActiveIndex] = useState(-1)

  if (data.length === 0) return null

  const active = activeIndex >= 0 && activeIndex < data.length ? data[activeIndex] : null

  return (
    <div className="flex gap-3 items-center" style={{ minHeight: 240 }}>
      {/* Legend — left side */}
      <div className="flex flex-col gap-0.5 shrink-0" style={{ minWidth: 80, maxWidth: 100 }}>
        {data.map((entry, i) => {
          const color = getColor(i, entry.name)
          const isActive = activeIndex === i
          return (
            <div
              key={i}
              className="flex items-center gap-1.5 cursor-pointer px-1 py-0.5 rounded transition-colors hover:bg-white/5"
              onMouseEnter={() => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(-1)}
              onClick={() => setActiveIndex(isActive ? -1 : i)}
            >
              <span
                className="shrink-0 rounded-full"
                style={{ background: color, width: 6, height: 6 }}
              />
              <span
                className="text-[10px] leading-tight truncate transition-all duration-100"
                style={{
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
                  fontWeight: isActive ? 700 : 400,
                }}
              >
                {entry.ticker ?? entry.name}
              </span>
            </div>
          )
        })}
      </div>

      {/* Chart area */}
      <div className="relative flex-1" style={{ height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={95}
              dataKey="value"
              paddingAngle={1}
              startAngle={90}
              endAngle={-270}
              activeIndex={activeIndex >= 0 ? activeIndex : undefined}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              activeShape={ExpandedSlice as any}
              onMouseEnter={(_: unknown, index: number) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(-1)}
              onClick={(_: unknown, index: number) => setActiveIndex(activeIndex === index ? -1 : index)}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getColor(index, entry.name)}
                  style={{ cursor: 'pointer', outline: 'none' }}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center tooltip — shown when a slice is active */}
        {active && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center px-2">
              <p className="text-xs font-bold text-white leading-tight">
                {active.ticker ?? active.name}
              </p>
              {active.ticker && active.ticker !== active.name && (
                <p className="text-[10px] text-white/50 leading-tight mt-0.5 truncate max-w-[80px]">
                  {active.name}
                </p>
              )}
              <p className="text-[11px] text-violet-300 font-semibold mt-1">
                {active.value.toFixed(2)}%
              </p>
              {active.rawValue != null && (
                <p className="text-[10px] text-white/40">{formatRawValue(active.rawValue)}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
