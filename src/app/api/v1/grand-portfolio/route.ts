import { getAdminClient } from '@/lib/supabase-admin'
import { successResponse, errorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

const DEFAULT_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 100

const VALID_VIEWS = ['all', 'qtr-buys', '6m-buys', 'qtr-sells', '6m-sells'] as const
type ViewId = (typeof VALID_VIEWS)[number]

type TradeRow = {
  ticker: string
  company_name: string | null
  insider_id: string | null
  trade_type: string | null
  total_value: number | null
  trade_date: string | null
}

function getCutoffDate(days: number): string {
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const rawView = searchParams.get('view') ?? 'all'
  const view: ViewId = (VALID_VIEWS as readonly string[]).includes(rawView)
    ? (rawView as ViewId)
    : 'all'
  const minOwners = Math.max(1, parseInt(searchParams.get('min_owners') ?? '1', 10))
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const perPage = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(searchParams.get('per_page') ?? String(DEFAULT_PAGE_SIZE), 10))
  )

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
  if (error) return errorResponse(error.message, 500)

  // Aggregate in JS
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

  for (const row of (trades ?? []) as TradeRow[]) {
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
    if (row.insider_id) e.insiderIds.add(row.insider_id)
    e.total_trades++
    const t = (row.trade_type ?? '').toLowerCase()
    if (t === 'buy') { e.buy_count++; e.total_buy_volume += row.total_value ?? 0 }
    else if (t === 'sell') e.sell_count++
    if (row.trade_date && (!e.last_trade_date || row.trade_date > e.last_trade_date)) {
      e.last_trade_date = row.trade_date
    }
  }

  const results = Array.from(map.values())
    .map((e) => ({ ...e, ownership_count: e.insiderIds.size, insiderIds: undefined }))
    .filter((e) => e.ownership_count >= minOwners)
    .sort((a, b) =>
      b.ownership_count !== a.ownership_count
        ? b.ownership_count - a.ownership_count
        : b.total_trades - a.total_trades
    )

  const totalCount = results.length
  const from = (page - 1) * perPage
  const paginated = results.slice(from, from + perPage)

  // Fetch latest close_price for tickers on this page
  const pageTickers = paginated.map((r) => r.ticker)
  const priceMap = new Map<string, number | null>()
  if (pageTickers.length > 0) {
    const { data: prices } = await supabase
      .from('stock_prices')
      .select('ticker, close_price, date')
      .in('ticker', pageTickers)
      .order('date', { ascending: false })
    for (const p of prices ?? []) {
      if (!priceMap.has(p.ticker)) priceMap.set(p.ticker, p.close_price)
    }
  }

  const data = paginated.map((r) => ({
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

  return successResponse(data, {
    total: totalCount,
    page,
    per_page: perPage,
    last_updated: new Date().toISOString(),
  })
}
