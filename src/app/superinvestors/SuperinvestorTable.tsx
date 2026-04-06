'use client'

import { useState } from 'react'
import Link from 'next/link'

type SortKey = 'name' | 'total_aum_usd' | 'holdings_count' | 'latest_filing_date'
type SortDir = 'asc' | 'desc'

export type InvestorRow = {
  id: string
  name: string
  fund_name: string | null
  holdings_count: number
  total_aum_usd: number
  latest_quarter: string | null
  latest_filing_date: string | null
}

function formatValuePlus(v: number): string {
  if (!v || v <= 0) return '–'
  if (v >= 1_000_000_000) {
    const b = v / 1_000_000_000
    return `$${b >= 10 ? Math.round(b) : b.toFixed(1)}B+`
  }
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M+`
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K+`
  return `$${v.toLocaleString('en-US')}`
}

function formatFilingDate(dateStr: string | null): string {
  if (!dateStr) return '–'
  const d = new Date(dateStr.length === 10 ? `${dateStr}T12:00:00Z` : dateStr)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

export function SuperinvestorTable({ investors }: { investors: InvestorRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('latest_filing_date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'name' ? 'asc' : 'desc')
    }
  }

  const sorted = [...investors].sort((a, b) => {
    let cmp = 0
    if (sortKey === 'name') {
      cmp = a.name.localeCompare(b.name)
    } else if (sortKey === 'total_aum_usd') {
      cmp = (a.total_aum_usd ?? 0) - (b.total_aum_usd ?? 0)
    } else if (sortKey === 'holdings_count') {
      cmp = (a.holdings_count ?? 0) - (b.holdings_count ?? 0)
    } else if (sortKey === 'latest_filing_date') {
      const da = a.latest_filing_date ?? ''
      const db = b.latest_filing_date ?? ''
      cmp = da.localeCompare(db)
    }
    return sortDir === 'asc' ? cmp : -cmp
  })

  type ThProps = {
    col: SortKey
    label: string
    align?: 'left' | 'right'
    className?: string
  }

  function Th({ col, label, align = 'left', className = '' }: ThProps) {
    const active = sortKey === col
    const arrow = active ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ' ↕'
    return (
      <th
        className={`px-4 py-2.5 text-xs font-medium uppercase tracking-wide cursor-pointer select-none transition-colors
          ${align === 'right' ? 'text-right' : 'text-left'}
          ${active ? 'text-violet-400' : 'text-white/40 hover:text-violet-300'}
          ${className}`}
        onClick={() => handleSort(col)}
      >
        {label}
        <span className={active ? 'text-violet-400' : 'opacity-30'}>{arrow}</span>
      </th>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/8">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/8 bg-white/3">
            <Th col="name" label="Superinvestor" />
            <Th col="total_aum_usd" label="Portfolio" align="right" />
            <Th col="holdings_count" label="Stocks" align="right" className="hidden sm:table-cell" />
            <Th col="latest_filing_date" label="Last Updated" align="right" />
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {sorted.map((inv) => {
            const hasData = inv.holdings_count > 0 || inv.total_aum_usd > 0
            return (
              <tr key={inv.id} className="hover:bg-white/3 transition-colors">
                <td className="px-4 py-2.5">
                  {hasData ? (
                    <Link
                      href={`/superinvestors/${inv.id}`}
                      className="font-medium text-violet-400 hover:text-violet-300 transition-colors"
                    >
                      {inv.name}
                      {inv.fund_name && (
                        <span className="text-white/40 font-normal"> – {inv.fund_name}</span>
                      )}
                    </Link>
                  ) : (
                    <div>
                      <span className="font-medium text-white/40">
                        {inv.name}
                        {inv.fund_name && (
                          <span className="text-white/25 font-normal"> – {inv.fund_name}</span>
                        )}
                      </span>
                      <p className="text-[10px] text-white/25 mt-0.5">No filings found</p>
                    </div>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-white">
                  {inv.total_aum_usd > 0 ? formatValuePlus(inv.total_aum_usd) : '–'}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-white/60 hidden sm:table-cell">
                  {inv.holdings_count > 0 ? inv.holdings_count : '–'}
                </td>
                <td className="px-4 py-2.5 text-right text-white/40 text-xs whitespace-nowrap">
                  {formatFilingDate(inv.latest_filing_date)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
