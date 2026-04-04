import { getAdminClient } from '@/lib/supabase-admin'
import { successResponse, errorResponse } from '@/lib/api-response'

export const revalidate = 60

const LOOKBACK_DAYS = 90

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker: rawTicker } = await params
  const ticker = rawTicker.toUpperCase()

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - LOOKBACK_DAYS)
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  const supabase = getAdminClient()

  const [summaryRes, congressRes, insiderRes] = await Promise.all([
    supabase
      .from('ticker_activity_summary')
      .select('*')
      .eq('ticker', ticker),

    supabase
      .from('congress_trades')
      .select(
        `id, ticker, company_name, trade_type, amount_min, amount_max,
         trade_date, disclosure_date, filing_url, source,
         politicians(id, full_name, party, state, chamber)`
      )
      .eq('ticker', ticker)
      .gte('trade_date', cutoffStr)
      .order('trade_date', { ascending: false }),

    supabase
      .from('insider_trades')
      .select(
        `id, ticker, company_name, trade_type, shares,
         price_per_share, total_value, trade_date, filing_date,
         form4_url, source,
         insiders(id, name, cik)`
      )
      .eq('ticker', ticker)
      .gte('trade_date', cutoffStr)
      .order('trade_date', { ascending: false }),
  ])

  if (summaryRes.error) return errorResponse(summaryRes.error.message, 500)
  if (congressRes.error) return errorResponse(congressRes.error.message, 500)
  if (insiderRes.error)  return errorResponse(insiderRes.error.message, 500)

  const summaryRows = summaryRes.data ?? []
  const congressRow = summaryRows.find((r) => r.data_type === 'congress') ?? null
  const insiderRow  = summaryRows.find((r) => r.data_type === 'insider')  ?? null

  const toSummary = (row: typeof congressRow) =>
    row
      ? {
          trade_count: row.trade_count,
          total_volume: row.total_volume,
          buy_count: row.buy_count,
          sell_count: row.sell_count,
          last_trade: row.last_trade,
        }
      : null

  const responseData = {
    ticker,
    summary: {
      congress: toSummary(congressRow),
      insider: toSummary(insiderRow),
    },
    congressional_trades: congressRes.data ?? [],
    insider_trades: insiderRes.data ?? [],
  }

  return successResponse(responseData, {
    total: (congressRes.data?.length ?? 0) + (insiderRes.data?.length ?? 0),
    page: 1,
    per_page: LOOKBACK_DAYS,
    last_updated: new Date().toISOString(),
  })
}
