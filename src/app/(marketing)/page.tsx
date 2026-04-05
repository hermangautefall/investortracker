import Link from 'next/link'
import { getAdminClient } from '@/lib/supabase-admin'
import { formatDate, formatValue } from '@/lib/formatters'
import { TradeBadge } from '@/components/badges/TradeBadge'
import { DataSourceSwitch } from '@/components/ui/DataSourceSwitch'
import type { Source } from '@/components/ui/DataSourceSwitch'

export const revalidate = 300

// ─── Types ────────────────────────────────────────────────────────────────────

type TradeRow = {
  ticker: string
  company_name: string | null
  insider_id: string | null
  trade_type: string | null
  total_value: number | null
  trade_date: string | null
}

type TopInsiderRow = {
  rank: number
  ticker: string
  company_name: string | null
  count: number
  buyBias: boolean
  sellBias: boolean
  close_price: number | null
}

type TopSuperRow = {
  rank: number
  ticker: string
  company_name: string | null
  count: number
  close_price: number | null
}

type TopCombinedRow = {
  rank: number
  ticker: string
  company_name: string | null
  count: number
  insider_count: number
  investor_count: number
  close_price: number | null
}

type RecentTrade = {
  id: string
  ticker: string | null
  trade_type: string | null
  total_value: number | null
  trade_date: string | null
  insiders: { id: string; name: string | null } | null
}

type TopSuperinvestor = {
  id: string
  name: string
  fund_name: string | null
  holdings_count: number
  total_aum_usd: number
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getStats() {
  const supabase = getAdminClient()
  const [it, ct, runs] = await Promise.all([
    supabase.from('insider_trades').select('id', { count: 'exact', head: true }),
    supabase.from('congress_trades').select('id', { count: 'exact', head: true }),
    supabase
      .from('pipeline_runs')
      .select('ran_at')
      .eq('job_name', 'fetch_form4')
      .eq('status', 'success')
      .order('ran_at', { ascending: false })
      .limit(1),
  ])
  return {
    insiderCount: it.count ?? 0,
    congressCount: ct.count ?? 0,
    lastUpdated: runs.data?.[0]?.ran_at ?? null,
  }
}

async function getTopInsiders(homeView: 'buys' | 'sells'): Promise<TopInsiderRow[]> {
  const supabase = getAdminClient()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 90)
  const cutoffStr = cutoff.toISOString().slice(0, 10)
  const tradeType = homeView === 'buys' ? 'buy' : 'sell'

  const { data: trades } = await supabase
    .from('insider_trades')
    .select('ticker, company_name, insider_id, trade_type, total_value, trade_date')
    .not('ticker', 'is', null)
    .neq('ticker', '')
    .eq('trade_type', tradeType)
    .gte('trade_date', cutoffStr)

  if (!trades) return []

  const map = new Map<string, { company_name: string | null; insiderIds: Set<string>; buys: number; sells: number }>()
  for (const row of trades as TradeRow[]) {
    const ticker = row.ticker
    if (!map.has(ticker)) map.set(ticker, { company_name: null, insiderIds: new Set(), buys: 0, sells: 0 })
    const e = map.get(ticker)!
    if (row.company_name) e.company_name = row.company_name
    if (row.insider_id) e.insiderIds.add(row.insider_id)
    const t = (row.trade_type ?? '').toLowerCase()
    if (t === 'buy') e.buys++
    else if (t === 'sell') e.sells++
  }

  const sorted = Array.from(map.entries())
    .sort((a, b) => b[1].insiderIds.size - a[1].insiderIds.size)
    .slice(0, 10)

  const tickers = sorted.map(([t]) => t)
  const priceMap = new Map<string, number>()
  if (tickers.length > 0) {
    const { data: prices } = await supabase
      .from('stock_prices')
      .select('ticker, close_price, date')
      .in('ticker', tickers)
      .order('date', { ascending: false })
    for (const p of prices ?? []) {
      if (!priceMap.has(p.ticker) && p.close_price != null) priceMap.set(p.ticker, p.close_price)
    }
  }

  return sorted.map(([ticker, v], i) => ({
    rank: i + 1,
    ticker,
    company_name: v.company_name,
    count: v.insiderIds.size,
    buyBias: v.buys > v.sells,
    sellBias: v.sells > v.buys,
    close_price: priceMap.get(ticker) ?? null,
  }))
}

async function getTopSuperinvestorStocks(): Promise<TopSuperRow[]> {
  const supabase = getAdminClient()
  const { data: qData } = await supabase
    .from('portfolio_holdings')
    .select('quarter')
    .not('ticker', 'is', null)
    .order('quarter', { ascending: false })
    .limit(1)
  const latestQ = qData?.[0]?.quarter ?? null
  if (!latestQ) return []

  const { data: holdings } = await supabase
    .from('portfolio_holdings')
    .select('ticker, company_name, investor_id')
    .eq('quarter', latestQ)
    .not('ticker', 'is', null)

  if (!holdings) return []

  const map = new Map<string, { company_name: string | null; investorIds: Set<string> }>()
  for (const h of holdings) {
    const ticker = h.ticker as string
    if (!map.has(ticker)) map.set(ticker, { company_name: null, investorIds: new Set() })
    const e = map.get(ticker)!
    if (h.company_name) e.company_name = h.company_name
    if (h.investor_id) e.investorIds.add(h.investor_id)
  }

  const sorted = Array.from(map.entries())
    .sort((a, b) => b[1].investorIds.size - a[1].investorIds.size)
    .slice(0, 10)

  const tickers = sorted.map(([t]) => t)
  const priceMap = new Map<string, number>()
  if (tickers.length > 0) {
    const { data: prices } = await supabase
      .from('stock_prices')
      .select('ticker, close_price, date')
      .in('ticker', tickers)
      .order('date', { ascending: false })
    for (const p of prices ?? []) {
      if (!priceMap.has(p.ticker) && p.close_price != null) priceMap.set(p.ticker, p.close_price)
    }
  }

  return sorted.map(([ticker, v], i) => ({
    rank: i + 1,
    ticker,
    company_name: v.company_name,
    count: v.investorIds.size,
    close_price: priceMap.get(ticker) ?? null,
  }))
}

async function getTopCombinedStocks(): Promise<TopCombinedRow[]> {
  const supabase = getAdminClient()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 90)
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  const { data: qData } = await supabase
    .from('portfolio_holdings')
    .select('quarter')
    .not('ticker', 'is', null)
    .order('quarter', { ascending: false })
    .limit(1)
  const latestQ = qData?.[0]?.quarter ?? null

  const [insiderRes, superRes] = await Promise.all([
    supabase
      .from('insider_trades')
      .select('ticker, insider_id, company_name')
      .not('ticker', 'is', null)
      .neq('ticker', '')
      .gte('trade_date', cutoffStr),
    latestQ
      ? supabase
          .from('portfolio_holdings')
          .select('ticker, company_name, investor_id')
          .eq('quarter', latestQ)
          .not('ticker', 'is', null)
      : Promise.resolve({ data: [] as { ticker: string | null; company_name: string | null; investor_id: string | null }[] }),
  ])

  const insiderMap = new Map<string, { company_name: string | null; ids: Set<string> }>()
  for (const row of insiderRes.data ?? []) {
    const ticker = row.ticker as string
    if (!insiderMap.has(ticker)) insiderMap.set(ticker, { company_name: null, ids: new Set() })
    const e = insiderMap.get(ticker)!
    if (row.company_name) e.company_name = row.company_name
    if (row.insider_id) e.ids.add(row.insider_id)
  }

  const superMap = new Map<string, { company_name: string | null; ids: Set<string> }>()
  for (const h of superRes.data ?? []) {
    const ticker = h.ticker as string
    if (!superMap.has(ticker)) superMap.set(ticker, { company_name: null, ids: new Set() })
    const e = superMap.get(ticker)!
    if (h.company_name) e.company_name = h.company_name
    if (h.investor_id) e.ids.add(h.investor_id)
  }

  const allTickersArr = Array.from(new Set([...Array.from(insiderMap.keys()), ...Array.from(superMap.keys())]))
  const merged: { ticker: string; company_name: string | null; insider_count: number; investor_count: number; total: number }[] = []

  for (const ticker of allTickersArr) {
    const insiderCount = insiderMap.get(ticker)?.ids.size ?? 0
    const investorCount = superMap.get(ticker)?.ids.size ?? 0
    merged.push({
      ticker,
      company_name: superMap.get(ticker)?.company_name ?? insiderMap.get(ticker)?.company_name ?? null,
      insider_count: insiderCount,
      investor_count: investorCount,
      total: insiderCount + investorCount,
    })
  }

  const sorted = merged.sort((a, b) => b.total - a.total).slice(0, 10)

  const tickers = sorted.map((r) => r.ticker)
  const priceMap = new Map<string, number>()
  if (tickers.length > 0) {
    const { data: prices } = await supabase
      .from('stock_prices')
      .select('ticker, close_price, date')
      .in('ticker', tickers)
      .order('date', { ascending: false })
    for (const p of prices ?? []) {
      if (!priceMap.has(p.ticker) && p.close_price != null) priceMap.set(p.ticker, p.close_price)
    }
  }

  return sorted.map((r, i) => ({
    rank: i + 1,
    ticker: r.ticker,
    company_name: r.company_name,
    count: r.total,
    insider_count: r.insider_count,
    investor_count: r.investor_count,
    close_price: priceMap.get(r.ticker) ?? null,
  }))
}

async function getTopSuperinvestors(): Promise<TopSuperinvestor[]> {
  const supabase = getAdminClient()
  const [investorsRes, holdingsRes] = await Promise.all([
    supabase.from('superinvestors').select('id, name, fund_name'),
    supabase.from('portfolio_holdings').select('investor_id, ticker, value_usd'),
  ])
  if (!investorsRes.data) return []

  const summaryMap = new Map<string, { tickers: Set<string>; aum: number }>()
  for (const h of holdingsRes.data ?? []) {
    if (!h.investor_id) continue
    if (!summaryMap.has(h.investor_id))
      summaryMap.set(h.investor_id, { tickers: new Set(), aum: 0 })
    const s = summaryMap.get(h.investor_id)!
    if (h.ticker) s.tickers.add(h.ticker)
    s.aum += h.value_usd ?? 0
  }

  return investorsRes.data
    .map((si) => {
      const s = summaryMap.get(si.id)
      return {
        id: si.id,
        name: si.name,
        fund_name: si.fund_name,
        holdings_count: s ? s.tickers.size : 0,
        total_aum_usd: s ? s.aum : 0,
      }
    })
    .filter((si) => si.total_aum_usd > 0)
    .sort((a, b) => b.total_aum_usd - a.total_aum_usd)
    .slice(0, 5)
}

async function getRecentTrades(): Promise<RecentTrade[]> {
  const supabase = getAdminClient()
  const { data } = await supabase
    .from('insider_trades')
    .select('id, ticker, trade_type, total_value, trade_date, insiders(id, name)')
    .order('trade_date', { ascending: false })
    .limit(5)
  return (data ?? []) as unknown as RecentTrade[]
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const rawView = typeof sp.home_view === 'string' ? sp.home_view : 'buys'
  const homeView: 'buys' | 'sells' = rawView === 'sells' ? 'sells' : 'buys'
  const rawSource = typeof sp.home_source === 'string' ? sp.home_source : 'all'
  const homeSource: Source = ['insiders', 'superinvestors', 'all'].includes(rawSource)
    ? (rawSource as Source)
    : 'all'

  const [stats, recentTrades, topSuperinvestors] = await Promise.all([
    getStats(),
    getRecentTrades(),
    getTopSuperinvestors(),
  ])

  // Fetch top stocks based on source
  const [topInsiders, topSuper, topCombined] = await Promise.all([
    homeSource === 'insiders' ? getTopInsiders(homeView) : Promise.resolve<TopInsiderRow[]>([]),
    homeSource === 'superinvestors' ? getTopSuperinvestorStocks() : Promise.resolve<TopSuperRow[]>([]),
    homeSource === 'all' ? getTopCombinedStocks() : Promise.resolve<TopCombinedRow[]>([]),
  ])

  const portfolioView = homeView === 'buys' ? 'qtr-buys' : 'qtr-sells'
  const grandPortfolioUrl =
    homeSource === 'insiders' ? `/grand-portfolio?source=insiders&view=${portfolioView}`
    : homeSource === 'superinvestors' ? '/grand-portfolio?source=superinvestors'
    : '/grand-portfolio'

  // Source switch URLs
  const sourceSwitchUrls = {
    insiders: `/?home_source=insiders&home_view=${homeView}`,
    superinvestors: '/?home_source=superinvestors',
    all: '/?home_source=all',
  }

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
      {/* Hero */}
      <div className="max-w-3xl mx-auto text-center mb-16">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-5">
          Track What Insiders Are Actually Trading
        </h1>
        <p className="text-lg text-white/60 mb-10 leading-relaxed">
          Real-time SEC Form 4 disclosures and congressional stock trades,
          organized and searchable.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/insiders"
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-white text-[#0f1117] font-semibold hover:bg-white/90 transition-colors"
          >
            Insider Trades →
          </Link>
          {/* HIDDEN: congress data pending FMP activation */}
          {/* <Link
            href="/politicians"
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg border border-white/20 text-white font-medium hover:bg-white/5 transition-colors"
          >
            Congressional Trades →
          </Link> */}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto mb-20">
        <div className="rounded-xl border border-white/8 bg-white/3 p-6 text-left">
          <p className="text-3xl font-bold text-white tabular-nums">
            {stats.insiderCount.toLocaleString('en-US')}
          </p>
          <p className="mt-1 text-sm text-white/50">insider trades tracked</p>
        </div>
        {/* HIDDEN: congress data pending FMP activation */}
        {/* <div className="rounded-xl border border-white/8 bg-white/3 p-6 text-left">
          <p className="text-3xl font-bold text-white/30 tabular-nums">
            {stats.congressCount.toLocaleString('en-US')}
          </p>
          <p className="mt-1 text-sm text-white/50">congressional trades (coming soon)</p>
        </div> */}
        <div className="rounded-xl border border-white/8 bg-white/3 p-6 text-left">
          <p className="text-sm font-medium text-white/40 uppercase tracking-wide mb-1">
            Last updated
          </p>
          <p className="text-lg font-semibold text-white">
            {stats.lastUpdated ? formatDate(stats.lastUpdated) : '—'}
          </p>
        </div>
      </div>

      {/* Two-column sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

        {/* Top Stocks — source-switchable */}
        <div>
          {/* Source switch */}
          <div className="flex items-center justify-between mb-3">
            <DataSourceSwitch value={homeSource} urls={sourceSwitchUrls} />
            <Link
              href={grandPortfolioUrl}
              className="text-xs text-white/40 hover:text-white/70 transition-colors"
            >
              View full →
            </Link>
          </div>

          {/* Buys/Sells tabs — insiders only */}
          {homeSource === 'insiders' && (
            <div className="flex items-center gap-1 rounded-md border border-white/10 bg-white/3 p-0.5 mb-3 w-fit">
              <Link
                href={`/?home_source=insiders&home_view=buys`}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  homeView === 'buys'
                    ? 'bg-green-500/20 text-green-400'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                Top Buys – Qtr
              </Link>
              <Link
                href={`/?home_source=insiders&home_view=sells`}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  homeView === 'sells'
                    ? 'bg-red-500/20 text-red-400'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                Top Sells – Qtr
              </Link>
            </div>
          )}

          {/* Insiders table */}
          {homeSource === 'insiders' && (
            topInsiders.length === 0 ? (
              <div className="rounded-lg border border-white/8 bg-white/3 p-8 text-center">
                <p className="text-sm text-white/30">No data for this period yet.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-white/8 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/8 bg-white/3">
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-white/40 w-8">#</th>
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-white/40">Symbol</th>
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-white/40 hidden sm:table-cell">Company</th>
                      <th className="px-3 py-2.5 text-right text-xs font-medium text-white/40">Insiders</th>
                      <th className="px-3 py-2.5 text-right text-xs font-medium text-white/40">Price</th>
                      <th className="px-3 py-2.5 text-center text-xs font-medium text-white/40 w-8">B/S</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {topInsiders.map((row) => (
                      <tr key={row.ticker} className="hover:bg-white/3 transition-colors">
                        <td className="px-3 py-2.5 text-white/30 text-xs">{row.rank}</td>
                        <td className="px-3 py-2.5">
                          <Link href={`/tickers/${row.ticker}`} className="font-mono font-bold text-white hover:text-white/70 transition-colors text-xs">
                            {row.ticker}
                          </Link>
                        </td>
                        <td className="px-3 py-2.5 text-white/50 text-xs truncate max-w-[140px] hidden sm:table-cell">{row.company_name ?? '–'}</td>
                        <td className="px-3 py-2.5 text-right">
                          <span className="font-bold text-white text-xs">{row.count}</span>
                        </td>
                        <td className="px-3 py-2.5 text-right text-white/50 font-mono text-xs">
                          {row.close_price != null ? `$${row.close_price.toFixed(2)}` : '–'}
                        </td>
                        <td className="px-3 py-2.5 text-center text-xs">
                          {homeView === 'sells' ? (
                            <span className="text-red-400">▼</span>
                          ) : row.buyBias ? (
                            <span className="text-green-400">▲</span>
                          ) : row.sellBias ? (
                            <span className="text-red-400">▼</span>
                          ) : (
                            <span className="text-white/30">–</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* Superinvestors table */}
          {homeSource === 'superinvestors' && (
            topSuper.length === 0 ? (
              <div className="rounded-lg border border-white/8 bg-white/3 p-8 text-center">
                <p className="text-sm text-white/30">No data yet.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-white/8 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/8 bg-white/3">
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-white/40 w-8">#</th>
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-white/40">Symbol</th>
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-white/40 hidden sm:table-cell">Company</th>
                      <th className="px-3 py-2.5 text-right text-xs font-medium text-white/40">Investors</th>
                      <th className="px-3 py-2.5 text-right text-xs font-medium text-white/40">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {topSuper.map((row) => (
                      <tr key={row.ticker} className="hover:bg-white/3 transition-colors">
                        <td className="px-3 py-2.5 text-white/30 text-xs">{row.rank}</td>
                        <td className="px-3 py-2.5">
                          <Link href={`/tickers/${row.ticker}`} className="font-mono font-bold text-white hover:text-white/70 transition-colors text-xs">
                            {row.ticker}
                          </Link>
                        </td>
                        <td className="px-3 py-2.5 text-white/50 text-xs truncate max-w-[140px] hidden sm:table-cell">{row.company_name ?? '–'}</td>
                        <td className="px-3 py-2.5 text-right">
                          <span className="font-bold text-white text-xs">{row.count}</span>
                        </td>
                        <td className="px-3 py-2.5 text-right text-white/50 font-mono text-xs">
                          {row.close_price != null ? `$${row.close_price.toFixed(2)}` : '–'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* Combined table */}
          {homeSource === 'all' && (
            topCombined.length === 0 ? (
              <div className="rounded-lg border border-white/8 bg-white/3 p-8 text-center">
                <p className="text-sm text-white/30">No data yet.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-white/8 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/8 bg-white/3">
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-white/40 w-8">#</th>
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-white/40">Symbol</th>
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-white/40 hidden sm:table-cell">Company</th>
                      <th className="px-3 py-2.5 text-right text-xs font-medium text-white/40">Holders</th>
                      <th className="px-3 py-2.5 text-right text-xs font-medium text-white/40">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {topCombined.map((row) => (
                      <tr key={row.ticker} className="hover:bg-white/3 transition-colors">
                        <td className="px-3 py-2.5 text-white/30 text-xs">{row.rank}</td>
                        <td className="px-3 py-2.5">
                          <Link href={`/tickers/${row.ticker}`} className="font-mono font-bold text-white hover:text-white/70 transition-colors text-xs">
                            {row.ticker}
                          </Link>
                        </td>
                        <td className="px-3 py-2.5 text-white/50 text-xs truncate max-w-[140px] hidden sm:table-cell">{row.company_name ?? '–'}</td>
                        <td className="px-3 py-2.5 text-right">
                          <span className="font-bold text-white text-xs">{row.count}</span>
                        </td>
                        <td className="px-3 py-2.5 text-right text-white/50 font-mono text-xs">
                          {row.close_price != null ? `$${row.close_price.toFixed(2)}` : '–'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>

        {/* Recent Trades */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">Recent Trades</h2>
            <Link
              href="/insiders"
              className="text-xs text-white/40 hover:text-white/70 transition-colors"
            >
              View all →
            </Link>
          </div>
          {recentTrades.length === 0 ? (
            <div className="rounded-lg border border-white/8 bg-white/3 p-8 text-center">
              <p className="text-sm text-white/30">No recent trades.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-white/8 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8 bg-white/3">
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-white/40">Date</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-white/40">Insider</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-white/40">Stock</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-white/40">Type</th>
                    <th className="px-3 py-2.5 text-right text-xs font-medium text-white/40">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {recentTrades.map((trade) => (
                    <tr key={trade.id} className="hover:bg-white/3 transition-colors">
                      <td className="px-3 py-2.5 text-white/50 text-xs whitespace-nowrap">
                        {formatDate(trade.trade_date)}
                      </td>
                      <td className="px-3 py-2.5 text-xs">
                        {trade.insiders ? (
                          <Link
                            href={`/insiders/${trade.insiders.id}`}
                            className="text-white hover:text-white/70 transition-colors truncate max-w-[100px] block"
                          >
                            {trade.insiders.name ?? '–'}
                          </Link>
                        ) : (
                          <span className="text-white/40">–</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <Link
                          href={`/tickers/${trade.ticker}`}
                          className="font-mono font-bold text-white hover:text-white/70 transition-colors text-xs"
                        >
                          {trade.ticker?.toUpperCase() ?? '–'}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5">
                        <TradeBadge type={trade.trade_type} />
                      </td>
                      <td className="px-3 py-2.5 text-right text-white font-medium tabular-nums text-xs">
                        {formatValue(trade.total_value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Superinvestors teaser */}
      {topSuperinvestors.length > 0 && (
        <div className="mt-16">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">Superinvestors</h2>
            <Link
              href="/superinvestors"
              className="text-xs text-white/40 hover:text-white/70 transition-colors"
            >
              View all →
            </Link>
          </div>
          <div className="rounded-xl border border-white/8 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8 bg-white/3">
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-white/40">Investor</th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium text-white/40">Holdings</th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium text-white/40">AUM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {topSuperinvestors.map((si) => (
                  <tr key={si.id} className="hover:bg-white/3 transition-colors">
                    <td className="px-3 py-2.5">
                      <Link
                        href={`/superinvestors/${si.id}`}
                        className="text-white hover:text-white/70 transition-colors text-xs font-medium"
                      >
                        {si.name}
                      </Link>
                      {si.fund_name && (
                        <p className="text-[10px] text-white/30 mt-0.5">{si.fund_name}</p>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right text-white text-xs tabular-nums">
                      {si.holdings_count}
                    </td>
                    <td className="px-3 py-2.5 text-right text-white font-medium tabular-nums text-xs">
                      {formatValue(si.total_aum_usd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  )
}
