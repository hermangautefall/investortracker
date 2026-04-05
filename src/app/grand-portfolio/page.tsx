import Link from 'next/link'
import { getAdminClient } from '@/lib/supabase-admin'
import { formatDate, formatValue } from '@/lib/formatters'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DataSourceSwitch } from '@/components/ui/DataSourceSwitch'
import type { Source } from '@/components/ui/DataSourceSwitch'

export const revalidate = 300

const PAGE_SIZE = 50

// ─── View config (insiders only) ─────────────────────────────────────────────

const VALID_VIEWS = ['all', 'qtr-buys', '6m-buys', 'qtr-sells', '6m-sells'] as const
type ViewId = (typeof VALID_VIEWS)[number]

const VIEW_META: Record<ViewId, { label: string; period: string | null; isSell: boolean }> = {
  'all':       { label: 'All Holdings', period: null,             isSell: false },
  'qtr-buys':  { label: 'Qtr Buys',    period: 'Last 90 days',  isSell: false },
  '6m-buys':   { label: '6M Buys',     period: 'Last 180 days', isSell: false },
  'qtr-sells': { label: 'Qtr Sells',   period: 'Last 90 days',  isSell: true  },
  '6m-sells':  { label: '6M Sells',    period: 'Last 180 days', isSell: true  },
}

// ─── Types ────────────────────────────────────────────────────────────────────

type PortfolioRow = {
  ticker: string
  company_name: string | null
  ownership_count: number
  total_trades: number
  buy_count: number
  sell_count: number
  last_trade_date: string | null
  total_buy_volume: number
  close_price: number | null
}

type SuperRow = {
  ticker: string
  company_name: string | null
  investor_count: number
  total_value: number
  latest_quarter: string | null
  close_price: number | null
}

type CombinedRow = {
  ticker: string
  company_name: string | null
  holder_count: number
  insider_count: number
  investor_count: number
  close_price: number | null
}

type TradeRow = {
  ticker: string
  company_name: string | null
  insider_id: string | null
  trade_type: string | null
  total_value: number | null
  trade_date: string | null
}

// ─── Data fetching ────────────────────────────────────────────────────────────

function getCutoffDate(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

function viewFilter(view: ViewId): { tradeType?: string; cutoffDays?: number } {
  switch (view) {
    case 'qtr-buys':  return { tradeType: 'buy',  cutoffDays: 90 }
    case '6m-buys':   return { tradeType: 'buy',  cutoffDays: 180 }
    case 'qtr-sells': return { tradeType: 'sell', cutoffDays: 90 }
    case '6m-sells':  return { tradeType: 'sell', cutoffDays: 180 }
    default:          return {}
  }
}

async function getInsiderData(view: ViewId, minOwners: number, page: number) {
  const supabase = getAdminClient()
  const filter = viewFilter(view)

  let query = supabase
    .from('insider_trades')
    .select('ticker, company_name, insider_id, trade_type, total_value, trade_date')
    .not('ticker', 'is', null)
    .neq('ticker', '')

  if (filter.tradeType) query = query.eq('trade_type', filter.tradeType)
  if (filter.cutoffDays) query = query.gte('trade_date', getCutoffDate(filter.cutoffDays))

  const { data: trades, error } = await query
  if (error || !trades) return { rows: [], total: 0, totalInsiders: 0, totalTickers: 0, error }

  const map = new Map<string, {
    company_name: string | null
    insiderIds: Set<string>
    total_trades: number
    buy_count: number
    sell_count: number
    last_trade_date: string | null
    total_buy_volume: number
  }>()
  const allInsiders = new Set<string>()

  for (const row of trades as TradeRow[]) {
    const ticker = row.ticker
    if (!map.has(ticker)) {
      map.set(ticker, {
        company_name: null, insiderIds: new Set(),
        total_trades: 0, buy_count: 0, sell_count: 0,
        last_trade_date: null, total_buy_volume: 0,
      })
    }
    const e = map.get(ticker)!
    if (row.company_name) e.company_name = row.company_name
    if (row.insider_id) { e.insiderIds.add(row.insider_id); allInsiders.add(row.insider_id) }
    e.total_trades++
    const t = (row.trade_type ?? '').toLowerCase()
    if (t === 'buy') { e.buy_count++; e.total_buy_volume += row.total_value ?? 0 }
    else if (t === 'sell') e.sell_count++
    if (row.trade_date && (!e.last_trade_date || row.trade_date > e.last_trade_date)) {
      e.last_trade_date = row.trade_date
    }
  }

  const totalTickers = map.size
  const totalInsiders = allInsiders.size

  const sorted = Array.from(map.entries())
    .map(([ticker, e]) => ({ ticker, ...e, ownership_count: e.insiderIds.size }))
    .filter((e) => e.ownership_count >= minOwners)
    .sort((a, b) =>
      b.ownership_count !== a.ownership_count
        ? b.ownership_count - a.ownership_count
        : b.total_trades - a.total_trades
    )

  const total = sorted.length
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const tickers = paginated.map((r) => r.ticker)
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

  const rows: PortfolioRow[] = paginated.map((r) => ({
    ticker: r.ticker,
    company_name: r.company_name,
    ownership_count: r.ownership_count,
    total_trades: r.total_trades,
    buy_count: r.buy_count,
    sell_count: r.sell_count,
    last_trade_date: r.last_trade_date,
    total_buy_volume: r.total_buy_volume,
    close_price: priceMap.get(r.ticker) ?? null,
  }))

  return { rows, total, totalInsiders, totalTickers, error: null }
}

async function getSuperinvestorData(minOwners: number, page: number) {
  const supabase = getAdminClient()

  // Find latest quarter
  const { data: qData } = await supabase
    .from('portfolio_holdings')
    .select('quarter')
    .not('ticker', 'is', null)
    .order('quarter', { ascending: false })
    .limit(1)

  const latestQ = qData?.[0]?.quarter ?? null
  if (!latestQ) return { rows: [], total: 0, totalInvestors: 0, error: null }

  const { data: holdings, error } = await supabase
    .from('portfolio_holdings')
    .select('ticker, company_name, investor_id, value_usd, quarter')
    .eq('quarter', latestQ)
    .not('ticker', 'is', null)

  if (error || !holdings) return { rows: [], total: 0, totalInvestors: 0, error }

  const map = new Map<string, { company_name: string | null; investorIds: Set<string>; total_value: number }>()
  const allInvestors = new Set<string>()

  for (const h of holdings) {
    const ticker = h.ticker as string
    if (!map.has(ticker)) map.set(ticker, { company_name: null, investorIds: new Set(), total_value: 0 })
    const e = map.get(ticker)!
    if (h.company_name) e.company_name = h.company_name
    if (h.investor_id) { e.investorIds.add(h.investor_id); allInvestors.add(h.investor_id) }
    e.total_value += h.value_usd ?? 0
  }

  const totalInvestors = allInvestors.size

  const sorted = Array.from(map.entries())
    .map(([ticker, e]) => ({ ticker, ...e, investor_count: e.investorIds.size }))
    .filter((e) => e.investor_count >= minOwners)
    .sort((a, b) => b.investor_count - a.investor_count)

  const total = sorted.length
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const tickers = paginated.map((r) => r.ticker)
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

  const rows: SuperRow[] = paginated.map((r) => ({
    ticker: r.ticker,
    company_name: r.company_name,
    investor_count: r.investor_count,
    total_value: r.total_value,
    latest_quarter: latestQ,
    close_price: priceMap.get(r.ticker) ?? null,
  }))

  return { rows, total, totalInvestors, error: null }
}

async function getCombinedData(minOwners: number, page: number) {
  const supabase = getAdminClient()

  // Get latest quarter for superinvestors
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
      .select('ticker, insider_id')
      .not('ticker', 'is', null)
      .neq('ticker', ''),
    latestQ
      ? supabase
          .from('portfolio_holdings')
          .select('ticker, company_name, investor_id')
          .eq('quarter', latestQ)
          .not('ticker', 'is', null)
      : Promise.resolve({ data: [] as { ticker: string | null; company_name: string | null; investor_id: string | null }[], error: null }),
  ])

  const insiderMap = new Map<string, Set<string>>()
  for (const row of insiderRes.data ?? []) {
    const ticker = row.ticker as string
    if (!insiderMap.has(ticker)) insiderMap.set(ticker, new Set())
    if (row.insider_id) insiderMap.get(ticker)!.add(row.insider_id)
  }

  const superMap = new Map<string, { company_name: string | null; investorIds: Set<string> }>()
  for (const h of superRes.data ?? []) {
    const ticker = h.ticker as string
    if (!superMap.has(ticker)) superMap.set(ticker, { company_name: null, investorIds: new Set() })
    const e = superMap.get(ticker)!
    if (h.company_name) e.company_name = h.company_name
    if (h.investor_id) e.investorIds.add(h.investor_id)
  }

  // Merge
  const allTickersArr = Array.from(new Set([...Array.from(insiderMap.keys()), ...Array.from(superMap.keys())]))
  const merged: CombinedRow[] = []

  for (const ticker of allTickersArr) {
    const insiderCount = insiderMap.get(ticker)?.size ?? 0
    const investorCount = superMap.get(ticker)?.investorIds.size ?? 0
    const holderCount = insiderCount + investorCount
    merged.push({
      ticker,
      company_name: superMap.get(ticker)?.company_name ?? null,
      holder_count: holderCount,
      insider_count: insiderCount,
      investor_count: investorCount,
      close_price: null,
    })
  }

  const sorted = merged
    .filter((r) => r.holder_count >= minOwners)
    .sort((a, b) => b.holder_count - a.holder_count)

  const total = sorted.length
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const tickers = paginated.map((r) => r.ticker)
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

  for (const row of paginated) {
    row.close_price = priceMap.get(row.ticker) ?? null
  }

  return { rows: paginated, total, error: null }
}

// ─── Config ───────────────────────────────────────────────────────────────────

const MIN_OWNER_OPTIONS = [
  { value: '1', label: 'Min. 1 holder' },
  { value: '2', label: '2+ holders' },
  { value: '3', label: '3+ holders' },
  { value: '5', label: '5+ holders' },
  { value: '10', label: '10+ holders' },
]

const SOURCE_LABELS: Record<Source, string> = {
  insiders: 'Based on SEC Form 4 insider filings',
  superinvestors: 'Based on 13F quarterly filings',
  all: 'Combined insider and superinvestor data',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function GrandPortfolioPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const rawSource = typeof sp.source === 'string' ? sp.source : 'all'
  const source: Source = ['insiders', 'superinvestors', 'all'].includes(rawSource)
    ? (rawSource as Source)
    : 'all'

  const rawView = typeof sp.view === 'string' ? sp.view : 'all'
  const view: ViewId = (VALID_VIEWS as readonly string[]).includes(rawView)
    ? (rawView as ViewId)
    : 'all'
  const minOwners = Math.max(1, parseInt(typeof sp.min_owners === 'string' ? sp.min_owners : '1', 10))
  const page = Math.max(1, parseInt(typeof sp.page === 'string' ? sp.page : '1', 10))

  function buildUrl(overrides: { source?: Source; view?: string; min_owners?: string; page?: number }) {
    const params = new URLSearchParams()
    const s = overrides.source ?? source
    const v = overrides.view ?? view
    const mo = overrides.min_owners ?? (minOwners > 1 ? String(minOwners) : undefined)
    const pg = overrides.page ?? 1
    if (s !== 'all') params.set('source', s)
    // view tabs only apply to insiders
    if (s === 'insiders' && v !== 'all') params.set('view', v)
    if (mo && mo !== '1') params.set('min_owners', mo)
    if (pg > 1) params.set('page', String(pg))
    const qs = params.toString()
    return `/grand-portfolio${qs ? `?${qs}` : ''}`
  }

  const switchUrls = {
    insiders: buildUrl({ source: 'insiders', page: 1 }),
    superinvestors: buildUrl({ source: 'superinvestors', page: 1 }),
    all: buildUrl({ source: 'all', page: 1 }),
  }

  // Only insiders view shows the view tabs
  const activeView = source === 'insiders' ? view : 'all'
  const meta = VIEW_META[activeView]

  // Fetch data based on source
  let insiderData: Awaited<ReturnType<typeof getInsiderData>> | null = null
  let superData: Awaited<ReturnType<typeof getSuperinvestorData>> | null = null
  let combinedData: Awaited<ReturnType<typeof getCombinedData>> | null = null

  if (source === 'insiders') {
    insiderData = await getInsiderData(view, minOwners, page)
  } else if (source === 'superinvestors') {
    superData = await getSuperinvestorData(minOwners, page)
  } else {
    combinedData = await getCombinedData(minOwners, page)
  }

  const total =
    source === 'insiders' ? (insiderData?.total ?? 0)
    : source === 'superinvestors' ? (superData?.total ?? 0)
    : (combinedData?.total ?? 0)

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const globalRankOffset = (page - 1) * PAGE_SIZE
  const hasError = insiderData?.error || superData?.error || combinedData?.error

  const headerLabel =
    source === 'insiders' ? 'Insiders'
    : source === 'superinvestors' ? 'Investors'
    : 'Holders'

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Grand Portfolio</h1>
        <p className="mt-1 text-sm text-white/40">{SOURCE_LABELS[source]}</p>
      </div>

      {/* Data source switch */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <DataSourceSwitch value={source} urls={switchUrls} />
      </div>

      {/* View tabs — insiders only */}
      {source === 'insiders' && (
        <div className="mb-5 border-b border-white/8">
          <nav className="flex gap-0 -mb-px flex-wrap">
            {(VALID_VIEWS as readonly ViewId[]).map((v) => {
              const active = v === view
              return (
                <Link
                  key={v}
                  href={buildUrl({ view: v, page: 1 })}
                  className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    active
                      ? 'border-white text-white'
                      : 'border-transparent text-white/40 hover:text-white/70 hover:border-white/30'
                  }`}
                >
                  {VIEW_META[v].label}
                </Link>
              )
            })}
          </nav>
        </div>
      )}

      {/* Stats row + filter */}
      <div className="mb-6 flex flex-wrap items-center gap-4 justify-between">
        <div className="flex items-center gap-4 text-xs text-white/40">
          {source === 'insiders' && insiderData && (
            <>
              <span>
                <span className="text-white/70 font-medium">{insiderData.totalTickers.toLocaleString('en-US')}</span> stocks
              </span>
              <span className="text-white/20">|</span>
              <span>
                <span className="text-white/70 font-medium">{insiderData.totalInsiders.toLocaleString('en-US')}</span> insiders tracked
              </span>
              {meta.period && (
                <>
                  <span className="text-white/20">|</span>
                  <span>Period: <span className="text-white/70 font-medium">{meta.period}</span></span>
                </>
              )}
            </>
          )}
          {source === 'superinvestors' && superData && (
            <>
              <span>
                <span className="text-white/70 font-medium">{superData.total.toLocaleString('en-US')}</span> stocks
              </span>
              <span className="text-white/20">|</span>
              <span>
                <span className="text-white/70 font-medium">{superData.totalInvestors.toLocaleString('en-US')}</span> superinvestors
              </span>
            </>
          )}
          {source === 'all' && combinedData && (
            <span>
              <span className="text-white/70 font-medium">{combinedData.total.toLocaleString('en-US')}</span> stocks from combined sources
            </span>
          )}
        </div>

        {/* Min holders filter */}
        <form method="GET" action="/grand-portfolio" className="flex items-center gap-2">
          {source !== 'all' && <input type="hidden" name="source" value={source} />}
          {source === 'insiders' && view !== 'all' && <input type="hidden" name="view" value={view} />}
          <select
            name="min_owners"
            defaultValue={String(minOwners)}
            className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/80 focus:outline-none focus:ring-1 focus:ring-white/20 hover:border-white/20 transition-colors cursor-pointer"
          >
            {MIN_OWNER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            type="submit"
            className="px-3 py-1.5 rounded-md border border-white/10 bg-white/5 text-sm text-white/60 hover:text-white hover:border-white/20 transition-colors"
          >
            Go
          </button>
        </form>
      </div>

      {/* Error */}
      {hasError && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
          Unable to load data. Please refresh the page.
        </div>
      )}

      {/* Empty */}
      {!hasError && total === 0 && (
        <div className="rounded-lg border border-white/8 bg-white/3 p-16 text-center">
          <p className="text-white/40 text-sm">No stocks match the selected filter.</p>
        </div>
      )}

      {/* INSIDERS TABLE */}
      {source === 'insiders' && insiderData && insiderData.rows.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-xl border border-white/8">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8 bg-white/3">
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wide w-12">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wide">Symbol</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wide">Company</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white/40 uppercase tracking-wide">{headerLabel}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white/40 uppercase tracking-wide">Trades</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white/40 uppercase tracking-wide">Price</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white/40 uppercase tracking-wide w-24">
                    {meta.isSell ? 'Activity' : 'Bias'}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white/40 uppercase tracking-wide hidden sm:table-cell">
                    Last Trade
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {insiderData.rows.map((row, i) => {
                  const rank = globalRankOffset + i + 1
                  const showSellBias = meta.isSell || row.sell_count > row.buy_count
                  const showBuyBias = !meta.isSell && row.buy_count > row.sell_count
                  return (
                    <tr key={row.ticker} className="hover:bg-white/3 transition-colors">
                      <td className="px-4 py-3 text-white/30 tabular-nums text-xs">{rank}</td>
                      <td className="px-4 py-3">
                        <Link href={`/tickers/${row.ticker}`} className="font-mono font-bold text-white hover:text-white/70 transition-colors">
                          {row.ticker}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-white/60 max-w-[200px] truncate">{row.company_name ?? '–'}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <span className="font-bold text-white">{row.ownership_count}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-white/60 tabular-nums">{row.total_trades}</td>
                      <td className="px-4 py-3 text-right text-white/60 tabular-nums font-mono">
                        {row.close_price != null ? `$${row.close_price.toFixed(2)}` : '–'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {showBuyBias ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-400">
                            ▲ <span className="hidden sm:inline">Buy bias</span>
                          </span>
                        ) : showSellBias ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-400">
                            ▼ <span className="hidden sm:inline">Sell bias</span>
                          </span>
                        ) : (
                          <span className="text-white/30 text-xs">–</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-white/40 text-xs hidden sm:table-cell whitespace-nowrap">
                        {formatDate(row.last_trade_date)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* SUPERINVESTORS TABLE */}
      {source === 'superinvestors' && superData && superData.rows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-white/8">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 bg-white/3">
                <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wide w-12">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wide">Symbol</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wide">Company</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-white/40 uppercase tracking-wide">{headerLabel}</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-white/40 uppercase tracking-wide">Total Value</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-white/40 uppercase tracking-wide">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {superData.rows.map((row, i) => (
                <tr key={row.ticker} className="hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3 text-white/30 tabular-nums text-xs">{globalRankOffset + i + 1}</td>
                  <td className="px-4 py-3">
                    <Link href={`/tickers/${row.ticker}`} className="font-mono font-bold text-white hover:text-white/70 transition-colors">
                      {row.ticker}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-white/60 max-w-[200px] truncate">{row.company_name ?? '–'}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <span className="font-bold text-white">{row.investor_count}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-white/60 tabular-nums">
                    {formatValue(row.total_value)}
                  </td>
                  <td className="px-4 py-3 text-right text-white/60 tabular-nums font-mono">
                    {row.close_price != null ? `$${row.close_price.toFixed(2)}` : '–'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ALL / COMBINED TABLE */}
      {source === 'all' && combinedData && combinedData.rows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-white/8">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 bg-white/3">
                <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wide w-12">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wide">Symbol</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wide">Company</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-white/40 uppercase tracking-wide">{headerLabel}</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-white/40 uppercase tracking-wide hidden sm:table-cell">Insiders</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-white/40 uppercase tracking-wide hidden sm:table-cell">SI</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-white/40 uppercase tracking-wide">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {combinedData.rows.map((row, i) => (
                <tr key={row.ticker} className="hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3 text-white/30 tabular-nums text-xs">{globalRankOffset + i + 1}</td>
                  <td className="px-4 py-3">
                    <Link href={`/tickers/${row.ticker}`} className="font-mono font-bold text-white hover:text-white/70 transition-colors">
                      {row.ticker}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-white/60 max-w-[180px] truncate">{row.company_name ?? '–'}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <span className="font-bold text-white">{row.holder_count}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-white/40 tabular-nums text-xs hidden sm:table-cell">{row.insider_count}</td>
                  <td className="px-4 py-3 text-right text-white/40 tabular-nums text-xs hidden sm:table-cell">{row.investor_count}</td>
                  <td className="px-4 py-3 text-right text-white/60 tabular-nums font-mono">
                    {row.close_price != null ? `$${row.close_price.toFixed(2)}` : '–'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4">
          {page > 1 ? (
            <Link
              href={buildUrl({ page: page - 1 })}
              className="inline-flex items-center gap-1 px-4 py-2 rounded-md border border-white/10 text-sm text-white/60 hover:text-white hover:border-white/20 transition-colors"
            >
              <ChevronLeft size={14} /> Previous
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1 px-4 py-2 rounded-md border border-white/5 text-sm text-white/20 cursor-not-allowed">
              <ChevronLeft size={14} /> Previous
            </span>
          )}
          <span className="text-sm text-white/40">Page {page} of {totalPages}</span>
          {page < totalPages ? (
            <Link
              href={buildUrl({ page: page + 1 })}
              className="inline-flex items-center gap-1 px-4 py-2 rounded-md border border-white/10 text-sm text-white/60 hover:text-white hover:border-white/20 transition-colors"
            >
              Next <ChevronRight size={14} />
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1 px-4 py-2 rounded-md border border-white/5 text-sm text-white/20 cursor-not-allowed">
              Next <ChevronRight size={14} />
            </span>
          )}
        </div>
      )}
    </main>
  )
}
