import Link from 'next/link'
import { getAdminClient } from '@/lib/supabase-admin'
import { formatValue, formatDate } from '@/lib/formatters'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export const revalidate = 300

const PAGE_SIZE = 50

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

type TradeRow = {
  ticker: string
  company_name: string | null
  insider_id: string | null
  trade_type: string | null
  total_value: number | null
  trade_date: string | null
}

async function getPortfolioData(minOwners: number, page: number) {
  const supabase = getAdminClient()

  const { data: trades, error } = await supabase
    .from('insider_trades')
    .select('ticker, company_name, insider_id, trade_type, total_value, trade_date')
    .not('ticker', 'is', null)
    .neq('ticker', '')

  if (error || !trades) return { rows: [], total: 0, totalInsiders: 0, totalTickers: 0, error }

  // Aggregate
  const map = new Map<
    string,
    {
      ticker: string
      company_name: string | null
      insiderIds: Set<string>
      total_trades: number
      buy_count: number
      sell_count: number
      last_trade_date: string | null
      total_buy_volume: number
    }
  >()

  const allInsiders = new Set<string>()

  for (const row of trades as TradeRow[]) {
    const ticker = row.ticker
    if (!map.has(ticker)) {
      map.set(ticker, {
        ticker,
        company_name: null,
        insiderIds: new Set(),
        total_trades: 0,
        buy_count: 0,
        sell_count: 0,
        last_trade_date: null,
        total_buy_volume: 0,
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

  const sorted = Array.from(map.values())
    .map((e) => ({ ...e, ownership_count: e.insiderIds.size }))
    .filter((e) => e.ownership_count >= minOwners)
    .sort((a, b) =>
      b.ownership_count !== a.ownership_count
        ? b.ownership_count - a.ownership_count
        : b.total_trades - a.total_trades
    )

  const total = sorted.length
  const from = (page - 1) * PAGE_SIZE
  const paginated = sorted.slice(from, from + PAGE_SIZE)

  // Fetch prices for this page
  const tickers = paginated.map((r) => r.ticker)
  const priceMap = new Map<string, number | null>()
  if (tickers.length > 0) {
    const { data: prices } = await supabase
      .from('stock_prices')
      .select('ticker, close_price, date')
      .in('ticker', tickers)
      .order('date', { ascending: false })
    for (const p of prices ?? []) {
      if (!priceMap.has(p.ticker)) priceMap.set(p.ticker, p.close_price)
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

const MIN_OWNER_OPTIONS = [
  { value: '1', label: 'Min. 1 insider' },
  { value: '2', label: '2+ insiders' },
  { value: '3', label: '3+ insiders' },
  { value: '5', label: '5+ insiders' },
  { value: '10', label: '10+ insiders' },
]

export default async function GrandPortfolioPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const minOwners = Math.max(1, parseInt(typeof sp.min_owners === 'string' ? sp.min_owners : '1', 10))
  const page = Math.max(1, parseInt(typeof sp.page === 'string' ? sp.page : '1', 10))

  const { rows, total, totalInsiders, totalTickers, error } = await getPortfolioData(minOwners, page)
  const totalPages = Math.ceil(total / PAGE_SIZE)

  function pageUrl(p: number) {
    const params = new URLSearchParams()
    if (minOwners > 1) params.set('min_owners', String(minOwners))
    if (p > 1) params.set('page', String(p))
    const qs = params.toString()
    return `/grand-portfolio${qs ? `?${qs}` : ''}`
  }

  const globalRankOffset = (page - 1) * PAGE_SIZE

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Grand Portfolio</h1>
        <p className="mt-1 text-sm text-white/40">
          Stocks most widely held by tracked insiders
        </p>
      </div>

      {/* Filter bar + stats */}
      <div className="mb-6 flex flex-wrap items-center gap-4 justify-between">
        <form method="GET" action="/grand-portfolio" className="flex items-center gap-2">
          <select
            name="min_owners"
            defaultValue={String(minOwners)}
            className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/80 focus:outline-none focus:ring-1 focus:ring-white/20 hover:border-white/20 transition-colors cursor-pointer"
          >
            {MIN_OWNER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="px-3 py-1.5 rounded-md border border-white/10 bg-white/5 text-sm text-white/60 hover:text-white hover:border-white/20 transition-colors"
          >
            Go
          </button>
        </form>

        <div className="flex items-center gap-4 text-xs text-white/40">
          <span>
            <span className="text-white/70 font-medium">{totalTickers.toLocaleString('en-US')}</span> stocks
          </span>
          <span className="text-white/20">|</span>
          <span>
            <span className="text-white/70 font-medium">{totalInsiders.toLocaleString('en-US')}</span> insiders tracked
          </span>
          {total !== totalTickers && (
            <>
              <span className="text-white/20">|</span>
              <span>
                <span className="text-white/70 font-medium">{total.toLocaleString('en-US')}</span> matching filter
              </span>
            </>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
          Unable to load data. Please refresh the page.
        </div>
      )}

      {/* Empty */}
      {!error && rows.length === 0 && (
        <div className="rounded-lg border border-white/8 bg-white/3 p-16 text-center">
          <p className="text-white/40 text-sm">No stocks match the selected filter.</p>
        </div>
      )}

      {/* Table */}
      {!error && rows.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-xl border border-white/8">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8 bg-white/3">
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wide w-12">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wide">Symbol</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wide">Company</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white/40 uppercase tracking-wide">Owners</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white/40 uppercase tracking-wide">Trades</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white/40 uppercase tracking-wide">Price</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white/40 uppercase tracking-wide w-24">Bias</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white/40 uppercase tracking-wide hidden sm:table-cell">Last Trade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((row, i) => {
                  const rank = globalRankOffset + i + 1
                  const buyBias = row.buy_count > row.sell_count
                  const sellBias = row.sell_count > row.buy_count
                  return (
                    <tr key={row.ticker} className="hover:bg-white/3 transition-colors">
                      <td className="px-4 py-3 text-white/30 tabular-nums text-xs">{rank}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/tickers/${row.ticker}`}
                          className="font-mono font-bold text-white hover:text-white/70 transition-colors"
                        >
                          {row.ticker}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-white/60 max-w-[200px] truncate">
                        {row.company_name ?? '–'}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <span className="font-bold text-white">{row.ownership_count}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-white/60 tabular-nums">
                        {row.total_trades}
                      </td>
                      <td className="px-4 py-3 text-right text-white/60 tabular-nums font-mono">
                        {row.close_price != null ? `$${row.close_price.toFixed(2)}` : '–'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {buyBias ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-400">
                            ▲ <span className="hidden sm:inline">Buy bias</span>
                          </span>
                        ) : sellBias ? (
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-4">
              {page > 1 ? (
                <Link
                  href={pageUrl(page - 1)}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-md border border-white/10 text-sm text-white/60 hover:text-white hover:border-white/20 transition-colors"
                >
                  <ChevronLeft size={14} /> Previous
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1 px-4 py-2 rounded-md border border-white/5 text-sm text-white/20 cursor-not-allowed">
                  <ChevronLeft size={14} /> Previous
                </span>
              )}
              <span className="text-sm text-white/40">
                Page {page} of {totalPages}
              </span>
              {page < totalPages ? (
                <Link
                  href={pageUrl(page + 1)}
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
        </>
      )}
    </main>
  )
}
