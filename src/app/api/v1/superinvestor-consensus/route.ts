import { getAdminClient } from '@/lib/supabase-admin'
import { successResponse, errorResponse } from '@/lib/api-response'

export const revalidate = 300

const DEFAULT_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 100

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    const minInvestors = Math.max(1, parseInt(searchParams.get('min_investors') ?? '1', 10))
    const page    = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const perPage = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(searchParams.get('per_page') ?? String(DEFAULT_PAGE_SIZE), 10))
    )
    const from = (page - 1) * perPage
    const to   = from + perPage - 1

    const supabase = getAdminClient()

    const query = supabase
      .from('superinvestor_consensus')
      .select(
        'ticker, company_name, investor_count, total_value_usd, avg_weight, latest_quarter',
        { count: 'exact' }
      )
      .gte('investor_count', minInvestors)
      .order('investor_count', { ascending: false })
      .range(from, to)

    const { data, error, count } = await query
    if (error) return errorResponse(error.message, 500)

    const rows = data ?? []

    // Join latest close_price from stock_prices
    const tickers = rows.map((r) => r.ticker).filter((t): t is string => t != null)
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

    const enriched = rows.map((r) => ({
      ...r,
      close_price: r.ticker ? (priceMap.get(r.ticker) ?? null) : null,
    }))

    return successResponse(enriched, {
      total: count ?? 0,
      page,
      per_page: perPage,
      last_updated: new Date().toISOString(),
    })
  } catch (e) {
    console.error('Superinvestor consensus query failed:', e)
    return successResponse([], {
      total: 0,
      page: 1,
      per_page: DEFAULT_PAGE_SIZE,
      last_updated: new Date().toISOString(),
    })
  }
}
