'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { ActivityRow } from '@/lib/homepage-data'

type Props = {
  title: string
  opt1Labels: readonly [string, string]
  opt2Labels: readonly [string, string]
  // datasets[opt1_idx][opt2_idx] — e.g. datasets[0][0] = buys + first period
  datasets: readonly [
    readonly [ActivityRow[], ActivityRow[]],
    readonly [ActivityRow[], ActivityRow[]],
  ]
  countLabel: string
  isBuyFirst: boolean // whether opt1[0] is the "buy" direction (green)
  seeMoreHref: string
}

function formatCount(n: number, label: string): string {
  return `${n} ${label}`
}

export function ActivityCard({
  title,
  opt1Labels,
  opt2Labels,
  datasets,
  countLabel,
  isBuyFirst,
  seeMoreHref,
}: Props) {
  const [opt1, setOpt1] = useState<0 | 1>(0)
  const [opt2, setOpt2] = useState<0 | 1>(0)

  const rows = datasets[opt1][opt2]
  const isBuy = isBuyFirst ? opt1 === 0 : opt1 === 1

  return (
    <div className="card-glow rounded-xl bg-white/[0.03] flex flex-col overflow-hidden backdrop-blur-sm">
      {/* Card header */}
      <div className="px-4 pt-4 pb-3 border-b border-white/5">
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider">{title}</span>
          <Link href={seeMoreHref} className="text-[10px] text-violet-400/50 hover:text-violet-300 transition-colors whitespace-nowrap">
            see more →
          </Link>
        </div>

        {/* Toggle pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Opt 1: Buys / Sells */}
          <div className="flex gap-0.5 bg-white/5 rounded-md p-0.5">
            {([0, 1] as const).map((idx) => (
              <button
                key={idx}
                onClick={() => setOpt1(idx)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                  opt1 === idx ? 'bg-white/12 text-white' : 'text-white/40 hover:text-white/60'
                }`}
              >
                {opt1Labels[idx]}
              </button>
            ))}
          </div>
          {/* Opt 2: Period */}
          <div className="flex gap-0.5 bg-white/5 rounded-md p-0.5">
            {([0, 1] as const).map((idx) => (
              <button
                key={idx}
                onClick={() => setOpt2(idx)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                  opt2 === idx ? 'bg-white/12 text-white' : 'text-white/40 hover:text-white/60'
                }`}
              >
                {opt2Labels[idx]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1">
        {rows.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-white/25">No data for this period</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-4 py-2 text-left font-medium text-white/30">Ticker</th>
                <th className="px-4 py-2 text-left font-medium text-white/30 hidden sm:table-cell">Name</th>
                <th className="px-4 py-2 text-right font-medium text-white/30">{countLabel}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/4">
              {rows.map((row, i) => (
                <tr key={`${row.ticker}-${i}`} className="hover:bg-white/[0.04] transition-colors">
                  <td className="px-4 py-2">
                    <Link
                      href={`/tickers/${row.ticker}`}
                      className="font-mono font-bold text-white hover:text-white/70 transition-colors"
                    >
                      {row.ticker}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-white/40 truncate max-w-[120px] hidden sm:table-cell">
                    {row.company_name ?? '–'}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <span className={`font-semibold tabular-nums ${isBuy ? 'text-green-400' : 'text-red-400'}`}>
                      {row.count}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
