import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAdminClient } from '@/lib/supabase-admin'
import { formatValue, formatShares } from '@/lib/formatters'
import { ChevronLeft, ExternalLink } from 'lucide-react'
import { formatQuarter } from '../page'
import { DonutChart } from '@/components/charts/DonutChart'
import { PortfolioValueChart } from '@/components/charts/PortfolioValueChart'
import type { DonutSlice } from '@/components/charts/DonutChart'
import type { QuarterPoint } from '@/components/charts/PortfolioValueChart'

export const revalidate = 300

type Holding = {
  ticker: string | null
  company_name: string | null
  shares: number | null
  value_usd: number | null
  portfolio_weight: number | null
  quarter: string
}

type PrevEntry = {
  shares: number | null
  weight: number | null
  value: number | null
}

type ChangedHolding = Holding & {
  change: 'new' | 'sold' | 'increased' | 'decreased'
  changePct: number | null
  valueDelta: number
}

function getQuarterEndDate(quarter: string): string {
  const m = quarter.match(/^(\d{4})Q(\d)$/)
  if (!m) return ''
  const year = parseInt(m[1])
  const q = parseInt(m[2])
  const endMonth = q * 3
  const endDays = [0, 31, 30, 30, 31]
  const endDay = endDays[q]
  return `${year}-${String(endMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`
}

function compareQuarters(
  current: Holding[],
  previous: Holding[],
  mode: 'buys' | 'sells',
  prevValueMap: Map<string, number>
): ChangedHolding[] {
  const prevMap = new Map<string, { weight: number; shares: number | null }>()
  for (const h of previous) {
    if (h.ticker) prevMap.set(h.ticker, { weight: h.portfolio_weight ?? 0, shares: h.shares })
  }

  const result: ChangedHolding[] = []
  const currentTickers = new Set(current.map((h) => h.ticker).filter(Boolean) as string[])

  if (mode === 'buys') {
    for (const h of current) {
      if (!h.ticker) continue
      const prevEntry = prevMap.get(h.ticker)
      if (!prevEntry) {
        result.push({ ...h, change: 'new', changePct: null, valueDelta: h.value_usd ?? 0 })
      } else {
        const cur = h.portfolio_weight ?? 0
        const prev = prevEntry.weight
        if (cur > prev + 0.01) {
          const delta = (h.value_usd ?? 0) - (prevValueMap.get(h.ticker) ?? 0)
          result.push({ ...h, change: 'increased', changePct: Math.round((cur - prev) * 10) / 10, valueDelta: delta })
        }
      }
    }
  } else {
    for (const h of previous) {
      if (!h.ticker) continue
      if (!currentTickers.has(h.ticker)) {
        result.push({ ...h, change: 'sold', changePct: null, valueDelta: -(h.value_usd ?? 0) })
      }
    }
    for (const h of current) {
      if (!h.ticker) continue
      const prevEntry = prevMap.get(h.ticker)
      if (prevEntry) {
        const cur = h.portfolio_weight ?? 0
        const prev = prevEntry.weight
        if (cur < prev - 0.01) {
          const delta = (h.value_usd ?? 0) - (prevValueMap.get(h.ticker) ?? 0)
          result.push({ ...h, change: 'decreased', changePct: Math.round((prev - cur) * 10) / 10, valueDelta: delta })
        }
      }
    }
  }

  return result.sort((a, b) => Math.abs(b.valueDelta) - Math.abs(a.valueDelta))
}

function ChangeBadge({ change, pct }: { change: ChangedHolding['change']; pct: number | null }) {
  if (change === 'new')
    return (
      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-500/20 text-green-400">
        NEW
      </span>
    )
  if (change === 'sold')
    return (
      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400">
        SOLD
      </span>
    )
  if (change === 'increased')
    return (
      <span className="text-[11px] font-semibold text-green-400">▲ +{pct}%</span>
    )
  return <span className="text-[11px] font-semibold text-red-400">▼ -{pct}%</span>
}

function ActivityBadge({
  current,
  prev,
  isNew,
}: {
  current: number | null
  prev: number | null
  isNew: boolean
}) {
  if (isNew)
    return (
      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-500/20 text-green-400">
        NEW
      </span>
    )
  if (current == null || prev == null || prev === 0) return <span className="text-white/25">–</span>
  const pct = ((current - prev) / Math.abs(prev)) * 100
  if (Math.abs(pct) < 0.5) return <span className="text-white/25">–</span>
  return pct > 0 ? (
    <span className="text-[11px] font-semibold text-green-400">▲ +{pct.toFixed(1)}%</span>
  ) : (
    <span className="text-[11px] font-semibold text-red-400">▼ {pct.toFixed(1)}%</span>
  )
}

function WeightDelta({ current, prev, isNew }: { current: number | null; prev: number | null; isNew: boolean }) {
  if (isNew) {
    const w = current != null ? `+${current.toFixed(2)}%` : 'NEW'
    return <span className="text-[11px] text-green-400">{w}</span>
  }
  if (current == null || prev == null) return <span className="text-white/25">–</span>
  const diff = current - prev
  if (Math.abs(diff) < 0.005) return <span className="text-white/25">–</span>
  return diff > 0 ? (
    <span className="text-[11px] text-green-400">+{diff.toFixed(2)}%</span>
  ) : (
    <span className="text-[11px] text-red-400">{diff.toFixed(2)}%</span>
  )
}

function PriceChange({ reported, current }: { reported: number | null; current: number | null }) {
  if (current == null) return <span className="text-white/25">–</span>
  const price = `$${current.toFixed(2)}`
  if (reported == null || reported === 0)
    return <span className="tabular-nums text-xs text-white/60">{price}</span>
  const pct = ((current - reported) / reported) * 100
  const color = pct >= 0 ? 'text-green-400' : 'text-red-400'
  const arrow = pct >= 0 ? '▲' : '▼'
  return (
    <div className="text-right">
      <div className={`text-[11px] font-semibold ${color}`}>
        {arrow} {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
      </div>
      <div className="text-xs text-white/60 tabular-nums">{price}</div>
    </div>
  )
}

export default async function SuperInvestorProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = await params
  const sp = await searchParams
  const rawTab = typeof sp.tab === 'string' ? sp.tab : 'holdings'
  const tab: 'holdings' | 'buys' | 'sells' = ['buys', 'sells'].includes(rawTab)
    ? (rawTab as 'buys' | 'sells')
    : 'holdings'

  const supabase = getAdminClient()

  // Fetch investor + all holdings in parallel
  const [investorRes, allHoldingsRes] = await Promise.all([
    supabase.from('superinvestors').select('id, name, fund_name, cik').eq('id', id).maybeSingle(),
    supabase
      .from('portfolio_holdings')
      .select('ticker, company_name, shares, value_usd, portfolio_weight, quarter')
      .eq('investor_id', id),
  ])

  if (!investorRes.data) notFound()
  const investor = investorRes.data as { id: string; name: string; fund_name: string | null; cik: string | null }
  const allHoldings = (allHoldingsRes.data ?? []) as Holding[]

  // Derive quarters
  const quartersSet = new Set(allHoldings.map((h) => h.quarter).filter((q): q is string => q != null))
  const quarters = Array.from(quartersSet).sort().reverse()
  const latestQuarter = quarters[0] ?? null

  const rawQ = typeof sp.quarter === 'string' ? sp.quarter : null
  const selectedQuarter = rawQ && quartersSet.has(rawQ) ? rawQ : latestQuarter
  const prevQuarter = selectedQuarter ? quarters[quarters.indexOf(selectedQuarter) + 1] ?? null : null

  // Split current + previous quarter from allHoldings
  const currentHoldings = allHoldings
    .filter((h) => h.quarter === selectedQuarter && h.ticker != null)
    .sort((a, b) => (b.portfolio_weight ?? 0) - (a.portfolio_weight ?? 0))

  const prevHoldings = allHoldings
    .filter((h) => h.quarter === prevQuarter && h.ticker != null)

  // Portfolio value per quarter (chart data)
  const quarterTotals = new Map<string, number>()
  for (const h of allHoldings) {
    if (!h.quarter) continue
    quarterTotals.set(h.quarter, (quarterTotals.get(h.quarter) ?? 0) + (h.value_usd ?? 0))
  }
  const chartData: QuarterPoint[] = Array.from(quarterTotals.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([q, v]) => ({ displayQuarter: formatQuarter(q), value: v / 1_000_000_000 }))

  // Donut chart: top 10 + Others
  const top10 = currentHoldings.slice(0, 10)
  const othersWeight = currentHoldings.slice(10).reduce((s, h) => s + (h.portfolio_weight ?? 0), 0)
  const donutData: DonutSlice[] = [
    ...top10.map((h) => ({
      name: h.ticker ?? h.company_name ?? '?',
      ticker: h.ticker,
      value: Math.round((h.portfolio_weight ?? 0) * 10) / 10,
    })),
    ...(othersWeight > 0.05
      ? [{ name: 'Others', ticker: null, value: Math.round(othersWeight * 10) / 10 }]
      : []),
  ]

  // Stock prices
  const currentTickers = currentHoldings
    .map((h) => h.ticker)
    .filter((t): t is string => t != null)

  let reportedPriceMap = new Map<string, number>()
  let currentPriceMap = new Map<string, number>()

  if (currentTickers.length > 0 && selectedQuarter) {
    const quarterEndDate = getQuarterEndDate(selectedQuarter)
    const quarterStartDate = quarterEndDate.slice(0, 8) + '01'

    const today = new Date()
    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().slice(0, 10)

    const [reportedRes, currentRes] = await Promise.all([
      supabase
        .from('stock_prices')
        .select('ticker, close_price, date')
        .in('ticker', currentTickers)
        .lte('date', quarterEndDate)
        .gte('date', quarterStartDate)
        .order('date', { ascending: false }),
      supabase
        .from('stock_prices')
        .select('ticker, close_price, date')
        .in('ticker', currentTickers)
        .gte('date', thirtyDaysAgoStr)
        .order('date', { ascending: false }),
    ])

    for (const row of reportedRes.data ?? []) {
      if (!reportedPriceMap.has(row.ticker) && row.close_price != null)
        reportedPriceMap.set(row.ticker, row.close_price)
    }
    for (const row of currentRes.data ?? []) {
      if (!currentPriceMap.has(row.ticker) && row.close_price != null)
        currentPriceMap.set(row.ticker, row.close_price)
    }
  }

  // Previous quarter lookup map
  const prevMap = new Map<string, PrevEntry>()
  for (const h of prevHoldings) {
    if (h.ticker) prevMap.set(h.ticker, { shares: h.shares, weight: h.portfolio_weight, value: h.value_usd })
  }

  // Previous value map (for buy/sell sort)
  const prevValueMap = new Map<string, number>()
  for (const h of prevHoldings) {
    if (h.ticker) prevValueMap.set(h.ticker, h.value_usd ?? 0)
  }

  // Completely sold out: in prev quarter but absent from current
  const currentTickerSet = new Set(currentHoldings.map((h) => h.ticker).filter(Boolean))
  const soldOutHoldings = prevHoldings.filter((h) => h.ticker && !currentTickerSet.has(h.ticker))

  // Changed holdings for buys/sells tabs
  const changedHoldings =
    tab !== 'holdings'
      ? compareQuarters(currentHoldings, prevHoldings, tab as 'buys' | 'sells', prevValueMap)
      : []

  // AUM for selected quarter
  const selectedAum = currentHoldings.reduce((s, h) => s + (h.value_usd ?? 0), 0)

  const TABS = [
    { key: 'holdings', label: 'Holdings' },
    { key: 'buys', label: 'Qtr Buys' },
    { key: 'sells', label: 'Qtr Sells' },
  ]

  function tabUrl(t: string) {
    const p = new URLSearchParams()
    p.set('tab', t)
    if (selectedQuarter) p.set('quarter', selectedQuarter)
    return `/superinvestors/${id}?${p.toString()}`
  }

  function quarterUrl(q: string) {
    const p = new URLSearchParams()
    p.set('tab', tab)
    p.set('quarter', q)
    return `/superinvestors/${id}?${p.toString()}`
  }

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Back */}
      <Link
        href="/superinvestors"
        className="inline-flex items-center gap-1 text-sm text-white/40 hover:text-white/70 transition-colors mb-6"
      >
        <ChevronLeft size={14} /> Super Investors
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">{investor.name}</h1>
        <p className="mt-1 text-sm text-white/40 flex items-center gap-2 flex-wrap">
          {investor.fund_name && <span>{investor.fund_name}</span>}
          {investor.fund_name && investor.cik && <span className="text-white/20">·</span>}
          {investor.cik && <span>CIK {investor.cik}</span>}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="rounded-xl border border-white/8 bg-white/3 p-5">
          <p className="text-2xl font-bold text-white tabular-nums">{currentHoldings.length}</p>
          <p className="mt-1 text-xs text-white/40">Positions</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/3 p-5">
          <p className="text-2xl font-bold text-white tabular-nums">{formatValue(selectedAum)}</p>
          <p className="mt-1 text-xs text-white/40">Portfolio Value</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/3 p-5">
          <p className="text-2xl font-bold text-white tabular-nums">{quarters.length}</p>
          <p className="mt-1 text-xs text-white/40">Quarters tracked</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/3 p-5">
          <p className="text-2xl font-bold text-white tabular-nums">{formatQuarter(latestQuarter)}</p>
          <p className="mt-1 text-xs text-white/40">Latest filing</p>
        </div>
      </div>

      {/* Charts: Donut + Portfolio value line */}
      {currentHoldings.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-8">
          <div className="lg:col-span-3 rounded-xl border border-white/8 bg-white/3 p-4">
            <p className="text-xs font-medium text-white/40 uppercase tracking-wide mb-3">
              Portfolio Allocation — {formatQuarter(selectedQuarter)}
            </p>
            <DonutChart data={donutData} />
          </div>
          <div className="lg:col-span-2 rounded-xl border border-white/8 bg-white/3 p-4">
            <p className="text-xs font-medium text-white/40 uppercase tracking-wide mb-3">
              Portfolio Value Over Time
            </p>
            <PortfolioValueChart data={chartData} />
          </div>
        </div>
      )}

      {/* Tab strip + quarter picker */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-1 rounded-md border border-white/10 bg-white/3 p-0.5">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={tabUrl(t.key)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                tab === t.key ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>

        {quarters.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/30">Quarter:</span>
            <div className="flex items-center gap-1 flex-wrap">
              {quarters.map((q) => (
                <Link
                  key={q}
                  href={quarterUrl(q)}
                  className={`px-2.5 py-1 rounded text-xs transition-colors ${
                    q === selectedQuarter
                      ? 'bg-white/15 text-white font-medium'
                      : 'text-white/40 hover:text-white/60'
                  }`}
                >
                  {formatQuarter(q)}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Holdings tab */}
      {tab === 'holdings' && (
        <>
          {currentHoldings.length === 0 ? (
            <div className="rounded-lg border border-white/8 bg-white/3 p-12 text-center">
              <p className="text-white/40 text-sm">No holdings data for this quarter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/8">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8 bg-white/3">
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/40 w-8">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/40">Ticker</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/40 hidden md:table-cell">
                      Company
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-white/40">% Portfolio</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-white/40 hidden lg:table-cell">
                      Shares
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-white/40 hidden xl:table-cell">
                      Rep. Price
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-white/40 hidden xl:table-cell">
                      Cur. Price
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-white/40">Value</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-white/40 hidden sm:table-cell">
                      Activity
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-white/40 hidden sm:table-cell">
                      Port. Δ
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {currentHoldings.map((h, idx) => {
                    const prev = h.ticker ? prevMap.get(h.ticker) ?? null : null
                    const isNew = h.ticker ? !prevMap.has(h.ticker) : false
                    const reported = h.ticker ? reportedPriceMap.get(h.ticker) ?? null : null
                    const current = h.ticker ? currentPriceMap.get(h.ticker) ?? null : null
                    const maxWeight = currentHoldings[0]?.portfolio_weight ?? 1

                    return (
                      <tr key={`${h.ticker}-${idx}`} className="hover:bg-white/3 transition-colors group">
                        <td className="px-4 py-3 text-white/25 text-xs">{idx + 1}</td>
                        <td className="px-4 py-3">
                          {h.ticker ? (
                            <Link
                              href={`/tickers/${h.ticker}`}
                              className="inline-flex items-center gap-1 font-mono font-bold text-white hover:text-white/70 transition-colors"
                            >
                              {h.ticker}
                              <ExternalLink size={10} className="opacity-0 group-hover:opacity-40 transition-opacity" />
                            </Link>
                          ) : (
                            <span className="text-white/30">–</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-white/50 text-xs truncate max-w-[160px] hidden md:table-cell">
                          {h.company_name ?? '–'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="hidden sm:block w-16 h-1.5 rounded-full bg-white/5 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-violet-500/40"
                                style={{
                                  width: `${Math.round(((h.portfolio_weight ?? 0) / maxWeight) * 100)}%`,
                                }}
                              />
                            </div>
                            <span className="text-white tabular-nums text-xs font-medium">
                              {h.portfolio_weight != null ? `${h.portfolio_weight.toFixed(2)}%` : '–'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-white/50 tabular-nums text-xs hidden lg:table-cell">
                          {formatShares(h.shares)}
                        </td>
                        <td className="px-4 py-3 text-right text-white/50 tabular-nums text-xs hidden xl:table-cell">
                          {reported != null ? `$${reported.toFixed(2)}` : '–'}
                        </td>
                        <td className="px-4 py-3 hidden xl:table-cell">
                          <PriceChange reported={reported} current={current} />
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-white tabular-nums text-xs">
                          {h.value_usd != null
                            ? `$${Math.round(h.value_usd).toLocaleString('en-US')}`
                            : '–'}
                        </td>
                        <td className="px-4 py-3 text-right hidden sm:table-cell">
                          <ActivityBadge
                            current={h.shares}
                            prev={prev?.shares ?? null}
                            isNew={isNew}
                          />
                        </td>
                        <td className="px-4 py-3 text-right hidden sm:table-cell">
                          <WeightDelta
                            current={h.portfolio_weight}
                            prev={prev?.weight ?? null}
                            isNew={isNew}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Completely sold out */}
          {soldOutHoldings.length > 0 && (
            <div className="mt-8">
              <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">
                Completely Sold Out
              </h2>
              <div className="overflow-x-auto rounded-xl border border-red-500/20 bg-red-500/5">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-red-500/10">
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-white/30">Ticker</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-white/30 hidden sm:table-cell">
                        Company
                      </th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-white/30">
                        Last Value
                      </th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-white/30">
                        Last Weight
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-500/8">
                    {soldOutHoldings
                      .sort((a, b) => (b.value_usd ?? 0) - (a.value_usd ?? 0))
                      .map((h, idx) => (
                        <tr key={`sold-${h.ticker}-${idx}`} className="hover:bg-red-500/5 transition-colors">
                          <td className="px-4 py-2.5">
                            {h.ticker ? (
                              <div className="flex items-center gap-2">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/15 text-red-400">
                                  SOLD
                                </span>
                                <Link
                                  href={`/tickers/${h.ticker}`}
                                  className="font-mono font-bold text-white/60 hover:text-white/80 transition-colors text-xs"
                                >
                                  {h.ticker}
                                </Link>
                              </div>
                            ) : (
                              <span className="text-white/30">–</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-white/40 text-xs truncate max-w-[180px] hidden sm:table-cell">
                            {h.company_name ?? '–'}
                          </td>
                          <td className="px-4 py-2.5 text-right text-white/50 tabular-nums text-xs">
                            {h.value_usd != null
                              ? `$${Math.round(h.value_usd).toLocaleString('en-US')}`
                              : '–'}
                          </td>
                          <td className="px-4 py-2.5 text-right text-xs text-red-400/70">
                            {h.portfolio_weight != null ? `${h.portfolio_weight.toFixed(2)}%` : '–'}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Buys / Sells tabs */}
      {tab !== 'holdings' && (
        <>
          {changedHoldings.length === 0 ? (
            <div className="rounded-lg border border-white/8 bg-white/3 p-12 text-center">
              <p className="text-white/40 text-sm">
                {!prevQuarter
                  ? 'No previous quarter available for comparison.'
                  : tab === 'buys'
                  ? 'No new or increased positions this quarter.'
                  : 'No reduced or eliminated positions this quarter.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/8">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8 bg-white/3">
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/40 w-8">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/40">Ticker</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/40 hidden sm:table-cell">
                      Company
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-white/40">Weight</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-white/40 hidden md:table-cell">
                      Shares
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-white/40">Value</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/40 w-24">Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {changedHoldings.map((h, idx) => (
                    <tr key={`${h.ticker}-${idx}`} className="hover:bg-white/3 transition-colors group">
                      <td className="px-4 py-3 text-white/25 text-xs">{idx + 1}</td>
                      <td className="px-4 py-3">
                        {h.ticker ? (
                          <Link
                            href={`/tickers/${h.ticker}`}
                            className="inline-flex items-center gap-1 font-mono font-bold text-white hover:text-white/70 transition-colors"
                          >
                            {h.ticker}
                            <ExternalLink size={10} className="opacity-0 group-hover:opacity-40 transition-opacity" />
                          </Link>
                        ) : (
                          <span className="text-white/30">–</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-white/50 text-xs truncate max-w-[180px] hidden sm:table-cell">
                        {h.company_name ?? '–'}
                      </td>
                      <td className="px-4 py-3 text-right text-white tabular-nums text-xs font-medium">
                        {h.portfolio_weight != null ? `${h.portfolio_weight.toFixed(2)}%` : '–'}
                      </td>
                      <td className="px-4 py-3 text-right text-white/50 tabular-nums text-xs hidden md:table-cell">
                        {formatShares(h.shares)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-white tabular-nums text-xs">
                        {h.value_usd != null
                          ? `$${Math.round(h.value_usd).toLocaleString('en-US')}`
                          : '–'}
                      </td>
                      <td className="px-4 py-3">
                        <ChangeBadge change={h.change} pct={h.changePct} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </main>
  )
}
